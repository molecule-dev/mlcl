/**
 * `mlcl create` ends with the setup commands the scaffold still needs, in the order they run.
 *
 * A `--skip-install` scaffold has no package on disk, so the injector refuses every workspace
 * ("No copy of @molecule/app-ui@… is reachable from this project") and `src/bonds/index.ts`
 * stays a stub. The closing "Next steps" used to go from `cd <name>` straight to `npm run dev`;
 * following them, a React, Vue, Solid, Svelte or Angular app scaffolded from npm failed its first
 * build with `Module './bonds/index.js' has no exported member 'authClient'` (2026-11-15, mlcl
 * 2.1.80). Running `npm install` and then this CLI's own `inject --force` makes the same project build.
 *
 * Runs the REAL oclif command against a temp directory; only the inject child is replaced, by one
 * that fails exactly as the injector's refusal does.
 *
 * @module
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Create, { pendingSetupSteps } from '../create.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

/**
 * An execa failure of the inject child, as the injector's "no installed copy" refusal throws it.
 *
 * @returns The error, with the fields execa sets.
 */
function refusal(): Error {
  const stdout = [
    'Errors:',
    "  • @molecule/app-ui: No copy of @molecule/app-ui@1.3.11 is reachable from this project (found: no copy). Refusing to inject another version's schema — run 'npm install' so @molecule/app-ui@1.3.11 is the copy on disk, then re-run.",
  ].join('\n')
  return Object.assign(new Error(`Command failed with exit code 1\n\n${stdout}`), {
    shortMessage: 'Command failed with exit code 1',
    exitCode: 1,
    stdout,
    stderr: '',
  })
}

describe('mlcl create — the next steps after an unfinished scaffold', () => {
  let dir: string
  let prevCwd: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-create-pending-setup-'))
    prevCwd = process.cwd()
    process.chdir(dir)
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    await rm(dir, { recursive: true, force: true })
  })

  /**
   * Runs `mlcl create` twice, with the inject child refusing or succeeding: once for the human
   * output (`proj`) and once under `--json` (`proj-json`), which prints only the result object.
   *
   * @param args - The type and framework flags.
   * @param inject - Whether the inject child refuses or succeeds.
   * @returns The printed lines, the --json result, and the version the CLI reports.
   */
  async function create(
    args: string[],
    inject: 'refuses' | 'succeeds',
  ): Promise<{ lines: string[]; json: Record<string, unknown>; version: string }> {
    const config = await Config.load(MLCL_ROOT)
    const run = async (name: string, extra: string[]): Promise<string[]> => {
      const cmd = new Create(
        [name, ...args, '--skip-install', '--no-interactive', ...extra],
        config,
      )
      vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
      const logged: string[] = []
      vi.spyOn(cmd, 'log').mockImplementation((message) => {
        logged.push(String(message ?? ''))
      })
      const runInject = vi.spyOn(cmd as unknown as { runInject: () => Promise<void> }, 'runInject')
      if (inject === 'refuses') runInject.mockRejectedValue(refusal())
      else runInject.mockResolvedValue(undefined)
      const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
      try {
        await cmd.run()
      } finally {
        write.mockRestore()
      }
      return logged
    }
    const lines = (await run('proj', []))
      .join('\n')
      .split('\n')
      .map((line) => line.trim())
    const printed = await run('proj-json', ['--json'])
    const jsonText = printed.find((text) => text.startsWith('{'))
    if (!jsonText) throw new Error(`create --json printed no result object:\n${printed.join('\n')}`)
    const json: unknown = JSON.parse(jsonText)
    if (typeof json !== 'object' || json === null)
      throw new Error('the --json result is not an object')
    return { lines, json: json as Record<string, unknown>, version: config.version }
  }

  /**
   * The lines after "Next steps:", up to the first blank line.
   *
   * @param lines - Every printed line, trimmed.
   * @returns The steps.
   */
  const nextSteps = (lines: string[]): string[] => {
    const start = lines.lastIndexOf('Next steps:')
    if (start < 0) throw new Error(`no "Next steps:" in:\n${lines.join('\n')}`)
    const rest = lines.slice(start + 1)
    const end = rest.indexOf('')
    return end < 0 ? rest : rest.slice(0, end)
  }

  it('an app whose inject was refused: install, inject with this CLI, then dev', async () => {
    const { lines, json, version } = await create(
      ['--type', 'app', '--framework', 'vue'],
      'refuses',
    )
    const steps = nextSteps(lines)
    expect(steps[0]).toBe('cd proj')
    expect(steps[1]).toBe('npm install')
    expect(steps[2]).toBe(`npx mlcl@${version} inject --force -p .`)
    expect(steps.at(-1)).toBe('npm run dev')
    expect(json.installSkipped).toBe(true)
    expect(json.injectSkipped).toEqual(['.'])
    expect(json.pendingSetup).toEqual(['npm install', `npx mlcl@${version} inject --force -p .`])
  })

  it('a full-stack project names each refused workspace', async () => {
    const { lines, json, version } = await create(
      ['--type', 'full-stack', '--framework', 'react'],
      'refuses',
    )
    const steps = nextSteps(lines)
    expect(steps.slice(0, 4)).toEqual([
      'cd proj',
      'npm install',
      `npx mlcl@${version} inject --force -p api`,
      `npx mlcl@${version} inject --force -p app`,
    ])
    expect(steps.at(-1)).toBe('npm run dev')
    expect(json.injectSkipped).toEqual(['api', 'app'])
  })

  it('an injected --skip-install scaffold still needs only npm install', async () => {
    const { lines, json } = await create(['--type', 'app', '--framework', 'react'], 'succeeds')
    const steps = nextSteps(lines)
    expect(steps.slice(0, 2)).toEqual(['cd proj', 'npm install'])
    expect(steps.some((step) => step.includes('inject'))).toBe(false)
    expect(json.injectSkipped).toEqual([])
    expect(json.pendingSetup).toEqual(['npm install'])
  })
})

describe('pendingSetupSteps', () => {
  it('lists nothing for a scaffold that installed and injected', () => {
    expect(
      pendingSetupSteps({ installNeeded: false, injectSkipped: [], cliVersion: '2.1.80' }),
    ).toEqual([])
  })

  it('names an inject even when the install ran, and pins the CLI version', () => {
    expect(
      pendingSetupSteps({ installNeeded: false, injectSkipped: ['app'], cliVersion: '9.9.9' }),
    ).toEqual(['npx mlcl@9.9.9 inject --force -p app'])
  })
})
