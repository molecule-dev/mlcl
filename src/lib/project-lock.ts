/**
 * One command at a time changes a project: `add`, `inject` and `swap` take this lock around
 * their writes and their `npm install`. In the harness eval `add` (2026-11-25) Claude called
 * `add_package` for an interface and its provider in parallel, and two `mlcl add` runs installed
 * into one project at once.
 *
 * The lock is `node_modules/.cache/mlcl/project.lock` in the directory npm installs into. Inside
 * the project, another account cannot create it first or plant a link where it is written (as it
 * could in a shared temp directory), one project has one lock however its path is spelled, and an
 * agent's sandbox that may write only the project can take it. The file holds the owner's pid and
 * is created whole by `link`, which fails when the file exists, so a waiter never reads a
 * half-written one (where links are not supported it is created with `wx`). While it holds the
 * lock the owner touches the file every 10 s; a waiter takes over a lock whose owner is no longer
 * running, or that nobody has touched for 90 s (a crashed owner whose pid now belongs to another
 * process, or a file that names no pid). The directories it had to create for the file (in a
 * project not installed yet, `node_modules` itself) are removed with it when they are empty, so a
 * command that installs nothing, or fails, leaves the project as it found it.
 *
 * A process re-enters a lock that names its own pid: `add --inject` runs `inject` in the same
 * process, and oclif may load that command from another copy of this module, so the lock file is
 * what says who holds it, not this module's memory.
 *
 * @module
 */

import {
  chmodSync,
  linkSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

/** Options for {@link withProjectLock}. */
export interface ProjectLockOptions {
  /** How often a waiter checks the lock, in ms (default 100). */
  pollMs?: number
  /** How long a waiter waits for a live owner before it gives up, in ms (default 10 minutes). */
  timeoutMs?: number
  /** How often the owner touches the lock file, in ms (default 10 s). */
  heartbeatMs?: number
  /** How long a lock nobody touched counts as held, in ms (default 90 s). */
  staleMs?: number
  /** Called once when the lock is held by another process, with that process's pid. */
  onWait?: (pid: number) => void
}

/** What a waiter reads of a lock file. */
interface LockState {
  owner: number | undefined
  inode: number
  touchedMs: number
}

/** Codes `link` fails with where the file system or a sandbox does not support hard links. */
const NO_LINKS = new Set(['EPERM', 'EACCES', 'ENOTSUP', 'EOPNOTSUPP', 'ENOSYS'])

/**
 * The lock file of a project.
 *
 * @param project - The directory npm installs into.
 * @returns Its path.
 */
export function projectLockPath(project: string): string {
  return join(resolve(project), 'node_modules', '.cache', 'mlcl', 'project.lock')
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
 * Read a lock file.
 *
 * @param file - The lock file.
 * @returns Its owner, inode and last touch, or undefined when there is none.
 */
function readLock(file: string): LockState | undefined {
  try {
    const stat = lstatSync(file)
    return { owner: ownerOf(file), inode: stat.ino, touchedMs: stat.mtimeMs }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
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
 * Whether a lock is abandoned: its owner is gone, or nobody touched it for `staleMs`.
 *
 * @param lock - The lock as read.
 * @param staleMs - How long an untouched lock counts as held.
 * @returns True when a waiter may remove it.
 */
function abandoned(lock: LockState, staleMs: number): boolean {
  if (Date.now() - lock.touchedMs > staleMs) return true
  return lock.owner !== undefined && !running(lock.owner)
}

/**
 * Make the lock directory. One that is a link, or another account's, is refused; one of this
 * user's that others can write to is made private.
 *
 * @param dir - The lock directory.
 * @returns The first directory this call created (it and those below it are new), if any.
 */
function ensurePrivateDir(dir: string): string | undefined {
  const created = mkdirSync(dir, { recursive: true, mode: 0o700 })
  const stat = lstatSync(dir)
  const uid = process.getuid?.()
  if (!stat.isDirectory() || (uid !== undefined && stat.uid !== uid))
    throw new Error(
      `${dir} is not a directory of your own, so mlcl will not keep its project lock there. Remove it and run the command again.`,
    )
  if (uid !== undefined && (stat.mode & 0o077) !== 0) chmodSync(dir, 0o700)
  return created
}

/**
 * Remove the directories a lock created, from the lock directory up, while they are empty: a
 * directory something else wrote to (an install, another lock) stays.
 *
 * @param dir - The lock directory.
 * @param created - The first directory the lock created.
 */
function removeCreatedDirs(dir: string, created: string): void {
  for (let current = dir; current.startsWith(created); current = dirname(current)) {
    try {
      rmdirSync(current)
    } catch (_error) {
      return
    }
    if (current === created) return
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
  // A file left by an earlier process with this pid goes first; `wx` creates a new file and never
  // follows a link at that name.
  rmSync(staged, { force: true })
  try {
    writeFileSync(staged, `${process.pid}\n`, { flag: 'wx' })
  } catch (error) {
    // The owner that just released removed the directory with its lock: make it again and retry.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
  try {
    linkSync(staged, file)
    return true
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? ''
    if (code === 'EEXIST') return false
    if (!NO_LINKS.has(code)) throw error
  } finally {
    unlinkSync(staged)
  }
  // No hard links here: create the lock itself. A waiter that reads it before the pid is written
  // finds a file touched just now, which counts as held.
  try {
    writeFileSync(file, `${process.pid}\n`, { flag: 'wx' })
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false
    throw error
  }
}

/**
 * Run `fn` while holding the project's lock, waiting for another process that holds it.
 *
 * @param project - The directory npm installs into (its install root, so a workspace and its root
 *   share one lock).
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
    pollMs = 100,
    timeoutMs = 10 * 60_000,
    heartbeatMs = 10_000,
    staleMs = 90_000,
    onWait,
  } = options
  const file = projectLockPath(project)
  // This process holds it already (an outer call): run inside that hold, and leave the file to it.
  if (ownerOf(file) === process.pid) return fn()

  const dir = dirname(file)
  const deadline = Date.now() + timeoutMs
  let told = false
  let tookOver = false
  let created: string | undefined
  for (;;) {
    const made = ensurePrivateDir(dir)
    if (made !== undefined && (created === undefined || made.length < created.length))
      created = made
    if (tryTake(file)) {
      if (!tookOver) break
      // Another waiter that read the same abandoned lock may have removed this one in the
      // meantime: hold it only if it still names this process a moment later.
      await delay(pollMs)
      if (ownerOf(file) === process.pid) break
      tookOver = false
      continue
    }
    const lock = readLock(file)
    if (!lock) continue
    if (abandoned(lock, staleMs)) {
      // Read it again just before removing it, so a lock another waiter took over in the meantime
      // (a new file) is left alone.
      const again = readLock(file)
      if (again && again.inode === lock.inode && abandoned(again, staleMs)) {
        rmSync(file, { force: true })
        tookOver = true
      }
      continue
    }
    if (Date.now() > deadline)
      throw new Error(
        `Another mlcl command (pid ${lock.owner ?? 'unknown'}) has been changing ${project} for ${Math.round(timeoutMs / 1000)} s.`,
      )
    if (!told && lock.owner !== undefined) {
      onWait?.(lock.owner)
      told = true
    }
    await delay(pollMs)
  }

  const heartbeat = setInterval(() => {
    try {
      const now = new Date()
      utimesSync(file, now, now)
    } catch (_error) {
      // The file is gone or unreadable: the release below sorts out whose it is.
    }
  }, heartbeatMs)
  heartbeat.unref()
  try {
    return await fn()
  } finally {
    clearInterval(heartbeat)
    if (ownerOf(file) === process.pid) rmSync(file, { force: true })
    if (created !== undefined) removeCreatedDirs(dir, created)
  }
}

/**
 * Run `fn` while holding the locks of several projects, taken in one order so two commands that
 * need the same ones never wait for each other.
 *
 * @param projects - The directories npm installs into; repeats are taken once.
 * @param fn - The work to do under the locks.
 * @param options - Options.
 * @returns What `fn` returns.
 */
export async function withProjectLocks<T>(
  projects: string[],
  fn: () => Promise<T>,
  options: ProjectLockOptions = {},
): Promise<T> {
  const [first, ...rest] = [...new Set(projects.map((project) => resolve(project)))].sort()
  if (first === undefined) return fn()
  return withProjectLock(first, () => withProjectLocks(rest, fn, options), options)
}
