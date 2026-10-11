/**
 * `mlcl inject` runs the project's smoke tests by default (`--test`) and turns
 * a failure into an ERROR — which is what makes the command exit 1.
 *
 * The error was pushed only when the failure carried captured output
 * (`if (testResult.output)`), and `runTests` reports a run that was killed or
 * never spawned as `output: ''` (`[stdout, stderr].filter(Boolean).join('\n')`
 * with neither bound — a suite that hangs and is killed at the 60 s timeout
 * having printed nothing, or a child that cannot spawn at all). So a FAILED
 * smoke run left `errors` empty, the `this.exit(1)` at the bottom of `run()`
 * never ran, and the command exited 0: an agent or CI job reading the exit
 * status took a failed injection for a success — the exact failure that check
 * exists to prevent.
 *
 * The REAL oclif command is driven against a temp project with `execa` and the
 * post-injection validator mocked, so the smoke step is the only variable.
 *
 * @module
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { execa } from 'execa'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Inject from '../inject.js'

vi.mock('execa', () => ({ execa: vi.fn() }))
const execaMock = vi.mocked(execa)

// The validator's verdict is not this suite's subject — it only has to be
// VALID, because an invalid project skips the smoke tests entirely
// (`if (flags.test && validation.valid)`).
vi.mock('../../lib/validator.js', () => ({
  validateInjectionOutput: vi.fn(async () => ({ valid: true, warnings: [], errors: [] })),
}))

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

let dir: string | null = null

afterEach(async () => {
  execaMock.mockReset()
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

/**
 * A project the inject flow plans from, with the generated smoke test the
 * command looks for (`hasTestFiles` checks `src/__tests__/server.test.ts`) —
 * the same fixture `inject-deferred-install.test.ts` uses, plus that file.
 */
async function writeApiProjectWithTests(): Promise<string> {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-inject-smoke-'))
  await mkdir(join(dir, 'src', '__tests__'), { recursive: true })
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({
      name: 'demo-api',
      version: '1.0.0',
      private: true,
      type: 'module',
      dependencies: { '@molecule/api-database-postgresql': '1.0.5' },
      devDependencies: { '@molecule/api-database-pglite': '1.0.3' },
    }),
  )
  await writeFile(
    join(dir, 'src', '__tests__', 'server.test.ts'),
    "import { describe, expect, it } from 'vitest'\ndescribe('server', () => { it('boots', () => expect(true).toBe(true)) })\n",
  )
  return dir
}

/** Build the command with every step but the smoke tests turned off. */
async function makeCmd(projectPath: string): Promise<{ cmd: Inject; logs: string[] }> {
  const config = await Config.load(MLCL_ROOT)
  const cmd = new Inject(
    [
      '-m',
      '@molecule/api-database-pglite',
      '-p',
      projectPath,
      '--no-install',
      '--no-format',
      '--no-ai',
    ],
    config,
  )
  vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
  const logs: string[] = []
  vi.spyOn(cmd, 'log').mockImplementation((message?: string) => {
    logs.push(String(message))
  })
  return { cmd, logs }
}

/** Run the command to completion, returning whatever it threw (if anything). */
async function runToSettlement(cmd: Inject): Promise<unknown> {
  try {
    await cmd.run()
    return null
  } catch (error) {
    return error
  }
}

describe('mlcl inject reports a smoke-test failure even when it captured no output', () => {
  it('fails the command when the test run was killed and printed nothing', async () => {
    const project = await writeApiProjectWithTests()
    // `runTests` builds its message from `error.stdout` / `error.stderr`; a
    // plain Error carries NEITHER, which is exactly the killed-hung-suite /
    // never-spawned shape that produced `output: ''`.
    execaMock.mockRejectedValue(new Error('vitest was killed'))
    const { cmd, logs } = await makeCmd(project)

    const thrown = await runToSettlement(cmd)

    expect(execaMock).toHaveBeenCalledWith(
      'npx',
      ['vitest', 'run', '--reporter=verbose'],
      expect.objectContaining({ cwd: project }),
    )
    // The failure must be REPORTED (it is the printed errors that tell the
    // reader what happened)…
    expect(logs.join('\n'), 'the smoke-test failure must be reported').toContain(
      'Smoke tests failed',
    )
    // …and the exit status must say so too, or an agent/CI job reads success.
    expect(thrown, 'a failed smoke run must fail the command (exit 1), not resolve').toMatchObject({
      oclif: { exit: 1 },
    })
  })

  it('keeps quoting the output of a failing run that DID print some', async () => {
    // Non-vacuousness: the ordinary failure shape keeps its diagnostic, so the
    // fix cannot have replaced the quoted output with a generic sentence.
    const project = await writeApiProjectWithTests()
    execaMock.mockRejectedValue(
      Object.assign(new Error('tests failed'), { stdout: 'Tests  2 failed (2)' }),
    )
    const { cmd, logs } = await makeCmd(project)

    const thrown = await runToSettlement(cmd)

    expect(logs.join('\n')).toContain('Tests  2 failed (2)')
    expect(thrown).toMatchObject({ oclif: { exit: 1 } })
  })
})
