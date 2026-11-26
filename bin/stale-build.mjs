/**
 * Decides whether a source checkout needs to rebuild before loading the CLI.
 * This lives beside `run.js` so it can run before loading `dist/`.
 * A published install has no `src/`, so its compiled CLI is ready to use.
 *
 * @module
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

/** Written by `scripts/build.mjs`: the time the compile that produced `dist/` started (ms). */
export const BUILD_STAMP = '.build-started'

/** Written by `scripts/build.mjs` into the `dist/` it kept when a compile failed: that compile's inputs. */
export const FAILED_BUILD = '.build-failed'

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
 * Scans the compiled source files under `dir`: `.ts` files outside `__tests__`.
 *
 * @param {string} dir - A directory under `src/`.
 * @param {{ newest: { path: string, mtimeMs: number } | null, files: number }} state - Updated in place.
 * @returns {{ newest: { path: string, mtimeMs: number } | null, files: number }} The newest file and the count.
 */
function scanSources(dir, state = { newest: null, files: 0 }) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch (error) {
    // An editor can remove or rename a directory while the source is being scanned.
    if (error.code === 'ENOENT') return state
    throw error
  }
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') scanSources(path, state)
    } else if (entry.name.endsWith('.ts')) {
      const stat = statSync(path, { throwIfNoEntry: false })
      if (!stat) continue
      state.files++
      if (!state.newest || stat.mtimeMs > state.newest.mtimeMs)
        state.newest = { path, mtimeMs: stat.mtimeMs }
    }
  }
  return state
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
  const { newest } = scanSources(src)
  if (!newest || newest.mtimeMs <= built) return null
  return (
    `${relative(root, newest.path)} changed at ${new Date(newest.mtimeMs).toISOString()}, ` +
    `after dist/ was built (${new Date(built).toISOString()})`
  )
}

/**
 * Everything a compile reads besides the compiler: the newest source file and the number of source
 * files, the package manifest and tsconfig, and each installed tree Node resolves from (npm rewrites
 * `node_modules/.package-lock.json` on every install). A failed compile is retried only once one of
 * these changes, so a checkout that does not compile costs one attempt, not one per command.
 *
 * @param {string} root - The mlcl package root.
 * @returns {string} The inputs, as a comparable string.
 */
export function buildInputs(root) {
  const mtime = (path) => statSync(path, { throwIfNoEntry: false })?.mtimeMs ?? null
  const { newest, files } = scanSources(join(root, 'src'))
  const installs = []
  for (let dir = resolve(root); ; dir = dirname(dir)) {
    const lock = join(dir, 'node_modules', '.package-lock.json')
    const at = mtime(lock)
    if (at !== null) installs.push([lock, at])
    if (dirname(dir) === dir) break
  }
  return JSON.stringify({
    source: newest && [relative(root, newest.path), newest.mtimeMs],
    files,
    config: ['package.json', 'tsconfig.json'].map((name) => mtime(join(root, name))),
    installs,
  })
}

/**
 * The failed compile recorded in `dist/` for the checkout's current inputs, or null when there is
 * none or the inputs have changed since.
 *
 * @param {string} root - The mlcl package root.
 * @returns {{ inputs: string, status: number } | null} The recorded failure.
 */
export function lastFailedBuild(root) {
  let failure
  try {
    failure = JSON.parse(readFileSync(join(root, 'dist', FAILED_BUILD), 'utf8'))
  } catch (error) {
    // Absent, or caught half-written by a concurrent builder: compile again.
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return null
    throw error
  }
  return failure?.inputs === buildInputs(root) ? failure : null
}
