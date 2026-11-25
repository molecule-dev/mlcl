/**
 * One command at a time changes a project: `add`, `inject` and `swap` take this lock around
 * their writes and their `npm install`. In the harness eval `add` (2026-11-25) Claude called
 * `add_package` for an interface and its provider in parallel, and two `mlcl add` runs installed
 * into one project at once.
 *
 * The lock is a file under the OS temp directory, named by the project's real path and holding
 * the owner's pid. It is created whole by `link`, which fails when the file exists, so a waiter
 * never reads a half-written one. A lock whose owner is no longer running is taken over. A
 * process re-enters a lock that names its own pid: `add --inject` runs `inject` in the same process,
 * and oclif may load that command from another copy of this module, so the lock file is what says
 * who holds it, not this module's memory.
 *
 * @module
 */

import { createHash } from 'node:crypto'
import {
  linkSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

/** Options for {@link withProjectLock}. */
export interface ProjectLockOptions {
  /** The directory that holds the lock files (default: `mlcl-project-locks` in the OS temp dir). */
  lockDir?: string
  /** How often a waiter checks the lock, in ms (default 100). */
  pollMs?: number
  /** How long a waiter waits before it gives up, in ms (default 10 minutes). */
  timeoutMs?: number
  /** Called once when the lock is held by another process, with that process's pid. */
  onWait?: (pid: number) => void
}

/**
 * The lock file for a project.
 *
 * @param project - The project directory.
 * @param lockDir - The directory that holds the lock files.
 * @returns Its path.
 */
export function projectLockPath(project: string, lockDir: string): string {
  let real: string
  try {
    real = realpathSync(project)
  } catch (_error) {
    // A project directory that does not exist yet is named by the path given.
    real = project
  }
  return join(lockDir, `${createHash('sha256').update(real).digest('hex').slice(0, 32)}.lock`)
}

/**
 * The pid a lock file names.
 *
 * @param file - The lock file.
 * @returns The pid, or undefined when there is no lock file or it names none.
 */
function ownerOf(file: string): number | undefined {
  try {
    const pid = Number(readFileSync(file, 'utf8').trim())
    return Number.isInteger(pid) && pid > 0 ? pid : undefined
  } catch (_error) {
    // No lock file: nobody holds it.
    return undefined
  }
}

/**
 * Whether a process is running.
 *
 * @param pid - Its pid.
 * @returns True when it is (EPERM: it runs as another user).
 */
function running(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/**
 * Take the lock file, once.
 *
 * @param file - The lock file.
 * @returns True when this process now holds it.
 */
function tryTake(file: string): boolean {
  const staged = `${file}.${process.pid}.tmp`
  writeFileSync(staged, `${process.pid}\n`)
  try {
    linkSync(staged, file)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false
    throw error
  } finally {
    unlinkSync(staged)
  }
}

/**
 * Run `fn` while holding the project's lock, waiting for another process that holds it.
 *
 * @param project - The project directory (its npm install root, so a workspace and its root share
 *   one lock).
 * @param fn - The work to do under the lock.
 * @param options - Options.
 * @returns What `fn` returns.
 */
export async function withProjectLock<T>(
  project: string,
  fn: () => Promise<T>,
  options: ProjectLockOptions = {},
): Promise<T> {
  const {
    lockDir = join(tmpdir(), 'mlcl-project-locks'),
    pollMs = 100,
    timeoutMs = 10 * 60_000,
    onWait,
  } = options
  const file = projectLockPath(project, lockDir)
  // This process holds it already (an outer call): run inside that hold, and leave the file to it.
  if (ownerOf(file) === process.pid) return fn()

  mkdirSync(lockDir, { recursive: true })
  const deadline = Date.now() + timeoutMs
  let told = false
  while (!tryTake(file)) {
    const owner = ownerOf(file)
    if (owner !== undefined && !running(owner)) {
      // Its owner is gone. Re-read just before removing it, so a lock another waiter took over
      // in the meantime is left alone.
      if (ownerOf(file) === owner) rmSync(file, { force: true })
      continue
    }
    if (Date.now() > deadline)
      throw new Error(
        `Another mlcl command (pid ${owner}) has been changing ${project} for ${Math.round(timeoutMs / 1000)} s.`,
      )
    if (!told && owner !== undefined) {
      onWait?.(owner)
      told = true
    }
    await delay(pollMs)
  }

  try {
    return await fn()
  } finally {
    if (ownerOf(file) === process.pid) rmSync(file, { force: true })
  }
}
