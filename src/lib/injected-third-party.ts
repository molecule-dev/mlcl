/**
 * The third-party dependencies `mlcl inject` declares for the packages it wires, declared ahead of
 * it by `mlcl add --inject`.
 *
 * inject declares each wired package's own third-party dependencies and required peers in the app
 * (`busboy` for the Express body parser, `pg` for PostgreSQL), because the code it generates
 * imports them. Run after `mlcl add` had installed, that declaration changed the manifest and inject
 * installed a second time. The registry records those dependencies with their versions
 * (`thirdPartyDependencies`, written by sync-registry), so `add` declares them through inject's own
 * {@link declareDependencies} before its one install, and inject finds nothing left to declare.
 *
 * @module
 */

import { declareDependencies, type DeclaringManifest, type DependencyChange } from './injector.js'
import { getRawRegistry } from './registry.js'

/** A package's manifest, as far as {@link thirdPartyDependenciesOf} reads it. */
export interface ThirdPartyManifest {
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
}

/** What the registry records for a package: `thirdPartyDependencies`. */
export interface RecordedThirdParty {
  dependencies: Record<string, string>
  peerDependencies: Record<string, string>
}

/**
 * The registry's `thirdPartyDependencies` for a package, from its own manifest: its non-`@molecule`
 * dependencies and its required non-`@molecule` peers, each with the version or range declared,
 * sorted by name. These are the two maps inject's plan reads. sync-registry records it and the
 * registry drift check compares against it.
 *
 * @param manifest - The package's package.json.
 * @returns The record, or undefined for a package with neither.
 */
export function thirdPartyDependenciesOf(
  manifest: ThirdPartyManifest,
): RecordedThirdParty | undefined {
  const optional = manifest.peerDependenciesMeta ?? {}
  const pick = (
    map: Record<string, string> | undefined,
    keep: (name: string) => boolean,
  ): Record<string, string> =>
    Object.fromEntries(
      Object.entries(map ?? {})
        .filter(([name]) => !name.startsWith('@molecule/') && keep(name))
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    )
  const dependencies = pick(manifest.dependencies, () => true)
  const peerDependencies = pick(
    manifest.peerDependencies,
    (name) => optional[name]?.optional !== true,
  )
  return Object.keys(dependencies).length > 0 || Object.keys(peerDependencies).length > 0
    ? { dependencies, peerDependencies }
    : undefined
}

/**
 * The dependency changes inject plans for one package's third-party dependencies and peers.
 *
 * @param name - A `@molecule/*` package.
 * @returns Its third-party dependencies and required peers, as the registry records them.
 */
export function thirdPartyChanges(name: string): DependencyChange[] {
  const recorded = getRawRegistry().packages[name]?.thirdPartyDependencies
  if (!recorded) return []
  return [
    ...Object.entries(recorded.dependencies).map(([dep, version]): DependencyChange => ({
      name: dep,
      version,
      type: 'dependency',
    })),
    ...Object.entries(recorded.peerDependencies).map(([dep, version]): DependencyChange => ({
      name: dep,
      version,
      type: 'peerDependency',
    })),
  ]
}

/**
 * Declares in a manifest, in place, what inject will declare for the packages it wires: their
 * third-party dependencies and peers, pinned and sorted as inject writes them.
 *
 * @param packageJson - The manifest, with the packages already declared.
 * @param wired - The packages inject will wire, as `mlcl add` hands them to it.
 */
export function declareInjectedThirdParty(
  packageJson: DeclaringManifest,
  wired: readonly string[],
): void {
  for (const name of wired) declareDependencies(packageJson, thirdPartyChanges(name), name)
}
