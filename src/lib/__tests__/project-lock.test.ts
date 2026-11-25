// @vitest-environment node
/**
 * `add`, `inject` and `swap` hold a per-project lock, so two of them never install into one
 * project at once. Claude called `add_package` for an interface and its provider in parallel, and
 * two `mlcl add` runs installed into one project together (harness eval `add`, 2026-11-25). The
 * security review of the first version (`.experiments/reviews/project-lock-security/`) found that
 * a lock in a shared temp directory could be pre-empted or followed through a planted link, that a
 * crashed owner's pid could be reused, and that two waiters could take over one abandoned lock.
 *
 * @module
 */

import { spawn } from 'node:child_process'
import type * as NodeFs from 'node:fs'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { projectLockPath, withProjectLock, withProjectLocks } from '../project-lock.js'

const LOCK_MODULE = join(import.meta.dirname, '..', 'project-lock.ts')

let root: string
let project: string
let file: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'mlcl-project-lock-'))
  project = join(root, 'project')
  mkdirSync(project)
  file = projectLockPath(project)
})

afterEach(() => {
  vi.doUnmock('node:fs')
  rmSync(root, { recursive: true, force: true })
})

/**
 * A second process that takes the lock, says so, holds it for `holdMs` and exits.
 *
 * @param holdMs - How long it holds the lock.
 * @param heartbeatMs - How often it touches the lock file.
 * @returns The child, once it holds the lock.
 */
async function holder(
  holdMs: number,
  heartbeatMs = 10_000,
): Promise<{ pid: number; exited: Promise<number> }> {
  const script = join(root, 'hold.mts')
  writeFileSync(
    script,
    `import { withProjectLock } from ${JSON.stringify(LOCK_MODULE)}\n` +
      `await withProjectLock(${JSON.stringify(project)}, async () => {\n` +
      `  process.stdout.write('held\\n')\n` +
      `  await new Promise((done) => setTimeout(done, ${holdMs}))\n` +
      `}, { heartbeatMs: ${heartbeatMs} })\n`,
  )
  const child = spawn(process.execPath, ['--import', 'tsx', script], {
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  const exited = new Promise<number>((done) => child.on('exit', () => done(Date.now())))
  await new Promise<void>((done, fail) => {
    child.stdout.on('data', (chunk: Buffer) => {
      if (chunk.toString().includes('held')) done()
    })
    child.on('exit', () => fail(new Error('the holder exited before it held the lock')))
  })
  return { pid: child.pid as number, exited }
}

/**
 * A pid that is not running.
 *
 * @returns It.
 */
async function deadPid(): Promise<number> {
  const gone = spawn(process.execPath, ['-e', ''])
  await new Promise((done) => gone.on('exit', done))
  return gone.pid as number
}

/**
 * Write a lock file as another process left it.
 *
 * @param content - What it holds.
 * @param ageMs - How long ago it was last touched.
 */
function leaveLock(content: string, ageMs = 0): void {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 })
  writeFileSync(file, content)
  const then = new Date(Date.now() - ageMs)
  utimesSync(file, then, then)
}

describe('withProjectLock', () => {
  it('waits for another process that holds the project (OLD MUSTFAIL)', async () => {
    const other = await holder(600)
    const waitedFor: number[] = []

    const startedAt = await withProjectLock(project, async () => Date.now(), {
      onWait: (pid) => waitedFor.push(pid),
    })

    expect(waitedFor).toEqual([other.pid])
    expect(startedAt).toBeGreaterThanOrEqual((await other.exited) - 50)
  }, 30_000)

  it('keeps the lock in the project, where another account cannot create it first (OLD MUSTFAIL)', async () => {
    const [seen, mode] = await withProjectLock(project, async () => [
      readFileSync(file, 'utf8'),
      statSync(dirname(file)).mode & 0o777,
    ])
    expect(file).toBe(join(project, 'node_modules', '.cache', 'mlcl', 'project.lock'))
    expect(seen).toBe(`${process.pid}\n`)
    expect(mode).toBe(0o700)
    expect(existsSync(file)).toBe(false)
  })

  it('leaves a project that has no node_modules as it found it', async () => {
    await withProjectLock(project, async () => undefined)
    expect(existsSync(join(project, 'node_modules'))).toBe(false)
  })

  it('counterexample: keeps node_modules that was there, and what an install wrote during the hold', async () => {
    mkdirSync(join(project, 'node_modules'))
    await withProjectLock(project, async () => undefined)
    expect(existsSync(join(project, 'node_modules'))).toBe(true)

    const other = join(root, 'other')
    mkdirSync(other)
    await withProjectLock(other, async () => {
      mkdirSync(join(other, 'node_modules', 'express'), { recursive: true })
    })
    expect(existsSync(join(other, 'node_modules', 'express'))).toBe(true)
    expect(existsSync(join(other, 'node_modules', '.cache'))).toBe(false)
  })

  it('takes over a lock whose owner is gone', async () => {
    leaveLock(`${await deadPid()}\n`)
    const waitedFor: number[] = []

    const ran = await withProjectLock(project, async () => true, {
      onWait: (pid) => waitedFor.push(pid),
    })

    expect(ran).toBe(true)
    expect(waitedFor).toEqual([])
  })

  it('takes over a lock nobody touched for the stale time, though its pid runs (OLD MUSTFAIL)', async () => {
    // A crashed owner's pid now belongs to an unrelated process (pid 1 always runs).
    leaveLock('1\n', 120_000)
    expect(await withProjectLock(project, async () => 'ran', { timeoutMs: 1_000 })).toBe('ran')
  })

  it('takes over a lock that names no pid once it is stale (OLD MUSTFAIL)', async () => {
    leaveLock('', 120_000)
    expect(await withProjectLock(project, async () => 'ran', { timeoutMs: 1_000 })).toBe('ran')
  })

  it('counterexample: a fresh lock that names no pid yet is held', async () => {
    leaveLock('')
    await expect(withProjectLock(project, async () => 'ran', { timeoutMs: 300 })).rejects.toThrow(
      'Another mlcl command (pid unknown)',
    )
  })

  it('counterexample: an owner that keeps touching the lock is waited for past the stale time', async () => {
    const other = await holder(1_200, 100)
    const startedAt = await withProjectLock(project, async () => Date.now(), { staleMs: 400 })
    expect(startedAt).toBeGreaterThanOrEqual((await other.exited) - 50)
  }, 30_000)

  it('does not run when another waiter took the lock over from it (OLD MUSTFAIL)', async () => {
    leaveLock(`${await deadPid()}\n`)
    let ranAt = 0
    const started = Date.now()
    const done = withProjectLock(project, async () => (ranAt = Date.now()), { pollMs: 400 })
    // It has removed the abandoned lock and taken it; a second waiter that read the same
    // abandoned lock removes this one and takes it (pid 1 stands in for that waiter).
    await delay(150)
    leaveLock('1\n')
    await delay(600)
    expect(ranAt).toBe(0)
    rmSync(file)
    await done
    expect(ranAt - started).toBeGreaterThanOrEqual(750)
  }, 30_000)

  it('never writes through a link planted where the lock is staged (OLD MUSTFAIL)', async () => {
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 })
    const victim = join(root, 'victim.txt')
    writeFileSync(victim, 'keep\n')
    symlinkSync(victim, `${file}.${process.pid}.tmp`)

    expect(await withProjectLock(project, async () => 'ran')).toBe('ran')
    expect(readFileSync(victim, 'utf8')).toBe('keep\n')
  })

  it('refuses a lock directory that is a link', async () => {
    mkdirSync(join(root, 'elsewhere'))
    mkdirSync(join(project, 'node_modules', '.cache'), { recursive: true })
    symlinkSync(join(root, 'elsewhere'), dirname(file))
    await expect(withProjectLock(project, async () => 'ran')).rejects.toThrow(
      'is not a directory of your own',
    )
  })

  it('makes a lock directory of its own private when others could write to it', async () => {
    mkdirSync(dirname(file), { recursive: true })
    chmodSync(dirname(file), 0o777)
    expect(await withProjectLock(project, async () => 'ran')).toBe('ran')
    expect(statSync(dirname(file)).mode & 0o777).toBe(0o700)
  })

  it('takes the lock where the file system has no hard links (OLD MUSTFAIL)', async () => {
    vi.resetModules()
    vi.doMock('node:fs', async (original) => ({
      ...(await original<typeof NodeFs>()),
      linkSync: () => {
        throw Object.assign(new Error('operation not permitted'), { code: 'EPERM' })
      },
    }))
    const { withProjectLock: withoutLinks } = await import('../project-lock.js')
    const seen = await withoutLinks(project, async () => readFileSync(file, 'utf8'))
    expect(seen).toBe(`${process.pid}\n`)
    expect(existsSync(file)).toBe(false)
  })

  it('lets the holding process in again: add runs inject inside its own lock', async () => {
    const inner = await withProjectLock(project, () =>
      withProjectLock(project, async () => 'inner', { timeoutMs: 500 }),
    )
    expect(inner).toBe('inner')
  })

  it('lets it in again from another copy of this module: oclif loads inject on its own', async () => {
    vi.resetModules()
    const other = await import('../project-lock.js')
    expect(other.withProjectLock).not.toBe(withProjectLock)
    const inner = await withProjectLock(project, () =>
      other.withProjectLock(project, async () => 'inner', { timeoutMs: 500 }),
    )
    expect(inner).toBe('inner')
    // The outer call took the lock, so the outer call removes it.
    expect(existsSync(file)).toBe(false)
  })

  it('releases the lock when the work throws', async () => {
    await expect(
      withProjectLock(project, async () => {
        throw new Error('failed')
      }),
    ).rejects.toThrow('failed')
    expect(await withProjectLock(project, async () => 'again', { timeoutMs: 500 })).toBe('again')
  })

  it('counterexample: another project does not wait', async () => {
    await holder(2_000)
    const elsewhere = join(root, 'elsewhere')
    mkdirSync(elsewhere)
    const waitedFor: number[] = []

    await withProjectLock(elsewhere, async () => undefined, {
      onWait: (pid) => waitedFor.push(pid),
    })

    expect(waitedFor).toEqual([])
  }, 30_000)
})

describe('withProjectLocks', () => {
  it('holds every project named, once each, and releases them all', async () => {
    const other = join(root, 'other')
    mkdirSync(other)
    const held = await withProjectLocks([other, project, other], async () =>
      [project, other].map((dir) => readFileSync(projectLockPath(dir), 'utf8')),
    )
    expect(held).toEqual([`${process.pid}\n`, `${process.pid}\n`])
    expect(existsSync(projectLockPath(project))).toBe(false)
    expect(existsSync(projectLockPath(other))).toBe(false)
  })
})
