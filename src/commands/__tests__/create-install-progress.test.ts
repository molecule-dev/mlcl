/**
 * `mlcl create` says that its slow steps are still running, and under `--json` it says so on
 * stderr, leaving stdout to the result object.
 *
 * npm prints nothing while it resolves a first install, and under `--json` create printed nothing
 * either. On 2026-11-22 Codex ran `mlcl create --json` for a full-stack app, found it silent with
 * no package installed after a minute and a half, stopped it as hung before the integration code
 * was generated, and wired the app by hand.
 *
 * Runs the REAL oclif command against a temp directory. Only `npm install` is replaced: it lets
 * 65 s of fake time pass, so the step reports twice. The inject child is replaced too, because a
 * project with no installed package cannot be injected (create-pending-setup.test.ts covers that).
 *
 * @module
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { execa } from 'execa'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { withHeartbeat } from '../../lib/create-progress.js'
import Create from '../create.js'

vi.mock('execa', () => ({ execa: vi.fn() }))
const execaMock = vi.mocked(execa)

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

/** What a run printed, by stream. */
interface Printed {
  stdout: string[]
  stderr: string[]
}

describe('mlcl create — progress while npm install runs', () => {
  let dir: string
  let prevCwd: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-create-install-progress-'))
    prevCwd = process.cwd()
    process.chdir(dir)
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    execaMock.mockReset()
    execaMock.mockImplementation((async (file: string, args: readonly string[]) => {
      if (file !== 'npm' || args[0] !== 'install')
        throw new Error(`unexpected child: ${file} ${args.join(' ')}`)
      await vi.advanceTimersByTimeAsync(65_000)
      return { exitCode: 0, stdout: '', stderr: '' }
    }) as unknown as typeof execa)
  })

  afterEach(async () => {
    vi.useRealTimers()
    process.chdir(prevCwd)
    await rm(dir, { recursive: true, force: true })
  })

  /**
   * Run `mlcl create` for a Vue app, with install, and collect what it printed.
   *
   * @param extra - Flags after `--no-interactive`.
   * @returns The lines on each stream.
   */
  async function create(extra: string[]): Promise<Printed> {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Create(
      ['proj', '--type', 'app', '--framework', 'vue', '--no-interactive', ...extra],
      config,
    )
    const printed: Printed = { stdout: [], stderr: [] }
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation((message) => {
      printed.stdout.push(String(message ?? ''))
    })
    vi.spyOn(cmd, 'logToStderr').mockImplementation((message) => {
      printed.stderr.push(String(message ?? ''))
    })
    vi.spyOn(cmd as unknown as { runInject: () => Promise<void> }, 'runInject').mockResolvedValue(
      undefined,
    )
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    try {
      await cmd.run()
    } finally {
      write.mockRestore()
    }
    return printed
  }

  it('under --json: the install is announced and reported on stderr; stdout is only the result', async () => {
    const { stdout, stderr } = await create(['--json'])

    expect(execaMock).toHaveBeenCalledWith(
      'npm',
      ['install', '--no-audit', '--no-fund', '--loglevel=notice'],
      {
        cwd: join(dir, 'proj'),
        stdio: 'pipe',
      },
    )
    expect(stderr).toContain(
      'Installing dependencies (a first install takes a few minutes, and npm prints nothing until it is done)...',
    )
    expect(stderr).toContain('npm install is still running (30 s)')
    expect(stderr).toContain('npm install is still running (60 s)')
    expect(stderr).toContain('Generating integration code...')
    expect(stdout).toHaveLength(1)
    expect(JSON.parse(stdout[0]!)).toMatchObject({ project: 'proj', installSkipped: false })
  })

  it('without --json: the same lines go to stdout and nothing to stderr', async () => {
    const { stdout, stderr } = await create([])

    expect(stdout).toContain('npm install is still running (30 s)')
    expect(stdout).toContain('npm install is still running (60 s)')
    expect(stderr).toEqual([])
  })

  it('--skip-install runs no install and reports nothing for it', async () => {
    const { stderr } = await create(['--json', '--skip-install'])

    expect(execaMock).not.toHaveBeenCalled()
    expect(stderr.some((line) => line.startsWith('npm install'))).toBe(false)
  })
})

describe('withHeartbeat', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('reports at each interval until the step settles, then stops', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    const beats: number[] = []
    const result = await withHeartbeat(
      async () => {
        await vi.advanceTimersByTimeAsync(25_000)
        return 'done'
      },
      (seconds) => beats.push(seconds),
      { everyMs: 10_000 },
    )
    await vi.advanceTimersByTimeAsync(60_000)

    expect(result).toBe('done')
    expect(beats).toEqual([10, 20])
  })

  it('passes a failure through and still stops reporting', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    const beats: number[] = []
    const failing = withHeartbeat(
      async () => {
        await vi.advanceTimersByTimeAsync(15_000)
        throw new Error('npm install failed')
      },
      (seconds) => beats.push(seconds),
      { everyMs: 10_000 },
    )

    await expect(failing).rejects.toThrow('npm install failed')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(beats).toEqual([10])
  })
})
