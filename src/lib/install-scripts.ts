/**
 * Write the registry's install-script decisions into a project's `allowScripts`.
 *
 * npm 11.20 reads the root package.json's `allowScripts`: a dependency whose entry is `false`
 * never runs its install script, and one with no entry runs it and is listed in a notice at the end
 * of the install (`strict-allow-scripts`, off by default, makes that an error). mlcl captures npm's
 * output, so an agent found the notice only in npm's log and spent turns deciding whether bcrypt
 * and esbuild had to compile (they do not: their tarballs ship the binaries). The registry records,
 * per third-party package, whether its script must run (`installScripts`); each of them in the
 * project's tree gets one `allowScripts` entry, by name. An entry already there, for the name or a
 * version of it, is the user's and stays. A package with no decision is left to npm.
 *
 * The decision has to be in place BEFORE the install that adds the package, and a lock entry's
 * `hasInstallScript` does not say whether npm will run a script. better-sqlite3 ships its binaries
 * in `prebuilds/` and opts out of npm's automatic `node-gyp rebuild` with `gypfile: false`, so its
 * lock entry has no `hasInstallScript`; but an install from a lock reads the package from the lock
 * entry, which does not carry `gypfile`, finds the `binding.gyp` on disk and compiles SQLite all
 * the same (`@npmcli/arborist` rebuild.js). Every SQLite create from mlcl's starter lock compiled
 * it, fetching Node's headers from nodejs.org, and failed where that host was unreachable (harness
 * eval scaffold, 2026-11-25, Codex, 2 of 5 runs, which then spent minutes rebuilding it by hand).
 * So a lock's packages are decided by name whatever their entry says, and before an install mlcl
 * runs ({@link decideBeforeInstall}) every package the registry decides gets its entry; the ones
 * the install did not bring are taken back out after it. In a project mlcl did not just create,
 * the packages its lock already holds are left alone: the app's own dependencies are the user's
 * to decide.
 *
 * @module
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { loadInstallScriptDecisions } from './registry.js'

/** What one pass wrote. */
export interface InstallScriptEntries {
  /** Names given an `allowScripts` entry, sorted. */
  written: string[]
  /** Of those, the ones approved (`true`) that are already installed: their script was skipped. */
  skipped: string[]
}

/** A lockfile's `packages` map: install path → entry. */
export type LockPackages = Record<string, unknown>

/**
 * The package names a lock holds, at any depth.
 *
 * @param root - The npm root (the project, or its workspace root).
 * @param lock - The lock entries to read instead of the root's package-lock.json.
 * @returns Package names, deduplicated.
 */
export function lockedNames(root: string, lock?: LockPackages): Set<string> {
  const file = join(root, 'package-lock.json')
  const names = new Set<string>()
  if (!lock && !existsSync(file)) return names
  const packages =
    lock ?? (JSON.parse(readFileSync(file, 'utf8')) as { packages?: LockPackages }).packages ?? {}
  for (const key of Object.keys(packages)) {
    const at = key.lastIndexOf('node_modules/')
    if (at >= 0) names.add(key.slice(at + 'node_modules/'.length))
  }
  return names
}

/**
 * Give each package of the project's lock that the registry decides an `allowScripts` entry in the
 * root package.json, whether or not its lock entry says it has a script.
 *
 * @param root - The npm root, where `package.json` and `package-lock.json` are.
 * @param options - Options.
 * @param options.decisions - Decisions by package name (default: the registry's).
 * @param options.lock - Lock entries to read instead of the root's package-lock.json: a project
 *   created without an install, whose tree is the shipped starter lock's.
 * @param options.names - The names to decide instead of the lock's: every decided name, before an
 *   install ({@link decideBeforeInstall}).
 * @param options.except - Names to leave alone: those the lock had before an install into an app
 *   mlcl did not just create (`mlcl add` gave an Express app's own esbuild a decision, and Codex
 *   spent a reinstall taking it back out: harness eval `add`, 2026-11-25).
 * @returns The names written, and the approved ones whose installed copy skipped its script.
 */
export function writeInstallScriptEntries(
  root: string,
  {
    decisions = loadInstallScriptDecisions(),
    lock,
    names,
    except,
  }: {
    decisions?: Record<string, { run: boolean }>
    lock?: LockPackages
    names?: Iterable<string>
    except?: ReadonlySet<string>
  } = {},
): InstallScriptEntries {
  const manifestPath = join(root, 'package.json')
  if (!existsSync(manifestPath)) return { written: [], skipped: [] }
  const manifest = readManifest(manifestPath)
  const allow = { ...manifest.allowScripts }
  const decided = (name: string): boolean =>
    Object.keys(allow).some((key) => key === name || key.startsWith(`${name}@`))
  const written: string[] = []
  for (const name of [...new Set(names ?? lockedNames(root, lock))].sort()) {
    const decision = decisions[name]
    if (!decision || decided(name) || except?.has(name)) continue
    allow[name] = decision.run
    written.push(name)
  }
  if (written.length === 0) return { written, skipped: [] }
  writeManifest(manifestPath, { ...manifest, allowScripts: sortKeys(allow) })
  const skipped = written.filter(
    (name) => decisions[name]?.run && existsSync(join(root, 'node_modules', name, 'package.json')),
  )
  return { written, skipped }
}

/**
 * Before an install mlcl runs: give every package the registry decides its `allowScripts` entry,
 * so the install never runs a script the registry turned off, whichever of them it brings. Call
 * {@link pruneUnusedEntries} with the result once the install ends, done or failed.
 *
 * @param root - The npm root, where `package.json` and `package-lock.json` are.
 * @param options - Options.
 * @param options.decisions - Decisions by package name (default: the registry's).
 * @param options.wholeTree - The whole tree is mlcl's to decide: a project it just created. Without
 *   it, the packages the lock already holds are the app's own and get no entry.
 * @returns The names written, and the approved ones whose installed copy skipped its script.
 */
export function decideBeforeInstall(
  root: string,
  {
    decisions = loadInstallScriptDecisions(),
    wholeTree = false,
  }: { decisions?: Record<string, { run: boolean }>; wholeTree?: boolean } = {},
): InstallScriptEntries {
  return writeInstallScriptEntries(root, {
    decisions,
    names: Object.keys(decisions),
    except: wholeTree ? undefined : lockedNames(root),
  })
}

/**
 * After an install: take back out the entries {@link decideBeforeInstall} wrote for packages the
 * install did not bring, read from the lock it wrote. An entry for a package the lock holds stays
 * even when its lock entry names no script: a later `npm ci` from that lock would otherwise
 * compile better-sqlite3.
 *
 * @param root - The npm root, where `package.json` and `package-lock.json` are.
 * @param written - The names {@link decideBeforeInstall} wrote.
 * @returns The names removed, sorted.
 */
export function pruneUnusedEntries(root: string, written: readonly string[]): string[] {
  const manifestPath = join(root, 'package.json')
  if (written.length === 0 || !existsSync(manifestPath)) return []
  const locked = lockedNames(root)
  const removed = written.filter((name) => !locked.has(name)).sort()
  if (removed.length === 0) return []
  const manifest = readManifest(manifestPath)
  const allow = { ...manifest.allowScripts }
  for (const name of removed) delete allow[name]
  const { allowScripts: _dropped, ...rest } = manifest
  writeManifest(
    manifestPath,
    Object.keys(allow).length ? { ...manifest, allowScripts: sortKeys(allow) } : rest,
  )
  return removed
}

/** A root package.json, as this module reads it. */
type Manifest = Record<string, unknown> & { allowScripts?: Record<string, boolean> }

/**
 * Read a package.json.
 *
 * @param path - The file.
 * @returns Its content.
 */
function readManifest(path: string): Manifest {
  return JSON.parse(readFileSync(path, 'utf8')) as Manifest
}

/**
 * Write a package.json as npm formats it.
 *
 * @param path - The file.
 * @param manifest - The content.
 */
function writeManifest(path: string, manifest: Manifest): void {
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`)
}

/**
 * The packages whose install script the project's `allowScripts` keeps off as the registry decided
 * (`false`, by name). A reader seeing `"better-sqlite3": false` took the SQLite driver for unbuilt
 * and spent up to 50 s proving it loads (harness eval scaffold, 2026-11-25, Codex, 3 of 5 runs):
 * create's closing output names them and says none needs its script.
 *
 * @param root - The npm root, where `package.json` is.
 * @param decisions - Decisions by package name (default: the registry's).
 * @returns The names, sorted.
 */
export function installScriptsOff(
  root: string,
  decisions: Record<string, { run: boolean }> = loadInstallScriptDecisions(),
): string[] {
  let allowScripts: Record<string, boolean>
  try {
    allowScripts =
      (
        JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
          allowScripts?: Record<string, boolean>
        } | null
      )?.allowScripts ?? {}
  } catch (_error) {
    // No package.json, or one that does not parse: nothing to explain, and create's closing output
    // must not fail on it.
    return []
  }
  const names = Object.entries(allowScripts)
    .filter(([key, run]) => run === false && decisions[allowScriptsName(key)]?.run === false)
    .map(([key]) => allowScriptsName(key))
  return [...new Set(names)].sort()
}

/**
 * The package an `allowScripts` key names: the key itself, or the name of a `name@version` key.
 *
 * @param key - The key (`bcrypt`, `bcrypt@6.0.0`, `@parcel/watcher@2.5.1`).
 * @returns The package name.
 */
function allowScriptsName(key: string): string {
  const at = key.indexOf('@', 1)
  return at === -1 ? key : key.slice(0, at)
}

/**
 * The entries in name order, as `npm install-scripts` writes them.
 *
 * @param entries - `allowScripts` entries.
 * @returns The same entries, sorted by key.
 */
function sortKeys(entries: Record<string, boolean>): Record<string, boolean> {
  return Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)))
}
