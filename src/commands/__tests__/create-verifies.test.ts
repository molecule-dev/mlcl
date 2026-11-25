/**
 * An installed `mlcl create` runs the new project's own check and says what passed.
 *
 * In the r18 scaffold eval (2026-11-24) Claude ran `mlcl check` after every scaffold before
 * changing anything (3.5-5.2 s plus a model turn), because the result did not say what create had
 * checked and its last line was "Before handing work back: npx mlcl check". Now the result carries
 * `verified`, a failing step's report, and a last line for after a change; `--no-verify` skips it.
 *
 * Runs the REAL oclif command with the install, inject, smoke tests and the check itself replaced:
 * what is under test is that create runs the check on the installed project and reports it.
 *
 * @module
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import type * as Execa from 'execa'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { runCheckLocal } from '../../lib/check.js'
import type * as CheckStopHook from '../../lib/check-stop-hook.js'
import type * as NpmInstall from '../../lib/npm-install.js'

const check = vi.hoisted(() => ({ result: null as unknown, calls: [] as string[] }))

vi.mock('../../lib/npm-install.js', async (importOriginal) => ({
  ...(await importOriginal<typeof NpmInstall>()),
  npmInstall: vi.fn(async () => undefined),
}))
vi.mock('execa', async (importOriginal) => ({
  ...(await importOriginal<typeof Execa>()),
  execa: vi.fn(async () => ({ stdout: 'Tests  2 passed (2)', stderr: '' })),
}))
vi.mock('../../lib/check-stop-hook.js', async (importOriginal) => ({
  ...(await importOriginal<typeof CheckStopHook>()),
  runRecordedCheck: vi.fn(async (root: string) => {
    check.calls.push(root)
    return check.result
  }),
}))

const { default: Create } = await import('../create.js')

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

type CheckResult = Awaited<ReturnType<typeof runCheckLocal>>

const step = (
  kind: 'typecheck' | 'lint' | 'build',
  name: string,
  status: 'passed' | 'failed',
): CheckResult['steps'][number] => ({
  kind,
  name,
  status,
  durationMs: 1,
  errors: status === 'failed' ? ['src/index.ts(3,1): error TS2304'] : [],
  errorTotal: status === 'failed' ? 1 : 0,
  logPath: '',
})

const PASSED: CheckResult = {
  ok: true,
  report: 'all passed',
  results: [
    step('typecheck', 'api', 'passed'),
    step('typecheck', 'app', 'passed'),
    step('lint', 'api', 'passed'),
    step('build', 'app', 'passed'),
  ],
}

const FAILED: CheckResult = {
  ok: false,
  report: 'typecheck app: failed\n  src/index.ts(3,1): error TS2304',
  results: [step('typecheck', 'api', 'passed'), step('typecheck', 'app', 'failed')],
}

let dir: string
let prevCwd: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-create-verifies-'))
  prevCwd = process.cwd()
  process.chdir(dir)
  check.calls = []
})

afterEach(async () => {
  process.chdir(prevCwd)
  vi.restoreAllMocks()
  await rm(dir, { recursive: true, force: true })
})

/** Run an installed create (install and inject replaced) and return its --json result. */
async function create(result: CheckResult, extra: string[] = []): Promise<Record<string, unknown>> {
  check.result = result
  const config = await Config.load(MLCL_ROOT)
  const cmd = new Create(
    [
      'proj',
      '--type',
      'full-stack',
      '--framework',
      'react',
      '--packages',
      '@molecule/api-resource-user,@molecule/api-database-sqlite,@molecule/app-auth',
      '--no-interactive',
      '--json',
      ...extra,
    ],
    config,
  )
  vi.spyOn(cmd as never, 'runInject').mockResolvedValue(undefined as never)
  vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
  vi.spyOn(cmd, 'logToStderr').mockImplementation(() => undefined)
  const out: string[] = []
  vi.spyOn(cmd, 'log').mockImplementation((line?: string) => void out.push(line ?? ''))
  await cmd.run()
  return JSON.parse(out.find((line) => line.trimStart().startsWith('{'))!)
}

describe('mlcl create checks the project it installed', () => {
  it('reports each step that passed, and says to run the check after a change', async () => {
    const json = await create(PASSED)
    expect(check.calls).toEqual([join(dir, 'proj')])
    expect(json.verified).toEqual({ typecheck: 'passed', lint: 'passed', build: 'passed' })
    expect(json.checkReport).toBeUndefined()
    expect((json.next as string[]).at(-1)).toBe('After you change code: npx mlcl check')
  }, 120_000)

  it('reports a failing step with the errors to fix first', async () => {
    const json = await create(FAILED)
    expect(json.verified).toEqual({ typecheck: 'failed' })
    expect(json.checkReport).toContain('error TS2304')
    expect((json.next as string[]).at(-1)).toBe('Before handing work back: npx mlcl check')
  }, 120_000)

  it('runs no check with --no-verify', async () => {
    const json = await create(PASSED, ['--no-verify'])
    expect(check.calls).toEqual([])
    expect(json.verified).toBeUndefined()
    expect((json.next as string[]).at(-1)).toBe('Before handing work back: npx mlcl check')
  }, 120_000)

  // r32 scaffold eval: Codex created with --no-verify, found no app/node_modules (npm workspaces
  // hoist to the root) and ran `npm ci && npm run build`, 49 s.
  it('says the project is installed, so a reinstall is not needed (OLD MUSTFAIL)', async () => {
    const json = await create(PASSED, ['--no-verify'])
    expect(json.next).toContain(INSTALLED)
  }, 120_000)

  it('does not say so when create did not install', async () => {
    const json = await create(PASSED, ['--skip-install'])
    expect(json.next).not.toContain(INSTALLED)
    expect(json.pendingSetup).toContain('npm install')
  }, 120_000)
})

const INSTALLED =
  'Installed: the dependencies are in the root node_modules. Reinstall only after a dependency changes (npx mlcl add installs what it adds)'
