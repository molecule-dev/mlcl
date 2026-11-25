// @vitest-environment node
/**
 * `add`, `inject` and `swap` hold a per-project lock, so two of them never install into one
 * project at once. Claude called `add_package` for an interface and its provider in parallel, and
 * two `mlcl add` runs installed into one project together (harness eval `add`, 2026-11-25).
 *
 * @module
 */

import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { projectLockPath, withProjectLock } from '../project-lock.js'

const LOCK_MODULE = join(import.meta.dirname, '..', 'project-lock.ts')

let root: string
let lockDir: string
let project: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'mlcl-project-lock-'))
  lockDir = join(root, 'locks')
  project = join(root, 'project')
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

/**
 * A second process that takes the lock, says so, holds it for `holdMs` and exits.
 *
 * @param holdMs - How long it holds the lock.
 * @returns The child, once it holds the lock.
 */
async function holder(holdMs: number): Promise<{ pid: number; exited: Promise<number> }> {
  const script = join(root, 'hold.mts')
  writeFileSync(
    script,
    `import { withProjectLock } from ${JSON.stringify(LOCK_MODULE)}\n` +
      `await withProjectLock(${JSON.stringify(project)}, async () => {\n` +
      `  process.stdout.write('held\\n')\n` +
      `  await new Promise((done) => setTimeout(done, ${holdMs}))\n` +
      `}, { lockDir: ${JSON.stringify(lockDir)} })\n`,
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

describe('withProjectLock', () => {
  it('waits for another process that holds the project (OLD MUSTFAIL)', async () => {
    const other = await holder(600)
    const waitedFor: number[] = []

    const startedAt = await withProjectLock(project, async () => Date.now(), {
      lockDir,
      onWait: (pid) => waitedFor.push(pid),
    })

    expect(waitedFor).toEqual([other.pid])
    expect(startedAt).toBeGreaterThanOrEqual((await other.exited) - 50)
  }, 30_000)

  it('takes over a lock whose owner is gone', async () => {
    const gone = spawn(process.execPath, ['-e', ''])
    await new Promise((done) => gone.on('exit', done))
    const file = projectLockPath(project, lockDir)
    rmSync(lockDir, { recursive: true, force: true })
    await import('node:fs').then(({ mkdirSync }) => mkdirSync(lockDir, { recursive: true }))
    writeFileSync(file, `${gone.pid}\n`)
    const waitedFor: number[] = []

    const ran = await withProjectLock(project, async () => true, {
      lockDir,
      onWait: (pid) => waitedFor.push(pid),
    })

    expect(ran).toBe(true)
    expect(waitedFor).toEqual([])
  })

  it('lets the holding process in again: add runs inject inside its own lock', async () => {
    const inner = await withProjectLock(
      project,
      () => withProjectLock(project, async () => 'inner', { lockDir, timeoutMs: 500 }),
      { lockDir },
    )
    expect(inner).toBe('inner')
  })

  it('lets it in again from another copy of this module: oclif loads inject on its own', async () => {
    vi.resetModules()
    const other = await import('../project-lock.js')
    expect(other.withProjectLock).not.toBe(withProjectLock)
    const inner = await withProjectLock(
      project,
      () => other.withProjectLock(project, async () => 'inner', { lockDir, timeoutMs: 500 }),
      { lockDir },
    )
    expect(inner).toBe('inner')
    // The outer call took the lock, so the outer call removes it.
    expect(await withProjectLock(project, async () => 'again', { lockDir, timeoutMs: 500 })).toBe(
      'again',
    )
  })

  it('releases the lock when the work throws', async () => {
    await expect(
      withProjectLock(
        project,
        async () => {
          throw new Error('failed')
        },
        { lockDir },
      ),
    ).rejects.toThrow('failed')
    expect(await withProjectLock(project, async () => 'again', { lockDir, timeoutMs: 500 })).toBe(
      'again',
    )
  })

  it('counterexample: another project does not wait', async () => {
    await holder(2_000)
    const waitedFor: number[] = []

    await withProjectLock(join(root, 'elsewhere'), async () => undefined, {
      lockDir,
      onWait: (pid) => waitedFor.push(pid),
    })

    expect(waitedFor).toEqual([])
  }, 30_000)
})
