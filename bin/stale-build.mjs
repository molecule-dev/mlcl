/**
 * Names a source file edited after the compiled CLI was built, in a source checkout.
 *
 * `bin/run.js` runs `dist/`, and nothing rebuilds it when `src/` changes: on 2026-11-20 a
 * scaffold commit that added a `{{FRAMEWORK_CONFIG}}` placeholder left a dist that never filled
 * it, and every local `mlcl create` wrote a vite.config.ts Prettier could not parse for six hours.
 * A published install has no `src/`, so this does nothing there. Plain JavaScript beside
 * `run.js`, not in `dist/`, so a stale or missing build cannot break the check itself.
 *
 * @module
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

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
  if (existsSync(stamp)) {
    const value = Number(readFileSync(stamp, 'utf8').trim())
    if (Number.isFinite(value)) return value
  }
  const entry = join(root, 'dist', 'index.js')
  return existsSync(entry) ? statSync(entry).mtimeMs : null
}

/**
 * The newest compiled source file under `dir`: `.ts` files outside `__tests__`.
 *
 * @param {string} dir - A directory under `src/`.
 * @param {{ path: string, mtimeMs: number } | null} newest - The newest found so far.
 * @returns {{ path: string, mtimeMs: number } | null} The newest file.
 */
function newestSource(dir, newest) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') newest = newestSource(path, newest)
    } else if (entry.name.endsWith('.ts')) {
      const { mtimeMs } = statSync(path)
      if (!newest || mtimeMs > newest.mtimeMs) newest = { path, mtimeMs }
    }
  }
  return newest
}

/**
 * The warning to print when a source file changed after `dist/` was built, else null.
 *
 * @param {string} root - The mlcl package root (the directory holding `bin/`).
 * @returns {string | null} One line naming the newest changed file and the rebuild command.
 */
export function staleBuildWarning(root) {
  const src = join(root, 'src')
  if (!existsSync(src)) return null
  const built = builtAt(root)
  if (built === null) return null
  const newest = newestSource(src, null)
  if (!newest || newest.mtimeMs <= built) return null
  return (
    `mlcl: ${relative(root, newest.path)} changed at ${new Date(newest.mtimeMs).toISOString()}, ` +
    `after dist/ was built (${new Date(built).toISOString()}); this run uses the old build. ` +
    `Rebuild: cd ${resolve(root)} && npm run build`
  )
}
