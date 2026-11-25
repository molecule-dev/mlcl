/**
 * The packages only the scaffolds choose (`selection: 'scaffold-only'` in the registry): the bond
 * and server bundles the flagship templates call. A custom stack already has its server and bond
 * wiring, and naming a bundle installs every provider it wires (the Express bond bundle requires
 * 45 packages, from Stripe to S3), so `mlcl create --packages` and `mlcl add` refuse them by name
 * before anything is written. Templates and the scaffold still declare them.
 *
 * @module
 */

import { isOfferedPackage } from './package-search.js'
import { missingMoleculePeers } from './peer-closure.js'
import { getRawRegistry, loadRegistry } from './registry.js'
import type { InferredPackage } from './schema.js'

/**
 * The names in a caller's list that only the scaffolds choose.
 *
 * @param names - Scoped package names, as the caller gave them.
 * @param packages - Registry entries by name (default: the registry mlcl reads).
 * @returns Those names, in the caller's order.
 */
export function scaffoldOnlyNames(
  names: readonly string[],
  packages: Readonly<Record<string, { selection?: string } | undefined>> = getRawRegistry()
    .packages,
): string[] {
  return names.filter((name) => packages[name]?.selection === 'scaffold-only')
}

/** A package that can be chosen yet installs a bundle only the scaffolds choose. */
export interface ScaffoldOnlyReach {
  /** The package a user can choose. */
  name: string
  /** The scaffold-only bundles its required-peer closure installs. */
  bundles: string[]
}

/**
 * The packages search, the catalogs and `mlcl add` offer that still install a scaffold-only
 * bundle: a bundle somewhere in their required `moleculePeers` + `defaultProvider` closure, the
 * one `mlcl create` and `mlcl add` install. Refusing a bundle by name is not enough while a chosen
 * package brings it in this way (eleven resources did, through the route helpers they imported).
 *
 * @param registryPackages - The registry by name (default: the registry mlcl reads).
 * @returns Each such package with the bundles it installs; empty when none does.
 */
export function scaffoldOnlyReach(
  registryPackages: Map<string, InferredPackage> = new Map(loadRegistry().map((p) => [p.name, p])),
): ScaffoldOnlyReach[] {
  // The exact closure costs about 10 ms a package, and most packages cannot reach a bundle at all.
  // Walk back from the bundles over every peer and default-provider edge (the default counted even
  // where the closure would skip it), so `mayReach` holds every package whose closure can hold a
  // bundle through those edges. The closure's third edge, a package's companion locale bonds, can
  // only lead to a bundle through a locale bond in `mayReach`; when there is one, every package is
  // checked.
  const pointedAtBy = new Map<string, string[]>()
  for (const [name, entry] of registryPackages) {
    const next = [...(entry.molecule?.moleculePeers ?? [])]
    if (entry.molecule?.defaultProvider) next.push(entry.molecule.defaultProvider)
    for (const peer of next) pointedAtBy.set(peer, [...(pointedAtBy.get(peer) ?? []), name])
  }
  const mayReach = new Set<string>()
  const queue = [...registryPackages]
    .filter(([, entry]) => entry.molecule?.selection === 'scaffold-only')
    .map(([name]) => name)
  while (queue.length > 0) {
    for (const from of pointedAtBy.get(queue.shift()!) ?? []) {
      if (mayReach.has(from)) continue
      mayReach.add(from)
      queue.push(from)
    }
  }
  const checkAll = [...mayReach].some(
    (name) => registryPackages.get(name)?.molecule?.type === 'locales',
  )
  const reach: ScaffoldOnlyReach[] = []
  for (const [name, entry] of registryPackages) {
    if (!entry.molecule || !isOfferedPackage(entry.molecule)) continue
    if (!checkAll && !mayReach.has(name)) continue
    const bundles = missingMoleculePeers([name], registryPackages).filter(
      (peer) => registryPackages.get(peer)?.molecule?.selection === 'scaffold-only',
    )
    if (bundles.length > 0) reach.push({ name, bundles })
  }
  return reach
}
