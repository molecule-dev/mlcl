/**
 * Decides whether a source checkout needs to rebuild before loading the CLI.
 * This lives beside `run.js` so it can run before loading `dist/`.
 * A published install has no `src/`, so its compiled CLI is ready to use.
 *
 * @module
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/** Written by `scripts/build.mjs`: the time the compile that produced `dist/` started (ms). */
export const BUILD_STAMP = '.build-started'

/**
 * When the build in `root/dist` started: its stamp, else its entry file's mtime.
 *
 * @param {string} root - The mlcl package root.
 * @returns {number | null} Milliseconds since the epoch, or null when there is no build.
 */
function builtAt(root) {
  const stamp = join(root, 'dist', BUILD_STAMP)
  try {
    const value = Number(readFileSync(stamp, 'utf8').trim())
    if (Number.isFinite(value)) return value
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  return statSync(join(root, 'dist', 'index.js'), { throwIfNoEntry: false })?.mtimeMs ?? null
}

/**
 * The newest compiled source file under `dir`: `.ts` files outside `__tests__`.
 *
 * @param {string} dir - A directory under `src/`.
 * @param {{ path: string, mtimeMs: number } | null} newest - The newest found so far.
 * @returns {{ path: string, mtimeMs: number } | null} The newest file.
 */
function newestSource(dir, newest) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch (error) {
    // An editor can remove or rename a directory while the source is being scanned.
    if (error.code === 'ENOENT') return newest
    throw error
  }
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') newest = newestSource(path, newest)
    } else if (entry.name.endsWith('.ts')) {
      const stat = statSync(path, { throwIfNoEntry: false })
      if (stat && (!newest || stat.mtimeMs > newest.mtimeMs))
        newest = { path, mtimeMs: stat.mtimeMs }
    }
  }
  return newest
}

/**
 * The reason a checkout needs to build, or null if it can use its compiled CLI.
 *
 * @param {string} root - The mlcl package root (the directory holding `bin/`).
 * @returns {string | null} One line describing the missing or stale build.
 */
export function staleBuildWarning(root) {
  const src = join(root, 'src')
  if (!existsSync(src)) return null
  const built = builtAt(root)
  if (built === null) return 'dist/ has no compiled CLI'
  const newest = newestSource(src, null)
  if (!newest || newest.mtimeMs <= built) return null
  return (
    `${relative(root, newest.path)} changed at ${new Date(newest.mtimeMs).toISOString()}, ` +
    `after dist/ was built (${new Date(built).toISOString()})`
  )
}
