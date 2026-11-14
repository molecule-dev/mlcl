/**
 * `mlcl create --require-inject` (or `MLCL_REQUIRE_INJECT=1`) fails when a workspace's
 * integration code cannot be generated, instead of exiting 0 with an unwired project.
 *
 * On 2026-11-14 molecule.dev's production scaffold ran `mlcl create --skip-install` beside a fleet
 * install that lacked `@molecule/app-locales-lifecycle` at its pin. The injector refused the app
 * workspace, create printed "app injection skipped" and exited 0, and the generated
 * `app/src/bonds/index.ts` wired no provider — the failure surfaced only as the deploy's `tsc`.
 * A host that boots the project at once needs the refusal at scaffold time, naming the package.
 * Without the flag a `--skip-install` scaffold keeps its warn-and-continue contract (a local user
 * installs, then runs `mlcl inject`).
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

import Create, { injectFailureDetail } from '../create.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
/** The injector's refusal as execa throws it: the message is the child's whole output. */
const REFUSAL_STDOUT = [
  '◇  Injection complete',
  '◇  Validation passed',
  '',
  'Errors:',
  "  • @molecule/app-locales-lifecycle: No copy of @molecule/app-locales-lifecycle@1.1.0 is reachable from this project (found: no copy). Refusing to inject another version's schema — run 'npm install' so @molecule/app-locales-lifecycle@1.1.0 is the copy on disk, then re-run.",
  '└  Created 14 files, modified 67 files',
  '',
  'Next steps:',
  '  1. Run npm install to install new dependencies',
].join('\n')

/**
 * An execa failure of the inject child.
 *
 * @returns The error, with the fields execa sets.
 */
function refusal(): Error {
  return Object.assign(
    new Error(
      'Command failed with exit code 1: node bin/run.js inject --force --no-install -p proj/app\n\n' +
        REFUSAL_STDOUT,
    ),
    {
      shortMessage:
        'Command failed with exit code 1: node bin/run.js inject --force --no-install -p proj/app',
      exitCode: 1,
      stdout: REFUSAL_STDOUT,
      stderr: '',
    },
  )
}

describe('mlcl create — a host that needs the wiring now', () => {
  let dir: string
  let prevCwd: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-create-require-inject-'))
    prevCwd = process.cwd()
    process.chdir(dir)
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    process.chdir(prevCwd)
    await rm(dir, { recursive: true, force: true })
  })

  async function create(extra: string[]): Promise<{ outcome: unknown; output: string }> {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Create(
      [
        'proj',
        '--type',
        'full-stack',
        '--framework',
        'react',
        '--skip-install',
        '--no-interactive',
        ...extra,
      ],
      config,
    )
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    // The inject child, failing the way the injector's refusal does (its exit-1 execa error).
    vi.spyOn(cmd as unknown as { runInject: () => Promise<void> }, 'runInject').mockRejectedValue(
      refusal(),
    )
    const reported = vi.spyOn(cmd, 'error')
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const collected = (): string =>
      [
        ...reported.mock.calls.map((call) => String(call[0])),
        ...write.mock.calls.map((call) => String(call[0])),
      ].join('\n')
    try {
      await cmd.run()
      return { outcome: null, output: collected() }
    } catch (error) {
      return { outcome: error, output: collected() }
    } finally {
      reported.mockRestore()
      write.mockRestore()
    }
  }

  it('fails with the injector’s own refusal under --require-inject', async () => {
    const { outcome, output } = await create(['--require-inject'])
    expect(outcome).toBeInstanceOf(Error)
    expect(output).toContain('integration code could not be generated')
    expect(output).toContain(
      '@molecule/app-locales-lifecycle: No copy of @molecule/app-locales-lifecycle@1.1.0',
    )
    // The child's progress and closing advice are not the failure.
    expect(output).not.toContain('Injection complete')
    expect(output).not.toContain('Next steps')
  })

  it('reads the same requirement from MLCL_REQUIRE_INJECT=1', async () => {
    vi.stubEnv('MLCL_REQUIRE_INJECT', '1')
    const { outcome, output } = await create([])
    expect(outcome).toBeInstanceOf(Error)
    expect(output).toContain(
      '@molecule/app-locales-lifecycle: No copy of @molecule/app-locales-lifecycle@1.1.0',
    )
  })

  it('keeps warn-and-continue for a plain --skip-install scaffold', async () => {
    const { outcome, output } = await create([])
    expect(outcome).toBeNull()
    expect(output).not.toContain('integration code could not be generated')
  })
})

describe('injectFailureDetail', () => {
  it('returns the injector’s Errors: bullets, not its whole output', () => {
    expect(injectFailureDetail(refusal())).toBe(
      "@molecule/app-locales-lifecycle: No copy of @molecule/app-locales-lifecycle@1.1.0 is reachable from this project (found: no copy). Refusing to inject another version's schema — run 'npm install' so @molecule/app-locales-lifecycle@1.1.0 is the copy on disk, then re-run.",
    )
  })

  it('returns a fatal oclif Error: block from stderr, unwrapped', () => {
    const error = Object.assign(
      new Error('Command failed with exit code 2: node bin/run.js inject'),
      {
        stdout: '◇  Reading packages',
        stderr:
          ' ›   Error: Cannot read proj/app/package.json: ENOENT: no such\n ›   file or directory',
      },
    )
    expect(injectFailureDetail(error)).toBe(
      'Cannot read proj/app/package.json: ENOENT: no such file or directory',
    )
  })

  it('falls back to the error’s first line', () => {
    expect(injectFailureDetail(new Error('spawn node ENOENT\nmore'))).toBe('spawn node ENOENT')
    expect(injectFailureDetail('plain')).toBe('plain')
  })
})
