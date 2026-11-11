/**
 * The `@molecule/*` packages a manifest must declare NEXT TO the ones it already
 * declares: the registry `moleculePeers` + `defaultProvider` closure.
 *
 * Every scaffold installs with `--legacy-peer-deps` (the project's `.npmrc`),
 * which installs no peers, so a package declared without its required peers is
 * absent from `node_modules` everywhere but a workspace that hoists the fleet —
 * the app builds in the sandbox and fails to resolve an import once it is
 * installed anywhere else. Anything that declares a `@molecule/*` package
 * (`mlcl create`, the activity-capture step, `mlcl add`, a platform export of a
 * project whose manifest was edited by hand) closes over this.
 *
 * Kept free of the scaffold module graph so a host process (molecule.dev's
 * project export) can load it on its own.
 *
 * @module
 */

import { getMoleculeVersion, loadRegistry } from './registry.js'
import type { InferredPackage } from './schema.js'

/**
 * The `@molecule/*` packages a dependency set is missing from its registry
 * `moleculePeers` + `defaultProvider` closure.
 *
 * A core's default provider counts only when nothing in the set already
 * implements that core (same rule as `resolveDefaultProviders` in `./features.ts`):
 * an app on SQLite must not also get Postgres.
 *
 * @param names - The declared dependency names (non-`@molecule` names are ignored).
 * @param registryPackages - The registry by name; read from `registry.json` when omitted.
 * @returns The missing package names, in discovery order.
 */
export function missingMoleculePeers(
  names: Iterable<string>,
  registryPackages: Map<string, InferredPackage> = new Map(loadRegistry().map((p) => [p.name, p])),
): string[] {
  const have = new Set([...names].filter((d) => d.startsWith('@molecule/')))
  const queue = [...have]
  const missing: string[] = []
  while (queue.length > 0) {
    const name = queue.shift()!
    const entry = registryPackages.get(name)
    if (!entry) continue
    // A core's default bond only when nothing in the manifest already provides
    // its category: an app on SQLite also got Postgres, and its bond index then
    // wired both database providers (X1 run sol-m08 read that as a broken
    // scaffold and rewrote every migration).
    const provided = [...have].some((n) => {
      const m = registryPackages.get(n)?.molecule
      return m?.implements === name && m.type !== 'framework'
    })
    const next = [
      ...(entry.molecule?.moleculePeers ?? []),
      ...(entry.molecule?.defaultProvider && !provided ? [entry.molecule.defaultProvider] : []),
    ]
    for (const peer of next) {
      if (have.has(peer) || !registryPackages.has(peer)) continue
      have.add(peer)
      queue.push(peer)
      missing.push(peer)
    }
  }
  return missing
}

/** A `package.json`, as far as the closure reads and writes it. */
export interface MoleculePeerManifest {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  [field: string]: unknown
}

/**
 * Declare a manifest's missing `@molecule/*` peers in its `dependencies`, at the
 * registry pins (exact versions), keeping `dependencies` sorted. A peer already
 * declared in either dependency map is never declared again.
 *
 * @param manifest - The parsed `package.json`; changed in place.
 * @returns The names added (empty when the manifest was already closed).
 */
export function closeMoleculePeers(manifest: MoleculePeerManifest): string[] {
  const missing = missingMoleculePeers([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ])
  if (missing.length === 0) return []
  const deps = { ...manifest.dependencies }
  for (const name of missing) deps[name] = getMoleculeVersion(name)
  manifest.dependencies = Object.fromEntries(
    Object.entries(deps).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  )
  return missing
}
