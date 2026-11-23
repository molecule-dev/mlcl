/**
 * `mlcl check --stop-hook`: the check a harness runs when its agent stops. It hands type errors
 * back in that harness's format, stops asking after three failed rounds, skips a tree that already
 * passed, and the scaffold declares it for Claude Code, Codex and Cursor.
 */
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'

import { afterEach, describe, expect, it } from 'vitest'

import {
  parseStopHookInput,
  readHookInput,
  runRecordedCheck,
  runStopHook,
  STOP_HOOK_MAX_BLOCKS,
  stopHookOutput,
} from '../check-stop-hook.js'
import { stopHookFiles, writeStopHooks } from '../stop-hooks.js'

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})
const temp = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  dirs.push(dir)
  return dir
}

/**
 * An installed project whose typecheck fails while `src/a.ts` says "bad". Each typecheck run
 * appends a line to a log outside the project, so a run does not change the tree it checks.
 */
function project(): { root: string; runs: () => number } {
  const root = temp('mlcl-stop-hook-')
  const log = join(temp('mlcl-stop-hook-runs-'), 'runs.log')
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      private: true,
      scripts: { typecheck: 'node typecheck.cjs', lint: 'node -e 0' },
    }),
  )
  writeFileSync(
    join(root, 'typecheck.cjs'),
    [
      "const fs = require('fs')",
      `fs.appendFileSync(${JSON.stringify(log)}, 'run\\n')`,
      "if (fs.readFileSync('src/a.ts', 'utf8').includes('bad')) {",
      "  console.log(\"src/a.ts(1,7): error TS2322: Type 'string' is not assignable to type 'number'.\")",
      '  process.exit(2)',
      '}',
    ].join('\n'),
  )
  mkdirSync(join(root, 'src'))
  writeFileSync(join(root, 'src', 'a.ts'), "const a: number = 'bad'\n")
  mkdirSync(join(root, 'node_modules'))
  writeFileSync(join(root, '.gitignore'), 'node_modules\n')
  execFileSync('git', ['init', '-q', root])
  return {
    root,
    runs: () =>
      existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean).length : 0,
  }
}

const claudeStop = (continuing: boolean): string =>
  JSON.stringify({ session_id: 's1', hook_event_name: 'Stop', stop_hook_active: continuing })

describe('runStopHook', () => {
  it('hands the type errors back, at most three rounds in a row, and again after the agent stops on its own', async () => {
    const { root, runs } = project()
    const first = await runStopHook(root, 'claude', claudeStop(false))
    const answer = JSON.parse(first ?? '{}') as { decision?: string; reason?: string }
    expect(answer.decision).toBe('block')
    expect(answer.reason).toContain('TS2322')
    expect(answer.reason).toContain('src/a.ts')
    for (let round = 2; round <= STOP_HOOK_MAX_BLOCKS; round++) {
      expect(await runStopHook(root, 'claude', claudeStop(true))).not.toBeNull()
    }
    // The limit: the agent may stop, and the check does not run for nothing.
    expect(await runStopHook(root, 'claude', claudeStop(true))).toBeNull()
    expect(runs()).toBe(STOP_HOOK_MAX_BLOCKS)
    // The next prompt's stop starts a new run of rounds.
    expect(await runStopHook(root, 'claude', claudeStop(false))).not.toBeNull()
  })

  it('prints nothing on a pass, and skips the check until a file changes', async () => {
    const { root, runs } = project()
    writeFileSync(join(root, 'src', 'a.ts'), 'const a: number = 1\n')
    expect(await runStopHook(root, 'claude', claudeStop(false))).toBeNull()
    expect(await runStopHook(root, 'claude', claudeStop(false))).toBeNull()
    expect(runs()).toBe(1)
    writeFileSync(join(root, 'src', 'a.ts'), "const a: number = 'bad' // again\n")
    expect(await runStopHook(root, 'claude', claudeStop(false))).not.toBeNull()
    expect(runs()).toBe(2)
  })

  it('answers Cursor with a follow-up message, counting its rounds from loop_count', async () => {
    const { root } = project()
    const stop = (loopCount: number): string =>
      JSON.stringify({ conversation_id: 'c1', status: 'completed', loop_count: loopCount })
    const answer = JSON.parse((await runStopHook(root, 'cursor', stop(0))) ?? '{}') as {
      followup_message?: string
    }
    expect(answer.followup_message).toContain('TS2322')
    expect(parseStopHookInput(stop(2))).toEqual({ sessionId: 'c1', continuing: true })
  })

  it("skips the stop after the agent's own passing check of the same tree", async () => {
    const { root, runs } = project()
    writeFileSync(join(root, 'src', 'a.ts'), 'const a: number = 1\n')
    const own = await runRecordedCheck(root, {})
    expect('ok' in own && own.ok).toBe(true)
    expect(runs()).toBe(1)
    expect(await runStopHook(root, 'claude', claudeStop(false))).toBeNull()
    expect(runs()).toBe(1)
    // A file changed after the agent's check is checked at the stop.
    writeFileSync(join(root, 'src', 'a.ts'), "const a: number = 'bad'\n")
    expect(await runStopHook(root, 'claude', claudeStop(false))).not.toBeNull()
    expect(runs()).toBe(2)
  })

  it('still checks at the stop after an own check that skipped a hook step or failed', async () => {
    const { root, runs } = project()
    writeFileSync(join(root, 'src', 'a.ts'), 'const a: number = 1\n')
    // Lint alone does not cover the hook's typecheck.
    await runRecordedCheck(root, { steps: 'lint' })
    expect(runs()).toBe(0)
    expect(await runStopHook(root, 'claude', claudeStop(false))).toBeNull()
    expect(runs()).toBe(1)

    const failing = project()
    const own = await runRecordedCheck(failing.root, { steps: ['typecheck', 'lint'] })
    expect('ok' in own && own.ok).toBe(false)
    expect(await runStopHook(failing.root, 'claude', claudeStop(false))).not.toBeNull()
    expect(failing.runs()).toBe(2)
  })

  it('lets the agent stop before the dependencies are installed', async () => {
    const { root, runs } = project()
    rmSync(join(root, 'node_modules'), { recursive: true })
    expect(await runStopHook(root, 'codex', claudeStop(false))).toBeNull()
    expect(runs()).toBe(0)
  })
})

describe('the hook input', () => {
  it('reads what the harness wrote, and gives up on a stream that never closes', async () => {
    const closed = new PassThrough()
    closed.end('{"session_id":"s2"}')
    expect(await readHookInput(closed, 1_000)).toBe('{"session_id":"s2"}')
    const open = new PassThrough()
    open.write('{"partial"')
    expect(await readHookInput(open, 50)).toBe('{"partial"')
    expect(parseStopHookInput('not json')).toEqual({ sessionId: 'default', continuing: false })
  })

  it('formats a block for Claude Code and Codex', () => {
    expect(JSON.parse(stopHookOutput('codex', 'why'))).toEqual({ decision: 'block', reason: 'why' })
  })
})

describe('writeStopHooks', () => {
  it("declares the hook for each harness, Claude Code's through the .claude link", () => {
    const root = temp('mlcl-stop-hooks-')
    mkdirSync(join(root, '.agents'))
    symlinkSync('.agents', join(root, '.claude'), 'dir')
    expect(writeStopHooks(root).sort()).toEqual([
      '.agents/settings.json',
      '.codex/hooks.json',
      '.cursor/hooks.json',
    ])
    const claude = JSON.parse(readFileSync(join(root, '.claude', 'settings.json'), 'utf8'))
    // The bare spec the agent's own `npx mlcl` uses: npx keys its cache by the spec string, and
    // `mlcl@<version>` downloaded the whole CLI a second time inside the hook.
    expect(claude.hooks.Stop[0].hooks[0].command).toBe(
      'cd "$CLAUDE_PROJECT_DIR" && npx --yes mlcl check --stop-hook claude',
    )
    const codex = JSON.parse(readFileSync(join(root, '.codex', 'hooks.json'), 'utf8'))
    expect(codex.hooks.Stop[0].hooks[0].command).toMatch(
      / && npx --yes mlcl check --stop-hook codex$/,
    )
    const cursor = JSON.parse(readFileSync(join(root, '.cursor', 'hooks.json'), 'utf8'))
    expect(cursor.hooks.stop[0].command).toBe('npx --yes mlcl check --stop-hook cursor')
    expect(cursor).toMatchObject({
      version: 1,
      hooks: { stop: [{ loop_limit: STOP_HOOK_MAX_BLOCKS }] },
    })
  })

  it("keeps a file that exists, writes into the user's own .claude, and skips Claude Code with no .claude", () => {
    const own = temp('mlcl-stop-hooks-own-')
    mkdirSync(join(own, '.claude'))
    mkdirSync(join(own, '.cursor'))
    writeFileSync(join(own, '.cursor', 'hooks.json'), '{"mine":true}\n')
    expect(writeStopHooks(own).sort()).toEqual(['.claude/settings.json', '.codex/hooks.json'])
    expect(readFileSync(join(own, '.cursor', 'hooks.json'), 'utf8')).toBe('{"mine":true}\n')

    const bare = temp('mlcl-stop-hooks-bare-')
    expect(writeStopHooks(bare).sort()).toEqual(['.codex/hooks.json', '.cursor/hooks.json'])
  })

  it('names one hook file per harness', () => {
    expect(Object.keys(stopHookFiles('.agents')).sort()).toEqual([
      '.agents/settings.json',
      '.codex/hooks.json',
      '.cursor/hooks.json',
    ])
  })
})
