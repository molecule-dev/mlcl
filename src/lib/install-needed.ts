/**
 * Whether `mlcl inject` still has to run `npm install` once its writes have landed.
 *
 * `mlcl add --inject` installs the package, then inject runs its own deferred install. When the
 * inject added no dependency (the usual case: add already declared the package and its peers),
 * that second install found nothing to do and still cost a few seconds of npm start-up and
 * tree reading on every add (harness eval `add`, 2026-11-24: 0.3 s alone, several seconds on a
 * loaded machine). The install is skipped only when nothing it reads has changed since the
 * command started and every declared dependency is already installed at its exact pin; any
 * doubt (a range, a tag, a `file:` spec, an optional dependency, a missing copy) installs.
 *
 * @module
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { npmInstallRoot } from './npm-install-root.js'

/** The manifest fields an `npm install` reads to decide what to install. */
const INSTALL_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
  'overrides',
  'workspaces',
] as const

/** An exact version, the only spec an installed copy can be checked against without npm. */
const EXACT = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

/** The manifests npm reads for an install from `dir`: its own and its workspace root's. */
function manifestsOf(dir: string): string[] {
  const root = npmInstallRoot(dir)
  return [...new Set([join(dir, 'package.json'), join(root, 'package.json')])]
}

/**
 * What an install from `dir` reads, as one string to compare before and after a change.
 *
 * @param dir - The workspace a command installs from.
 * @returns The install-relevant fields of its manifest and its workspace root's.
 */
export function installInputs(dir: string): string {
  return JSON.stringify(
    manifestsOf(dir).map((file) => {
      if (!existsSync(file)) return null
      const manifest = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
      return INSTALL_FIELDS.map((field) => manifest[field] ?? null)
    }),
  )
}

/** The version of the copy of `name` that Node resolves from `dir`, if any. */
function installedVersion(dir: string, name: string): string | undefined {
  for (let at = dir; ; at = dirname(at)) {
    const manifest = join(at, 'node_modules', name, 'package.json')
    if (existsSync(manifest)) {
      const { version } = JSON.parse(readFileSync(manifest, 'utf8')) as { version?: unknown }
      return typeof version === 'string' ? version : undefined
    }
    if (dirname(at) === at) return undefined
  }
}

/**
 * Whether every dependency the manifests of `dir` declare is installed at its exact pin.
 *
 * @param dir - The workspace a command installs from.
 * @returns True only when an install would have nothing to add or change.
 */
export function installedAsDeclared(dir: string): boolean {
  for (const file of manifestsOf(dir)) {
    if (!existsSync(file)) return false
    const manifest = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
    if (manifest.optionalDependencies && Object.keys(manifest.optionalDependencies).length > 0)
      return false
    for (const field of ['dependencies', 'devDependencies'] as const) {
      const declared = (manifest[field] ?? {}) as Record<string, unknown>
      for (const [name, spec] of Object.entries(declared)) {
        if (typeof spec !== 'string' || !EXACT.test(spec)) return false
        if (installedVersion(dirname(file), name) !== spec) return false
      }
    }
  }
  return true
}
