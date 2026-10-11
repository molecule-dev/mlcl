// @vitest-environment node
/**
 * `mutateRegistry` serializes publishers with a lock file beside the registry.
 *
 * The stamp the publish step re-checks is a CHECK-THEN-ACT: between the check
 * and the rename two publishers can both see "unchanged" and both rename, and
 * the second's document never saw the first's entry — the silent drop the whole
 * optimistic-concurrency design exists to prevent, and one no retry can answer
 * because neither writer observed a conflict. The lock is what closes that
 * window: the whole read-modify-write runs under it, so the lock file EXISTS
 * while a publish's temp write is in flight (the first assertion below fails
 * without it) and is GONE once the mutation returns.
 *
 * The failure paths are pinned too: a lock left by a crashed holder is STOLEN
 * (a leftover must not wedge every future mutation behind it), and a live
 * rival's lock fails the mutation LOUDLY inside a bounded wait, leaving the
 * registry and the rival's lock untouched. The wait budget is read per call
 * from `MLCL_REGISTRY_LOCK_WAIT_MS`, so the loud-failure case is testable in
 * milliseconds; the steal age is a fixed 60 s, so its test backdates the
 * leftover's mtime instead.
 *
 * Every test points `MLCL_REGISTRY_PATH` at its own throwaway file — a mistake
 * in that setup would take the publish lock of, or write into, mlcl's real
 * `registry.json`.
 *
 * @module
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** What the mocked `writeFileSync`/`rmSync`/`renameSync` observed. */
const observed = vi.hoisted(() => ({
  /** Whether the publish lock existed when the publish's TEMP file was written. */
  lockExistedAtTempWrite: null as boolean | null,
  /** The registry path under test (set per test; the factory reads it lazily). */
  registryPath: null as string | null,
  /**
   * The steal race, armed by the test below: while armed, the NEXT removal of
   * the publish lock runs against a FRESH lock instead of the stale one the
   * code stat'ed — a rival that won its own steal in the gap between this
   * process's staleness stat and its removal.
   */
  stealRace: { armed: false, rivalPid: null as number | null },
  /** Whether a FRESH (rival-owned) lock was present at the removal. */
  removedFreshLock: false,
  /**
   * How many times the NEXT `statSync` of the publish lock throws instead of
   * describing it. Bounded on purpose: the unbounded version of this state is
   * the defect the test below pins (a caller that retries an uninspectable lock
   * spins forever with no clock, so a test that reproduced it faithfully could
   * never return).
   */
  uninspectableLock: { remaining: 0 },
}))

vi.mock('node:fs', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  const realWriteFileSync = actual.writeFileSync as (path: unknown, ...rest: unknown[]) => void
  const realExistsSync = actual.existsSync as (path: unknown) => boolean
  const realRmSync = actual.rmSync as (path: unknown, ...rest: unknown[]) => void
  const realRenameSync = actual.renameSync as (from: unknown, to: unknown) => void
  const realStatSync = actual.statSync as (path: unknown, ...rest: unknown[]) => unknown
  /**
   * Reproduce, deterministically, the window the removal must survive: the
   * caller judged the lock stale from a stat, and by the time it removes that
   * path a rival has already done the same — removed the stale file and created
   * its OWN fresh one (a NEW inode, which is what makes the two files
   * distinguishable) — so the path now holds the rival's lock. Fires once, only
   * for the publish lock's own path.
   *
   * @param path - The path the removal is about to act on.
   */
  const simulateRivalInTheGap = (path: unknown): void => {
    const p = typeof path === 'string' ? path : String(path)
    const { stealRace, registryPath } = observed
    if (!stealRace.armed || stealRace.rivalPid === null) return
    if (registryPath === null || p !== `${registryPath}.publish.lock`) return
    stealRace.armed = false
    realRmSync(p, { force: true })
    realWriteFileSync(p, `${stealRace.rivalPid}\n`)
    observed.removedFreshLock = true
  }
  return {
    ...actual,
    writeFileSync(path: unknown, ...rest: unknown[]): void {
      const p = typeof path === 'string' ? path : String(path)
      if (observed.registryPath !== null && p === `${observed.registryPath}.${process.pid}.tmp`) {
        // The publish's temp write, in flight: is THIS process holding the
        // publish lock at this instant?
        observed.lockExistedAtTempWrite = realExistsSync(`${observed.registryPath}.publish.lock`)
      }
      return realWriteFileSync(path, ...rest)
    },
    rmSync(path: unknown, ...rest: unknown[]): void {
      simulateRivalInTheGap(path)
      return realRmSync(path, ...rest)
    },
    renameSync(from: unknown, to: unknown): void {
      simulateRivalInTheGap(from)
      return realRenameSync(from, to)
    },
    statSync(path: unknown, ...rest: unknown[]): unknown {
      const p = typeof path === 'string' ? path : String(path)
      if (
        observed.uninspectableLock.remaining > 0 &&
        observed.registryPath !== null &&
        p === `${observed.registryPath}.publish.lock`
      ) {
        observed.uninspectableLock.remaining--
        const denied = new Error('EACCES: permission denied, stat') as NodeJS.ErrnoException
        denied.code = 'EACCES'
        throw denied
      }
      return realStatSync(path, ...rest)
    },
  }
})

import { clearRegistryCache, updateRegistryEntry } from '../registry.js'
import type { RegistryEntry } from '../schema.js'

const probeEntry: RegistryEntry = {
  language: 'typescript',
  runtime: 'node',
  type: 'core',
  category: 'test',
  label: 'Publish lock probe',
  description: 'registry publish-lock probe',
  stack: 'api',
  path: 'packages/api/core/test',
}

const originalRegistryEnv = process.env.MLCL_REGISTRY_PATH
const originalWaitEnv = process.env.MLCL_REGISTRY_LOCK_WAIT_MS
let dir: string
let registryPath: string
let lockPath: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mlcl-registry-publish-lock-'))
  registryPath = join(dir, 'registry.json')
  lockPath = `${registryPath}.publish.lock`
  observed.registryPath = registryPath
  observed.lockExistedAtTempWrite = null
  observed.stealRace.armed = false
  observed.stealRace.rivalPid = null
  observed.removedFreshLock = false
  observed.uninspectableLock.remaining = 0
  if (originalWaitEnv === undefined) delete process.env.MLCL_REGISTRY_LOCK_WAIT_MS
  else process.env.MLCL_REGISTRY_LOCK_WAIT_MS = originalWaitEnv
  process.env.MLCL_REGISTRY_PATH = registryPath
  writeFileSync(registryPath, `${JSON.stringify({ version: 1, packages: {} }, null, 2)}\n`, 'utf-8')
  clearRegistryCache()
})

afterEach(() => {
  if (originalRegistryEnv === undefined) delete process.env.MLCL_REGISTRY_PATH
  else process.env.MLCL_REGISTRY_PATH = originalRegistryEnv
  if (originalWaitEnv === undefined) delete process.env.MLCL_REGISTRY_LOCK_WAIT_MS
  else process.env.MLCL_REGISTRY_LOCK_WAIT_MS = originalWaitEnv
  clearRegistryCache()
  rmSync(dir, { recursive: true, force: true })
})

describe('updateRegistryEntry — the publish lock', () => {
  it('holds the lock while the publish writes, and leaves no lock behind', () => {
    expect(existsSync(lockPath), 'no lock before the mutation').toBe(false)

    updateRegistryEntry('@molecule/lock-probe', probeEntry)

    expect(
      observed.lockExistedAtTempWrite,
      'the temp write must happen while this process holds the publish lock',
    ).toBe(true)
    expect(
      existsSync(lockPath),
      'a completed mutation must release the lock — a leftover would wedge the next run',
    ).toBe(false)
    const parsed = JSON.parse(readFileSync(registryPath, 'utf-8')) as {
      packages: Record<string, unknown>
    }
    expect(parsed.packages['@molecule/lock-probe']).toBeDefined()
  })

  it('steals a crashed holder’s leftover instead of wedging behind it', () => {
    // A lock sixty-five seconds old: no publish holds one that long (a publish
    // holds it for milliseconds), so this is a crashed process's leftover.
    writeFileSync(lockPath, '999999\n', 'utf-8')
    const longGone = new Date(Date.now() - 65_000)
    utimesSync(lockPath, longGone, longGone)

    updateRegistryEntry('@molecule/lock-steal-probe', probeEntry)

    const parsed = JSON.parse(readFileSync(registryPath, 'utf-8')) as {
      packages: Record<string, unknown>
    }
    expect(
      parsed.packages['@molecule/lock-steal-probe'],
      'the stale lock must not stop the publish',
    ).toBeDefined()
    expect(existsSync(lockPath), 'the stolen (then released) lock is gone').toBe(false)
  })

  it('fails loudly, registry and rival lock untouched, when a live rival holds the lock', () => {
    // Shrink the wait budget so the loud-failure path is reached in
    // milliseconds. The rival's lock is fresh, so it is inside the steal
    // window: the mutation must WAIT for it, then report the holder — never
    // steal a live one, never publish over the rival.
    process.env.MLCL_REGISTRY_LOCK_WAIT_MS = '50'
    writeFileSync(lockPath, `${process.pid + 1}\n`, 'utf-8')

    let thrown: unknown
    try {
      updateRegistryEntry('@molecule/lock-blocked-probe', probeEntry)
    } catch (error) {
      thrown = error
    }

    const message = thrown instanceof Error ? thrown.message : String(thrown)
    expect(message, 'a held lock must fail the mutation, naming the lock file').toMatch(
      /publish\.lock has been held/,
    )
    expect(message, 'the failure names the holder pid it read from the lock').toContain(
      String(process.pid + 1),
    )
    const parsed = JSON.parse(readFileSync(registryPath, 'utf-8')) as {
      packages: Record<string, unknown>
    }
    expect(
      parsed.packages['@molecule/lock-blocked-probe'],
      'the blocked mutation must not have published',
    ).toBeUndefined()
    expect(existsSync(lockPath), 'the rival’s lock must not have been removed').toBe(true)
    expect(existsSync(`${registryPath}.${process.pid}.tmp`), 'no temp litter').toBe(false)
  })

  it('never removes a rival’s fresh lock when both steal the same stale one', () => {
    // The staleness that licenses a steal is read from a `statSync` some
    // microseconds BEFORE the removal, and that gap is a race between two
    // processes that both judged the SAME stale lock dead: the first removes it
    // and creates its own fresh lock, and the second — its stat already taken
    // against the old file — then removed the FIRST'S lock. Both then believed
    // they held the lock, which reopens exactly the check-then-rename window
    // the lock exists to close (two publishers can pass the stamp check and the
    // second rename silently drops the first's entry).
    //
    // The mock above reproduces that window deterministically: it writes a
    // fresh, rival-owned lock an instant before the removal touches that path.
    // The removal must therefore act on the file it JUDGED stale (identity:
    // the inode), not on whatever is at the path now — the rival's lock must
    // survive, and this mutation must wait and then fail loudly rather than
    // publish on top of a live holder.
    process.env.MLCL_REGISTRY_LOCK_WAIT_MS = '50'
    const rivalPid = process.pid + 1
    writeFileSync(lockPath, '999999\n', 'utf-8')
    const longGone = new Date(Date.now() - 65_000)
    utimesSync(lockPath, longGone, longGone)
    observed.stealRace.rivalPid = rivalPid
    observed.stealRace.armed = true

    let thrown: unknown
    try {
      updateRegistryEntry('@molecule/lock-steal-race-probe', probeEntry)
    } catch (error) {
      thrown = error
    }

    expect(observed.removedFreshLock, 'the race simulation must have fired').toBe(true)
    const message = thrown instanceof Error ? thrown.message : String(thrown)
    expect(message, 'a live holder must be waited for and reported, not published over').toMatch(
      /publish\.lock has been held/,
    )
    expect(message, 'the failure names the rival whose lock was left in place').toContain(
      String(rivalPid),
    )
    expect(
      readFileSync(lockPath, 'utf-8').trim(),
      'the rival’s fresh lock must still be on disk, untouched',
    ).toBe(String(rivalPid))
    const parsed = JSON.parse(readFileSync(registryPath, 'utf-8')) as {
      packages: Record<string, unknown>
    }
    expect(
      parsed.packages['@molecule/lock-steal-race-probe'],
      'the mutation must not have published over the live holder',
    ).toBeUndefined()
    expect(existsSync(`${registryPath}.${process.pid}.tmp`), 'no temp litter').toBe(false)
  })

  it('reports a lock it cannot inspect instead of retrying it past the wait budget', () => {
    // The holder-release case is `ENOENT` (retry immediately, correct). Any
    // OTHER stat failure — EACCES on the directory, ELOOP, EIO — is not the
    // lock being released: this process cannot tell a dead holder from a live
    // one, and retrying it can never reach the wait budget below (it checks the
    // clock only on the path a successful stat leads to), so the mutation spins
    // without limit instead of reporting the one file the operator has to look
    // at. The failure is BOUNDED here (three calls) purely because the faithful,
    // unbounded version never returns — the assertion is on the first
    // iteration's decision, which is the defect.
    process.env.MLCL_REGISTRY_LOCK_WAIT_MS = '50'
    writeFileSync(lockPath, `${process.pid + 1}\n`, 'utf-8')
    observed.uninspectableLock.remaining = 3

    let thrown: unknown
    try {
      updateRegistryEntry('@molecule/lock-uninspectable-probe', probeEntry)
    } catch (error) {
      thrown = error
    }

    const message = thrown instanceof Error ? thrown.message : String(thrown)
    expect(message, 'an uninspectable lock must be reported, not retried as a release').toMatch(
      /cannot be inspected/,
    )
    expect(message, 'the failure names the file to inspect').toContain(lockPath)
    expect(existsSync(lockPath), 'the uninspectable lock must not be removed').toBe(true)
    const parsed = JSON.parse(readFileSync(registryPath, 'utf-8')) as {
      packages: Record<string, unknown>
    }
    expect(
      parsed.packages['@molecule/lock-uninspectable-probe'],
      'the mutation must not have published over a lock it could not inspect',
    ).toBeUndefined()
  })
})
