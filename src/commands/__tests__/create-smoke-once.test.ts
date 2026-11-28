/**
 * An installed `mlcl create` runs the project's unit tests once, on the final tree, beside its
 * check, and says "no unit tests yet" for a scaffold that has none instead of calling it a pass.
 *
 * In the r33 scaffold eval (2026-11-25) a create ran the API tests twice: in its api inject
 * (2.7 s), and again itself after the install of what inject declared. Then it ran the check
 * (6.3 s), after the tests. Inject now runs with --no-test, and the one run of the tests overlaps
 * the check.
 *
 * Runs the REAL oclif command with the install, the child processes (inject, vitest) and the
 * check replaced: what is under test is which children create starts and when.
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

type CheckResult = Awaited<ReturnType<typeof runCheckLocal>>

const state = vi.hoisted(() => ({
  spawned: [] as { file: string; args: string[] }[],
  smoke: 'passes' as 'passes' | 'fails' | 'empty' | 'empty-old-config' | 'all-skipped',
  smokePending: false,
  checkStarted: null as (() => void) | null,
  // Whether the smoke run was still going when the check started.
  overlapped: null as boolean | null,
  result: null as unknown,
}))

vi.mock('../../lib/npm-install.js', async (importOriginal) => ({
  ...(await importOriginal<typeof NpmInstall>()),
  npmInstall: vi.fn(async () => undefined),
}))
vi.mock('execa', async (importOriginal) => ({
  ...(await importOriginal<typeof Execa>()),
  execa: vi.fn(async (file: string, args: string[] = []) => {
    state.spawned.push({ file, args })
    if (file !== 'npx' || !args.includes('vitest')) return { stdout: '', stderr: '' }
    // The smoke run ends when the check starts, or after a second when nothing starts it.
    state.smokePending = true
    await new Promise<void>((resolve) => {
      state.checkStarted = resolve
      setTimeout(resolve, 1000)
    })
    state.smokePending = false
    // An app on the old config exits 1 when it has no test files; the current one exits 0.
    if (state.smoke === 'fails')
      throw Object.assign(new Error('Command failed: npx vitest run\n 1 failed'), {
        stdout: ' Tests  1 failed | 5 passed (6)',
      })
    if (state.smoke === 'empty-old-config')
      throw Object.assign(new Error('Command failed with exit code 1: npx vitest run'), {
        stdout: 'No test files found, exiting with code 1',
      })
    if (state.smoke === 'empty')
      return { stdout: 'No test files found, exiting with code 0', stderr: '' }
    if (state.smoke === 'all-skipped') return { stdout: ' Tests  3 skipped (3)', stderr: '' }
    return { stdout: ' Tests  6 passed (6)', stderr: '' }
  }),
}))
vi.mock('../../lib/check-stop-hook.js', async (importOriginal) => ({
  ...(await importOriginal<typeof CheckStopHook>()),
  runRecordedCheck: vi.fn(async () => {
    state.overlapped = state.smokePending
    state.checkStarted?.()
    return state.result
  }),
}))

const { default: Create } = await import('../create.js')

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

const PASSED: CheckResult = {
  ok: true,
  report: 'all passed',
  results: (['typecheck', 'lint', 'build'] as const).map((kind) => ({
    kind,
    name: 'api',
    status: 'passed' as const,
    durationMs: 1,
    errors: [],
    errorTotal: 0,
    logPath: '',
  })),
}

let dir: string
let prevCwd: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-create-smoke-once-'))
  prevCwd = process.cwd()
  process.chdir(dir)
  state.spawned = []
  state.smoke = 'passes'
  state.smokePending = false
  state.checkStarted = null
  state.overlapped = null
  state.result = PASSED
})

afterEach(async () => {
  process.chdir(prevCwd)
  vi.restoreAllMocks()
  await rm(dir, { recursive: true, force: true })
})

/** Run an installed full-stack create; return its --json result, its warnings and its log. */
async function create(
  json = true,
): Promise<{ json: Record<string, unknown>; warnings: string[]; out: string[] }> {
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
      ...(json ? ['--json'] : []),
    ],
    config,
  )
  const warnings: string[] = []
  vi.spyOn(cmd, 'warn').mockImplementation((input) => {
    warnings.push(String(input))
    return input
  })
  vi.spyOn(cmd, 'logToStderr').mockImplementation(() => undefined)
  const out: string[] = []
  vi.spyOn(cmd, 'log').mockImplementation((line?: string) => void out.push(line ?? ''))
  await cmd.run()
  const result = out.find((line) => line.trimStart().startsWith('{'))
  return { json: result ? JSON.parse(result) : {}, warnings, out }
}

const injects = (): string[][] =>
  state.spawned.filter((s) => s.file === 'node' && s.args.includes('inject')).map((s) => s.args)
const smokeRuns = (): number =>
  state.spawned.filter((s) => s.file === 'npx' && s.args.includes('vitest')).length

describe('mlcl create runs the unit tests once, beside its check', () => {
  it('runs inject without its own smoke tests (OLD MUSTFAIL)', async () => {
    await create()
    expect(injects()).toHaveLength(2)
    for (const args of injects()) expect(args).toContain('--no-test')
    expect(smokeRuns()).toBe(1)
  }, 120_000)

  it('starts the check while the smoke tests run (OLD MUSTFAIL)', async () => {
    const { json } = await create()
    expect(state.overlapped).toBe(true)
    expect(json.verified).toEqual({ typecheck: 'passed', lint: 'passed', build: 'passed' })
  }, 120_000)

  it('still warns about failing unit tests and reports the check', async () => {
    state.smoke = 'fails'
    const { json, warnings } = await create()
    expect(warnings.some((w) => w.startsWith('Unit tests failed'))).toBe(true)
    expect(json.verified).toEqual({ typecheck: 'passed', lint: 'passed', build: 'passed' })
  }, 120_000)

  it.each(['empty', 'empty-old-config'] as const)(
    'says a scaffold with no tests has none yet, neither passed nor failed (%s, OLD MUSTFAIL)',
    async (smoke) => {
      state.smoke = smoke
      const { warnings, out } = await create(false)
      expect(warnings.filter((w) => w.includes('Unit tests'))).toEqual([])
      expect(out).toContain('No unit tests yet. Add tests for the behavior you build.')
      expect(out.some((line) => line.startsWith('Unit tests passed'))).toBe(false)
    },
    120_000,
  )

  it('counterexample: a suite whose every case is skipped is no pass', async () => {
    state.smoke = 'all-skipped'
    const { warnings } = await create()
    expect(warnings.some((w) => w.startsWith('Unit tests failed: No unit test ran'))).toBe(true)
  }, 120_000)

  it('reports a passing suite with its count', async () => {
    const { warnings, out } = await create(false)
    expect(warnings.filter((w) => w.includes('Unit tests'))).toEqual([])
    expect(
      out.some((line) => line.startsWith('Unit tests passed') && line.includes('6 passed')),
    ).toBe(true)
  }, 120_000)
})
