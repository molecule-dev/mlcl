/**
 * Write the registry's install-script decisions into a project's `allowScripts`.
 *
 * npm 11.20 and later skip every dependency install script that the root package.json's
 * `allowScripts` does not name, and end the install with a warning listing them. mlcl captures
 * npm's output, so an agent found the warning only in npm's log and spent turns deciding whether
 * bcrypt and esbuild had to compile (they do not: their tarballs ship the binaries). The registry
 * records, per third-party package, whether its script must run (`installScripts`); the packages
 * of the project's lock that have a script and a decision get one `allowScripts` entry each, by
 * name. An entry already there, for the name or a version of it, is the user's and stays. A package
 * with no decision is left to npm and its warning. In a project mlcl did not just create, only the
 * packages an install adds get one: the app's own dependencies are the user's to decide.
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
 * The names in a lock whose installed copy has an install script.
 *
 * @param root - The npm root (the project, or its workspace root).
 * @param lock - The lock entries to read instead of the root's package-lock.json.
 * @returns Package names, deduplicated.
 */
export function lockedWithScripts(root: string, lock?: LockPackages): Set<string> {
  const file = join(root, 'package-lock.json')
  const names = new Set<string>()
  if (!lock && !existsSync(file)) return names
  const packages =
    lock ?? (JSON.parse(readFileSync(file, 'utf8')) as { packages?: LockPackages }).packages ?? {}
  for (const [key, entry] of Object.entries(packages)) {
    const at = key.lastIndexOf('node_modules/')
    if (at < 0 || !(entry as { hasInstallScript?: boolean }).hasInstallScript) continue
    names.add(key.slice(at + 'node_modules/'.length))
  }
  return names
}

/**
 * Give each package of the project's lock that has an install script and a registry decision an
 * `allowScripts` entry in the root package.json.
 *
 * @param root - The npm root, where `package.json` and `package-lock.json` are.
 * @param options - Options.
 * @param options.decisions - Decisions by package name (default: the registry's).
 * @param options.lock - Lock entries to read instead of the root's package-lock.json: a project
 *   created without an install, whose tree is the shipped starter lock's.
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
    except,
  }: {
    decisions?: Record<string, { run: boolean }>
    lock?: LockPackages
    except?: ReadonlySet<string>
  } = {},
): InstallScriptEntries {
  const manifestPath = join(root, 'package.json')
  if (!existsSync(manifestPath)) return { written: [], skipped: [] }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown> & {
    allowScripts?: Record<string, boolean>
  }
  const allow = { ...manifest.allowScripts }
  const decided = (name: string): boolean =>
    Object.keys(allow).some((key) => key === name || key.startsWith(`${name}@`))
  const written: string[] = []
  for (const name of [...lockedWithScripts(root, lock)].sort()) {
    const decision = decisions[name]
    if (!decision || decided(name) || except?.has(name)) continue
    allow[name] = decision.run
    written.push(name)
  }
  if (written.length === 0) return { written, skipped: [] }
  writeFileSync(
    manifestPath,
    `${JSON.stringify({ ...manifest, allowScripts: sortKeys(allow) }, null, 2)}\n`,
  )
  const skipped = written.filter(
    (name) => decisions[name]?.run && existsSync(join(root, 'node_modules', name, 'package.json')),
  )
  return { written, skipped }
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
