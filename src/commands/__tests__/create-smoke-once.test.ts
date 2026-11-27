/**
 * An installed `mlcl create` runs the generated smoke tests once, on the final tree, beside its
 * check.
 *
 * In the r33 scaffold eval (2026-11-25) a create ran the API smoke tests twice: in its api inject
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
  smokeFails: false,
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
    if (state.smokeFails) throw new Error('Command failed: npx vitest run\n 1 failed')
    return { stdout: 'Tests  6 passed (6)', stderr: '' }
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
  state.smokeFails = false
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

/** Run an installed full-stack create and return its --json result and its warnings. */
async function create(): Promise<{ json: Record<string, unknown>; warnings: string[] }> {
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
  return { json: JSON.parse(out.find((line) => line.trimStart().startsWith('{'))!), warnings }
}

const injects = (): string[][] =>
  state.spawned.filter((s) => s.file === 'node' && s.args.includes('inject')).map((s) => s.args)
const smokeRuns = (): number =>
  state.spawned.filter((s) => s.file === 'npx' && s.args.includes('vitest')).length

describe('mlcl create runs the smoke tests once, beside its check', () => {
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

  it('still warns about failing smoke tests and reports the check', async () => {
    state.smokeFails = true
    const { json, warnings } = await create()
    expect(warnings.some((w) => w.startsWith('Smoke tests failed'))).toBe(true)
    expect(json.verified).toEqual({ typecheck: 'passed', lint: 'passed', build: 'passed' })
  }, 120_000)
})
