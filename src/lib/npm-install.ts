/**
 * `npm install` the way every mlcl command runs it.
 *
 * mlcl captures npm's output and prints only whether the install worked, so npm's audit report
 * and funding notice reach nobody. The audit still cost the most of any install phase: it runs
 * beside the download, resolves each advisory's dependents through full packuments, and
 * finishes last. A cold `mlcl create` waited 12.6 s of its 47 s install for it (npm's timing log,
 * 2026-11-23). A project keeps its own `npm audit`: the scaffold's security workflow runs it.
 *
 * @module
 */

import { execa } from 'execa'

import { decideBeforeInstall, pruneUnusedEntries } from './install-scripts.js'
import { NPM_DIAGNOSTICS } from './npm-diagnostics.js'

/** How one install runs. */
export interface NpmInstallOptions {
  /**
   * Use cached package metadata without asking the registry again: for an install seconds after
   * one that filled the cache, which then fetches only what it has not seen.
   */
  preferOffline?: boolean
  /**
   * The project's whole tree is mlcl's to decide: one it just created. Without it, the packages
   * its lock already holds get no `allowScripts` decision.
   */
  wholeTree?: boolean
}

/**
 * The arguments mlcl passes to `npm`.
 *
 * @param options - How the install runs.
 * @returns `install` and its flags.
 */
export function npmInstallArgs({ preferOffline = false }: NpmInstallOptions = {}): string[] {
  return [
    'install',
    '--no-audit',
    '--no-fund',
    NPM_DIAGNOSTICS,
    ...(preferOffline ? ['--prefer-offline'] : []),
  ]
}

/**
 * Run `npm install` in a directory, with npm's output captured.
 *
 * Every package the registry decides gets its `allowScripts` entry before npm runs
 * (`install-scripts.ts`), so npm neither runs a script the registry turned off (better-sqlite3's
 * `node-gyp rebuild`) nor warns about one; the entries for packages the install did not bring
 * come back out after it, done or failed. An approved package that was already installed, its
 * script skipped, runs it through `npm rebuild`. In a project mlcl did not just create
 * (`wholeTree` unset), the packages its lock already holds get no entry.
 *
 * @param cwd - Where npm runs: the project, or its npm workspace root (`npmInstallRoot`).
 * @param options - How the install runs.
 */
export async function npmInstall(cwd: string, options: NpmInstallOptions = {}): Promise<void> {
  await npmInstallWithDecisions(cwd, npmInstallArgs(options), options.wholeTree === true)
}

/**
 * Install one package spec into a directory that holds nothing else, as `mlcl setup` installs
 * the MCP server for the whole machine (`mcp-machine-install.ts`).
 *
 * @param cwd - The directory; it needs a package.json of its own, or npm installs into the
 *   nearest project above it.
 * @param spec - The package and its exact version (`molecule-mcp@0.3.6`).
 */
export async function npmInstallPackage(cwd: string, spec: string): Promise<void> {
  await npmInstallWithDecisions(cwd, [...npmInstallArgs(), spec], true)
}

/**
 * npm's progress, trace and environment lines inside its error output: none says why the install
 * failed.
 */
const NPM_ERROR_NOISE =
  /\bgyp (?:info|http|WARN|verb|sill)\b|\bgyp ERR! (?:System|command|cwd|node -v|node-gyp -v|not ok)\b|\bat .+:\d+:\d+\)?$|complete log of this run|[\\/]_logs[\\/]/

/** At most this many lines of npm's error output reach the caller. */
const NPM_ERROR_LINES = 12

/**
 * Why `npm install` failed, from its execa error: npm's own `npm error` lines (`npm ERR!` before
 * npm 9), without its progress and stack lines and the pointer to its log.
 *
 * mlcl captures npm's output, so an agent told only "npm install failed" read npm's debug logs to
 * find the reason: a node-gyp build of better-sqlite3 that could not fetch Node's headers (harness
 * eval scaffold, 2026-11-25, Codex, 2 runs).
 *
 * @param error - The thrown value: an execa error (`stderr`, `shortMessage`), or any value.
 * @returns The reason, one line per line, at most twelve; the error's first line when npm wrote
 *   none.
 */
export function npmFailureDetail(error: unknown): string {
  const e = (typeof error === 'object' && error !== null ? error : {}) as {
    stderr?: unknown
    shortMessage?: unknown
    message?: unknown
  }
  const stderr = typeof e.stderr === 'string' ? e.stderr : ''
  const lines = stderr
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => /^npm (?:error|ERR!) \S/.test(line) && !NPM_ERROR_NOISE.test(line))
  if (lines.length > 0) return lines.slice(0, NPM_ERROR_LINES).join('\n')
  return (String(e.shortMessage ?? e.message ?? error).split('\n')[0] ?? '').trim()
}

async function npmInstallWithDecisions(
  cwd: string,
  args: string[],
  wholeTree: boolean,
): Promise<void> {
  const { written, skipped } = decideBeforeInstall(cwd, { wholeTree })
  let removed: string[] = []
  try {
    await execa('npm', args, { cwd, stdio: 'pipe' })
  } finally {
    removed = pruneUnusedEntries(cwd, written)
  }
  const rebuild = skipped.filter((name) => !removed.includes(name))
  if (rebuild.length)
    await execa('npm', ['rebuild', ...rebuild, NPM_DIAGNOSTICS], { cwd, stdio: 'pipe' })
}
