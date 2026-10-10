/**
 * `mlcl inject` disabled the injector's per-plan `autoInstall` "to defer npm
 * install to after all plans" — but the deferred install did not exist. The
 * `--install` flag (default true, "Run npm install after injection") promised
 * an install that never ran: package.json named packages node_modules did not
 * have, and the smoke tests the command runs by default (`--test`) then
 * failed on the missing modules instead of the injection. Every sibling
 * command (`mlcl add`, `mlcl create`, `mlcl swap`) runs its own install.
 *
 * Runs the REAL oclif command against a temp project with `execa` mocked —
 * the install must fire once after the writes land, be skippable via
 * `--no-install`, and degrade to a warning (not a crash) on failure.
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

/**
 * The call ORDER between the injection's writes and the deferred install is
 * the whole point of "after every plan and synthesized file has landed" — an
 * install that ran BEFORE the writes (the old shape: over a half-written
 * manifest) passed every count/argv assertion. Every fs/promises write is
 * recorded through a passthrough mock, and the install event is appended by
 * the mocked execa, so one list gives the ordering evidence.
 */
const order = vi.hoisted(() => ({ events: [] as string[] }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  const realWriteFile = actual.writeFile as (...args: unknown[]) => Promise<unknown>
  return {
    ...actual,
    writeFile(path: unknown, ...rest: unknown[]): Promise<unknown> {
      return realWriteFile(path, ...rest).then((result) => {
        order.events.push(`write:${String(path)}`)
        return result
      })
    },
  }
})

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

let dir: string | null = null
afterEach(async () => {
  execaMock.mockReset()
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

async function writeApiProject(): Promise<string> {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-inject-install-'))
  await mkdir(join(dir, 'src'), { recursive: true })
  // A manifest declaring a database bond in devDependencies — the same shape
  // `mlcl add --dev … --inject` leaves; the inject flow plans from it.
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
    join(dir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'Node16',
        moduleResolution: 'Node16',
        outDir: 'dist',
        rootDir: 'src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
      include: ['src'],
      exclude: ['node_modules', 'dist'],
    }),
  )
  return dir
}

async function runInject(projectPath: string, extraFlags: string[]): Promise<Inject> {
  const config = await Config.load(MLCL_ROOT)
  const cmd = new Inject(
    [
      '-m',
      '@molecule/api-database-pglite',
      '-p',
      projectPath,
      '--no-test',
      '--no-format',
      '--no-ai',
      ...extraFlags,
    ],
    config,
  )
  vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
  vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
  await cmd.run()
  return cmd
}

describe('mlcl inject runs the deferred npm install', () => {
  it('installs once after every plan and synthesized file has landed', async () => {
    const project = await writeApiProject()
    execaMock.mockImplementation((() => {
      order.events.push('install:npm install')
      return Promise.resolve({ stdout: '', stderr: '' }) as never
    }) as never)
    await runInject(project, [])

    expect(execaMock).toHaveBeenCalledTimes(1)
    expect(execaMock).toHaveBeenCalledWith('npm', ['install'], {
      cwd: project,
      stdio: 'pipe',
    })
    // The ORDER is the claim: the install event comes after every PLAN and
    // SYNTHESIZED file write — an install hoisted before the writes
    // reintroduced installs over a half-written manifest and still passed a
    // count check. The one documented exception is the `.env` secrets append,
    // which the command deliberately runs AFTER the install (it is not a plan
    // or synthesized file, and npm does not read it).
    const installAt = order.events.findIndex((event) => event === 'install:npm install')
    expect(installAt).toBeGreaterThanOrEqual(0)
    const isPlanWrite = (event: string): boolean =>
      event.startsWith('write:') && !event.endsWith('/.env')
    const lastPlanWriteAt = order.events.reduce(
      (last, event, index) => (isPlanWrite(event) ? index : last),
      -1,
    )
    expect(order.events.filter(isPlanWrite).length).toBeGreaterThan(0)
    expect(installAt, 'the deferred install must run after the writes, not before').toBeGreaterThan(
      lastPlanWriteAt,
    )
    // …and the post-install writes must be ONLY the exempted ones.
    const lateWrites = order.events.filter(
      (event, index) => index > installAt && event.startsWith('write:'),
    )
    for (const event of lateWrites) expect(event.endsWith('/.env')).toBe(true)
  })

  it('skips the install under --no-install', async () => {
    const project = await writeApiProject()
    await runInject(project, ['--no-install'])

    expect(execaMock).not.toHaveBeenCalled()
  })

  it('warns and completes when the install fails — the injection still counts', async () => {
    const project = await writeApiProject()
    execaMock.mockRejectedValueOnce(new Error('npm install failed (simulated network)'))

    // A failed install must not fail the command: the files landed, and the
    // warning names the failure (the user runs npm install by hand).
    const cmd = await runInject(project, [])
    expect(execaMock).toHaveBeenCalledTimes(1)
    // The failure is WARNED, not swallowed: the command's output names the
    // failed install. (The run resolving proves only the "completes" half —
    // a silent swallow would pass without this.)
    const logged = vi
      .mocked(cmd.log)
      .mock.calls.map((args) => args.map(String).join(' '))
      .join('\n')
    expect(logged).toContain('npm install failed')
  })
})
