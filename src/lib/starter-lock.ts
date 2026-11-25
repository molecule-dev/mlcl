/**
 * The lockfile a custom scaffold installs from.
 *
 * A new project has no lock, so its first `npm install` resolves several hundred packages from
 * nothing: on a cold cache that is most of `mlcl create`'s time (90 s of 108 s measured, nearly all
 * of it fetching package metadata). mlcl ships one resolved lock per app framework, made from a
 * full-stack scaffold of a common stack (`scripts/generate-starter-locks.mjs`), and create writes
 * it as the project's `package-lock.json` before the install. npm checks a lock against the
 * manifests: it keeps the entries the project uses, prunes the rest and resolves only what the
 * stack names beyond the lock, so a stack that differs from the one the lock was made from costs a
 * little time and never a wrong tree.
 *
 * Only the lock's `node_modules/*` entries ship; npm adds the root and workspace entries. Their
 * sources name registry.npmjs.org, which npm rewrites to the configured registry
 * (`replace-registry-host`). Yarn, pnpm and Bun do not read the file.
 *
 * @module
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Where the shipped locks live: `<mlcl>/locks/<framework>.json`. `MLCL_STARTER_LOCK_DIR` names
 * another directory; the generator points it at an empty one, so a regenerated lock resolves every
 * version fresh instead of keeping the shipped one's.
 */
export const STARTER_LOCK_DIR =
  process.env.MLCL_STARTER_LOCK_DIR ??
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'locks')

/** The framework whose lock an API-only project installs from (its app entries are pruned). */
export const API_STARTER_LOCK_FRAMEWORK = 'react'

/** A shipped lock: the `packages` section of a lockfile v3, `node_modules/*` entries only. */
export interface StarterLock {
  /** How the lock was made: the stack and the registry pins it was resolved at. */
  generatedFrom: { packages: string[]; moleculeVersions: Record<string, string> }
  /** Lockfile v3 `packages` entries keyed by install path (`node_modules/express`). */
  packages: Record<string, Record<string, unknown>>
}

/**
 * The shipped lock for a framework, or null when mlcl has none for it.
 *
 * @param framework - The app framework (`react`), or undefined for an API-only project.
 * @param dir - Where the locks are (tests).
 * @returns The lock, or null.
 */
export function readStarterLock(
  framework: string | undefined,
  dir: string = STARTER_LOCK_DIR,
): StarterLock | null {
  const file = join(dir, `${framework ?? API_STARTER_LOCK_FRAMEWORK}.json`)
  if (!existsSync(file)) return null
  return JSON.parse(readFileSync(file, 'utf8')) as StarterLock
}

/**
 * Put the framework's shipped lock entries into the project's `package-lock.json`: the whole lock
 * when the project has none, else each shipped entry whose install path the lock lacks.
 *
 * The second case is create's later install. The first install prunes the entries of packages the
 * manifests do not declare yet (inject and the peer closure declare more after it), and without
 * them npm would resolve those packages from nothing again.
 *
 * @param projectPath - The project root (where `npm install` runs).
 * @param framework - The app framework, or undefined for an API-only project.
 * @param dir - Where the locks are (tests).
 * @returns How many entries were added (0 when mlcl ships no lock for the framework).
 */
export function applyStarterLock(
  projectPath: string,
  framework: string | undefined,
  dir: string = STARTER_LOCK_DIR,
): number {
  const lock = readStarterLock(framework, dir)
  if (!lock) return 0
  const target = join(projectPath, 'package-lock.json')
  if (!existsSync(target)) {
    const manifest = JSON.parse(readFileSync(join(projectPath, 'package.json'), 'utf8')) as {
      name?: string
      version?: string
    }
    const lockfile = {
      name: manifest.name,
      ...(manifest.version ? { version: manifest.version } : {}),
      lockfileVersion: 3,
      requires: true,
      packages: lock.packages,
    }
    writeFileSync(target, `${JSON.stringify(lockfile, null, 2)}\n`)
    return Object.keys(lock.packages).length
  }
  const current = JSON.parse(readFileSync(target, 'utf8')) as Record<string, unknown> & {
    packages?: Record<string, unknown>
  }
  const packages = { ...current.packages }
  let added = 0
  for (const [key, entry] of Object.entries(lock.packages)) {
    if (key in packages) continue
    packages[key] = entry
    added++
  }
  if (added > 0) writeFileSync(target, `${JSON.stringify({ ...current, packages }, null, 2)}\n`)
  return added
}
