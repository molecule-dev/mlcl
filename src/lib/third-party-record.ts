/**
 * The record of a package's third-party dependencies the registry keeps (`thirdPartyDependencies`),
 * from its manifest. sync-registry writes it, the registry drift check (scripts/check-registry-exports.mjs)
 * compares against it, and `mlcl add --inject` declares it. No imports, so the drift check runs from source.
 *
 * @module
 */

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
