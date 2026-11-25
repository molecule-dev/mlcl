/**
 * One `mlcl check` at a time in a project.
 *
 * Two checks of one project compete for the same CPUs and the same files: both builds rewrite
 * `dist/`, both e2e runs start the dev servers on the same ports, and every test runs slower. In
 * the 2026-11-25 check eval, Codex started three checks of one project at once; a unit test that
 * imports the auth handlers timed out at vitest's 5 s, and the same check passed alone. A second
 * check (from the CLI, the MCP `check_project` tool, a Stop hook or `create`'s verification) now
 * waits for the first to finish, then runs.
 *
 * The lock is `node_modules/.cache/mlcl-check/running.pid`, created exclusively and holding the
 * holder's pid. A lock whose pid no longer runs (a check killed without its cleanup) is taken
 * over. Two checks that take over the same dead lock at the same instant can both run, as every
 * check did before.
 *
 * @module
 */

import { mkdir, open, readFile, stat, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/** The lock file, relative to the project root. */
export const CHECK_LOCK_FILE = join('node_modules', '.cache', 'mlcl-check', 'running.pid')

/** How long an empty lock (created, pid not yet written) may stay empty before it counts as dead. */
const EMPTY_LOCK_GRACE_MS = 5_000

/**
 * Whether a process runs.
 *
 * @param pid - The process id.
 * @returns True when it runs (or runs as another user).
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
 * Wait until no other check runs in the project, then hold the lock.
 *
 * @param root - The project root.
 * @param options - `signal` stops the wait; `onWait` is called once, with the holder's pid, when
 *   the check has to wait; `pollMs` is how often the lock is read again.
 * @returns A function that releases the lock.
 * @throws {Error} When `signal` aborts the wait.
 */
export async function acquireCheckLock(
  root: string,
  options: { signal?: AbortSignal; onWait?: (holder: number) => void; pollMs?: number } = {},
): Promise<() => Promise<void>> {
  const path = join(root, CHECK_LOCK_FILE)
  const pollMs = options.pollMs ?? 250
  await mkdir(dirname(path), { recursive: true })
  let told = false
  for (;;) {
    if (options.signal?.aborted)
      throw new Error('The check was cancelled while it waited for another check of this project.')
    try {
      const handle = await open(path, 'wx')
      await handle.writeFile(String(process.pid))
      await handle.close()
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    }
    const text = await readFile(path, 'utf8').catch(() => null)
    if (text === null) continue
    const holder = Number.parseInt(text, 10)
    const dead = Number.isInteger(holder)
      ? !running(holder)
      : Date.now() - ((await stat(path).catch(() => null))?.mtimeMs ?? 0) > EMPTY_LOCK_GRACE_MS
    if (dead) {
      await unlink(path).catch(() => undefined)
      continue
    }
    if (!told && Number.isInteger(holder)) {
      told = true
      options.onWait?.(holder)
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs))
  }
  return async () => {
    // Removed only while it is still this process's: a lock taken over as dead belongs to its taker.
    const text = await readFile(path, 'utf8').catch(() => null)
    if (text === String(process.pid)) await unlink(path).catch(() => undefined)
  }
}
