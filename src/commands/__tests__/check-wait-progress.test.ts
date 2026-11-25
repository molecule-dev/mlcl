/**
 * A check that waits for another check of its project (check-lock.ts) says so on stderr when it
 * starts waiting and on every heartbeat while it waits, as it says which steps are still running:
 * a harness watching the output must not take a silent wait for a hang. In the r33 check eval
 * Codex started two checks at once in every run, and the second waited for the first.
 *
 * Runs the real oclif command in a project whose lock the test holds.
 *
 * @module
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { acquireCheckLock } from '../../lib/check-lock.js'
import { HEARTBEAT_MS } from '../../lib/create-progress.js'
import Check from '../check.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const WAITING = 'check: waiting for the check already running in this project'
const STILL_WAITING = 'check: still waiting for the check already running in this project'

let root: string | undefined
const prevCwd = process.cwd()

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  process.chdir(prevCwd)
  if (root) rmSync(root, { recursive: true, force: true })
  root = undefined
})

/** Resolve once `text` holds `needle`, polling with the real setTimeout. */
async function until(read: () => string, needle: string): Promise<void> {
  for (let i = 0; i < 400 && !read().includes(needle); i++)
    await new Promise((resolve) => setTimeout(resolve, 25))
  expect(read()).toContain(needle)
}

describe('mlcl check while another check of the project runs', () => {
  it('says it is still waiting on each heartbeat, then runs (OLD MUSTFAIL)', async () => {
    root = mkdtempSync(join(tmpdir(), 'check-wait-progress-'))
    writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: { build: 'node -e ""' } }))
    const release = await acquireCheckLock(root)
    let stderr = ''
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: string | Uint8Array) => {
      stderr += String(chunk)
      return true
    })
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    process.chdir(root)
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Check(['--steps', 'build'], config)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    const pending = cmd.run()

    await until(() => stderr, `${WAITING} (pid ${process.pid})`)
    vi.advanceTimersByTime(HEARTBEAT_MS)
    expect(stderr).toContain(`${STILL_WAITING} (pid ${process.pid}, 30s)`)

    await release()
    await pending
    expect(stderr).toContain('check: build started')
    const waits = stderr.split(STILL_WAITING).length - 1
    vi.advanceTimersByTime(HEARTBEAT_MS)
    expect(stderr.split(STILL_WAITING).length - 1).toBe(waits)
  }, 30_000)
})
