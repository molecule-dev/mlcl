/**
 * One `mlcl check` at a time in a project (check-lock.ts). In the 2026-11-25 check eval, Codex ran
 * three checks of one project at once and a unit test timed out at vitest's 5 s; the same check
 * passed alone.
 *
 * Runs `runCheckLocal` on real projects whose build script records when it ran.
 *
 * @module
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { runCheckLocal } from '../check.js'
import { acquireCheckLock, CHECK_LOCK_FILE } from '../check-lock.js'

const roots: string[] = []

/** A project whose build appends its start and end time to `runs.log` and takes `ms`. */
function project(ms = 600): string {
  const root = mkdtempSync(join(tmpdir(), 'check-lock-'))
  roots.push(root)
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ scripts: { build: 'node build.cjs' } }),
  )
  writeFileSync(
    join(root, 'build.cjs'),
    `const fs = require('fs')
const start = Date.now()
setTimeout(() => fs.appendFileSync('runs.log', start + ' ' + Date.now() + '\\n'), ${ms})
`,
  )
  return root
}

/** The [start, end] of each build the project ran. */
function runs(root: string): [number, number][] {
  return readFileSync(join(root, 'runs.log'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => line.split(' ').map(Number) as [number, number])
    .sort((a, b) => a[0] - b[0])
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('one check at a time in a project', () => {
  it('runs a second check of the project after the first, not beside it (OLD MUSTFAIL)', async () => {
    const root = project()
    const waited: number[] = []
    const check = (): ReturnType<typeof runCheckLocal> =>
      runCheckLocal(
        root,
        { steps: ['build'] },
        { budgetMs: 30_000, onWait: (pid) => waited.push(pid) },
      )
    const [first, second] = await Promise.all([check(), check()])
    expect(first).toMatchObject({ ok: true })
    expect(second).toMatchObject({ ok: true })
    const [a, b] = runs(root)
    expect(b![0]).toBeGreaterThanOrEqual(a![1])
    expect(waited).toEqual([process.pid])
    expect(existsSync(join(root, CHECK_LOCK_FILE))).toBe(false)
  }, 30_000)

  it('runs checks of two projects side by side', async () => {
    const [one, two] = [project(), project()]
    const waited: number[] = []
    await Promise.all(
      [one, two].map((root) =>
        runCheckLocal(
          root,
          { steps: ['build'] },
          { budgetMs: 30_000, onWait: (pid) => waited.push(pid) },
        ),
      ),
    )
    const [a] = runs(one)
    const [b] = runs(two)
    expect(Math.max(a![0], b![0])).toBeLessThan(Math.min(a![1], b![1]))
    expect(waited).toEqual([])
  }, 30_000)

  it('takes over the lock of a check that no longer runs', async () => {
    const root = project(50)
    const gone = spawnSync(process.execPath, ['-e', 'console.log(process.pid)'], {
      encoding: 'utf8',
    })
    mkdirSync(join(root, 'node_modules', '.cache', 'mlcl-check'), { recursive: true })
    writeFileSync(join(root, CHECK_LOCK_FILE), gone.stdout.trim())
    const waited: number[] = []
    const result = await runCheckLocal(
      root,
      { steps: ['build'] },
      { budgetMs: 30_000, onWait: (pid) => waited.push(pid) },
    )
    expect(result).toMatchObject({ ok: true })
    expect(waited).toEqual([])
  }, 30_000)

  it('stops waiting when cancelled, and leaves the running check its lock', async () => {
    const root = project(50)
    const release = await acquireCheckLock(root)
    const controller = new AbortController()
    const pending = runCheckLocal(
      root,
      { steps: ['build'] },
      { signal: controller.signal, onWait: () => controller.abort() },
    )
    await expect(pending).resolves.toEqual({
      error: 'The check was cancelled while it waited for another check of this project.',
    })
    expect(readFileSync(join(root, CHECK_LOCK_FILE), 'utf8')).toBe(String(process.pid))
    await release()
    expect(existsSync(join(root, CHECK_LOCK_FILE))).toBe(false)
  }, 30_000)
})
