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
