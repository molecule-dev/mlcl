/**
 * Dynamic feature menu builder
 *
 * Builds interactive feature menus from registry metadata
 * instead of hardcoded definitions. Each @molecule package self-describes
 * via its entry in the centralized registry (registry.json).
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { loadAppFrameworks } from './registry.js'
import type { InferredPackage, MoleculeSecret } from './schema.js'

/**
 * A feature category assembled from package metadata
 */
export interface DynamicFeature {
  /** Category key (e.g. 'database', 'auth', 'payments') */
  category: string
  /** Human-readable name for the menu */
  label: string
  /** Short description shown as hint */
  description: string
  /** Sort order (lower = higher in menu) */
  order: number
  /** Whether provider selection is multi-select */
  multiSelect: boolean
  /** Primary package that defines this feature */
  primary: InferredPackage
  /** Packages auto-included when this feature is selected */
  bundledPackages: InferredPackage[]
  /** Provider options the user picks from */
  providers: InferredPackage[]
}

/**
 * Build the feature menu from scanned packages.
 *
 * Separates always-included packages from selectable features,
 * groups by category, identifies primaries/bundled/providers.
 */
export function buildFeatureMenu(scannedPackages: InferredPackage[]): {
  alwaysInclude: InferredPackage[]
  features: DynamicFeature[]
} {
  const withMolecule = scannedPackages.filter((p) => p.molecule)

  // Always-included packages
  const alwaysInclude = withMolecule.filter((p) => p.molecule!.alwaysInclude)

  // Group ALL packages by category (visible and hidden)
  // Include alwaysInclude packages that have ui.order — they serve as feature
  // primaries for provider selection (e.g. @molecule/app-http has providers
  // like axios, but is always included itself).
  const byCategory = new Map<string, InferredPackage[]>()
  for (const pkg of withMolecule) {
    if (pkg.molecule!.alwaysInclude && !(pkg.molecule!.ui?.order != null)) continue
    const cat = pkg.molecule!.category
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(pkg)
  }

  const features: DynamicFeature[] = []

  for (const [category, packages] of byCategory) {
    // Find primary: the package with ui.order set (and not hidden)
    const primary = packages.find((p) => p.molecule!.ui?.order != null && !p.molecule!.ui?.hidden)
    if (!primary) continue // no visible primary = can't show in menu

    // Bundled: featureBundled packages in same category
    const bundled = packages.filter((p) => p.molecule!.featureBundled && p !== primary)

    // Providers: type === 'provider' in same category
    const providers = packages.filter((p) => p.molecule!.type === 'provider')

    // Determine multiSelect: true if any core interface in this category declares it
    const multiSelect = packages.some((p) => p.molecule!.type === 'core' && p.molecule!.multiSelect)

    features.push({
      category,
      label: primary.molecule!.label,
      description: primary.molecule!.description ?? '',
      order: primary.molecule!.ui!.order!,
      multiSelect,
      primary,
      bundledPackages: bundled,
      providers,
    })
  }

  // Sort by order, then alphabetically
  features.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))

  return { alwaysInclude, features }
}

/**
 * Collect all packages needed for a feature selection.
 *
 * Includes primary, bundled, selected providers, and any core interfaces
 * that the selected providers implement.
 */
export function collectFeaturePackages(
  feature: DynamicFeature,
  selectedProviderNames: string[],
  allPackages: InferredPackage[],
): InferredPackage[] {
  const result: InferredPackage[] = [feature.primary, ...feature.bundledPackages]

  if (selectedProviderNames.length > 0) {
    const selectedProviders = feature.providers.filter((p) =>
      selectedProviderNames.includes(p.name),
    )
    result.push(...selectedProviders)

    // Add core interface packages that the selected providers implement
    const implementedNames = new Set(
      selectedProviders.map((p) => p.molecule?.implements).filter(Boolean) as string[],
    )
    for (const name of implementedNames) {
      const corePkg = allPackages.find((p) => p.name === name)
      if (corePkg && !result.includes(corePkg)) {
        result.push(corePkg)
      }
    }
  }

  return result
}

/**
 * Returns the @molecule/* peer dependencies (transitively) of the selected
 * packages that aren't already selected.
 *
 * A package's @molecule peers are its required companions — e.g.
 * `app-oauth-buttons-react` composes (imports) `app-oauth-logos-react`, so any
 * app that ends up with the buttons MUST also ship the logos or the build fails
 * on a missing import. The injector only adds the peers of the *explicitly*
 * selected packages (one level), so a deeply-nested companion
 * (`auth-ui-react → oauth-buttons-react → oauth-logos-react`) is silently
 * dropped. Folding the full transitive closure into the selected set fixes that:
 * every companion becomes a selected package the injector then resolves.
 *
 * One companion class is held back: a PROVIDER peer whose core the selection
 * already provides (see the guard in the loop) — wiring two providers for one
 * singleton core makes the last setup call win, silently.
 *
 * @param selectedNames - Currently selected package names.
 * @param allPackages - All registry packages.
 * @returns The transitive @molecule peer companions not already selected.
 */
export function resolveTransitivePeers(
  selectedNames: string[],
  allPackages: InferredPackage[],
): string[] {
  const byName = new Map(allPackages.map((p) => [p.name, p]))
  // Registry FIRST (`moleculePeers`, populated by sync-registry), because the
  // package.json read below needs a molecule SOURCE checkout and production has
  // none. The old order — manifest only, silent [] on failure — meant every
  // prod/CI scaffold expanded zero peers, and a custom app shipped with
  // oauth-buttons but not the oauth-logos it imports (preflight sandbox-boot
  // failure, 2026-08-07). "I could not look" must never read as "no peers".
  const peerCache = new Map<string, string[]>()
  const moleculePeersOf = (name: string): string[] => {
    if (peerCache.has(name)) return peerCache.get(name)!
    const pkg = byName.get(name)
    let peers: string[] = []
    const registryPeers = pkg?.molecule?.moleculePeers
    if (registryPeers) {
      peers = registryPeers
    } else if (pkg?.path) {
      try {
        const pj = JSON.parse(readFileSync(join(pkg.path, 'package.json'), 'utf-8'))
        // Only REQUIRED @molecule peers — a required peer is imported, so omitting
        // it breaks the build (e.g. oauth-buttons imports oauth-logos). Optional
        // peers (peerDependenciesMeta.optional) are feature add-ons; force-adding
        // them transitively would bloat every app with IDE/AI/etc. companions.
        const meta = pj.peerDependenciesMeta || {}
        peers = Object.keys(pj.peerDependencies || {}).filter(
          (n) => n.startsWith('@molecule/') && meta[n]?.optional !== true,
        )
      } catch (error) {
        // LOUD, never silent: with no registry field and no readable manifest we
        // genuinely cannot know the peers, and treating that as "none" scaffolds
        // apps whose imports don't resolve. Run `mlcl sync-registry` so the
        // registry carries moleculePeers.
        console.warn(
          `[features] cannot determine @molecule peers of ${name} — no moleculePeers in registry.json and package.json unreadable (${(error as Error).message}). Peer expansion may be incomplete; run \`mlcl sync-registry\`.`,
        )
        peers = []
      }
    }
    peerCache.set(name, peers)
    return peers
  }

  const selected = new Set(selectedNames)
  const all = new Set(selected)
  const queue = [...selected]
  // A transitive PROVIDER peer only when the core it implements has no
  // provider yet: @molecule/api-bonds-default-express peers on every default
  // provider its setup re-exports, so a selection that already chose SQLite
  // (or meilisearch search, or S3 uploads) also gained Postgres — and every
  // extra provider the injector wires adds a second setup call for the same
  // singleton core, the LAST call winning the pool. A live project shipped
  // with both database bonds wired and an agent burned minutes deciding which
  // database was real (X0 run xr-molecule-flash-m23). Same rule as the
  // defaultProvider guards in ensureMoleculePeerClosure (scaffold.ts) and
  // resolveDefaultProviders below; framework bindings (e.g. app-ui-react)
  // implement their core but are not bond providers, so they pass through.
  // The skipped package stays INSTALLED — create.ts closes the manifests with
  // ensureMoleculePeerClosure after injection, so the aggregate's static
  // imports of every provider keep resolving; it just never gets a bond.
  const providedCoreOf = (name: string): string | undefined => {
    const m = byName.get(name)?.molecule
    return m?.implements && m.type !== 'framework' ? m.implements : undefined
  }
  const providedCores = new Set<string>()
  for (const name of all) {
    const core = providedCoreOf(name)
    if (core) providedCores.add(core)
  }
  while (queue.length > 0) {
    const name = queue.shift()!
    for (const peer of moleculePeersOf(name)) {
      if (all.has(peer)) continue
      const core = providedCoreOf(peer)
      if (core && providedCores.has(core)) continue
      all.add(peer)
      if (core) providedCores.add(core)
      queue.push(peer)
    }
  }
  return [...all].filter((name) => !selected.has(name))
}

/**
 * Expand selected packages by following @molecule peer dependency chains.
 * Returns all package names that will end up in the project.
 */
function expandPeerDeps(selected: Set<string>, byName: Map<string, InferredPackage>): Set<string> {
  const all = new Set(selected)
  const queue = [...selected]

  while (queue.length > 0) {
    const name = queue.shift()!
    const pkg = byName.get(name)
    if (!pkg) continue

    // Registry `moleculePeers` FIRST, manifest fallback — the same fix
    // resolveTransitivePeers got on 2026-08-07: `loadRegistry` populates
    // `peerDependencies` as `{}` (a manifest read needs a molecule SOURCE
    // checkout, which production lacks), so walking the manifest field alone
    // expanded NOTHING. resolveDefaultProviders then never saw peer-reached
    // cores, which is how every marketplace preset scaffolded WITHOUT a
    // database provider — the shared migrate.ts imports `pg` unconditionally
    // and the app API crashed at boot on a real (sprite) npm topology.
    const peers =
      pkg.molecule?.moleculePeers ??
      Object.keys(pkg.peerDependencies).filter((n) => n.startsWith('@molecule/'))
    for (const peerName of peers) {
      if (!peerName.startsWith('@molecule/')) continue
      if (!all.has(peerName)) {
        all.add(peerName)
        queue.push(peerName)
      }
    }
  }

  return all
}

/**
 * Resolve default providers for core packages that have no explicit provider selected.
 *
 * Walks the transitive peer dependency tree of selected packages using registry
 * data (no npm install needed) to find core packages that declare a defaultProvider.
 * If no provider for that core's category exists in the selection, returns the
 * default provider package names to add.
 */
export function resolveDefaultProviders(
  selectedNames: string[],
  allPackages: InferredPackage[],
): string[] {
  const byName = new Map(allPackages.map((p) => [p.name, p]))
  const selected = new Set(selectedNames)

  // Expand to include all transitive peer deps
  const allProjectPackages = expandPeerDeps(selected, byName)

  // Auto-detect project framework from selected packages (e.g. react, react-native)
  let projectFramework: string | undefined
  for (const pkgName of allProjectPackages) {
    const pkg = byName.get(pkgName)
    if (pkg?.molecule?.category === 'framework' && pkg.molecule.framework) {
      projectFramework = pkg.molecule.framework
      break
    }
  }

  const additions: string[] = []

  for (const pkgName of allProjectPackages) {
    const pkg = byName.get(pkgName)
    if (!pkg?.molecule) continue
    if (pkg.molecule.type !== 'core' && pkg.molecule.type !== 'middleware') continue
    if (!pkg.molecule.defaultProvider) continue

    // Check if any provider implementing this core is already in the project.
    // Framework packages (e.g. app-ui-react) don't count — they're framework
    // bindings, not bond providers (e.g. app-ui-tailwind provides the ClassMap).
    const hasProvider = [...allProjectPackages, ...additions].some((name) => {
      const p = byName.get(name)
      return p?.molecule?.implements === pkg.name && p.molecule.type !== 'framework'
    })

    if (!hasProvider) {
      // Prefer a framework-specific provider when one exists in the registry.
      // E.g. for react-native, prefer @molecule/app-ui-nativewind over the
      // generic defaultProvider (@molecule/app-ui-tailwind).
      if (projectFramework) {
        const frameworkProvider = allPackages.find(
          (p) =>
            p.molecule?.implements === pkg.name &&
            p.molecule?.type === 'provider' &&
            p.molecule?.framework === projectFramework,
        )
        if (frameworkProvider) {
          additions.push(frameworkProvider.name)
          continue
        }
      }

      if (byName.has(pkg.molecule.defaultProvider)) {
        additions.push(pkg.molecule.defaultProvider)
      }
    }
  }

  return additions
}

/**
 * Strip a trailing app-framework name suffix (`-react`, `-vue`, `-svelte`,
 * `-react-native`, …) from a package name's remainder, returning the
 * framework-agnostic base — or `undefined` when there is no framework suffix.
 *
 * Used to map a framework-specific feature (`@molecule/app-oauth-buttons-react`)
 * to its shared companion locale (`@molecule/app-locales-oauth-buttons`): locale
 * bonds are pure data reused across framework variants, so they drop the
 * `-react`/`-vue`/… suffix the feature package carries.
 *
 * Framework tokens are read from the registry's `appFrameworks` (never
 * hardcoded), longest-first so `clipboard-react-native` strips `-react-native`,
 * not `-react`.
 *
 * @param rest - a package name with the `@molecule/{stack}-` prefix removed
 * @param frameworkSuffixes - framework tokens (defaults to registry appFrameworks)
 */
export function stripFrameworkSuffix(
  rest: string,
  frameworkSuffixes: string[] = Object.keys(loadAppFrameworks()),
): string | undefined {
  const fwSuffixes = [...frameworkSuffixes].sort((a, b) => b.length - a.length)
  for (const tok of fwSuffixes) {
    if (rest.endsWith(`-${tok}`)) {
      const base = rest.slice(0, -(tok.length + 1))
      return base || undefined
    }
  }
  return undefined
}

/**
 * Resolve locale packages for selected packages.
 *
 * For each selected package, checks if a corresponding locale package exists
 * in the registry and returns those that match. Handles naming conventions:
 * - Direct: @molecule/{stack}-{name} → @molecule/{stack}-locales-{name}
 * - Resource: @molecule/{stack}-resource-{name} → @molecule/{stack}-locales-{name}
 * - Middleware: @molecule/{stack}-middleware-{name} → @molecule/{stack}-locales-{name}
 * - Framework feature: @molecule/{stack}-{name}-react → @molecule/{stack}-locales-{name}
 */
export function resolveLocalePackages(
  selectedNames: string[],
  allPackages: InferredPackage[],
  frameworkSuffixes: string[] = Object.keys(loadAppFrameworks()),
): string[] {
  const selected = new Set(selectedNames)
  const localePackages = allPackages.filter((p) => p.molecule?.type === 'locales')

  // Build reverse lookup: for each selected package, extract the suffix that
  // locale packages use. E.g. @molecule/api-resource-user → "api" + "user"
  const selectedSuffixes = new Map<string, Set<string>>() // stack → suffixes
  for (const name of selected) {
    const match = name.match(/^@molecule\/(api|app)-(.+)$/)
    if (!match) continue
    const [, stack, rest] = match
    if (!selectedSuffixes.has(stack)) selectedSuffixes.set(stack, new Set())
    const suffixes = selectedSuffixes.get(stack)!
    // Add the full name suffix
    suffixes.add(rest)
    // Strip type prefixes so locale packages can match
    if (rest.startsWith('resource-')) suffixes.add(rest.slice('resource-'.length))
    if (rest.startsWith('middleware-')) suffixes.add(rest.slice('middleware-'.length))
    // Strip a trailing framework suffix so a framework-specific feature
    // (e.g. @molecule/app-oauth-buttons-react) resolves its framework-agnostic
    // companion locale (@molecule/app-locales-oauth-buttons).
    const fwBase = stripFrameworkSuffix(rest, frameworkSuffixes)
    if (fwBase) suffixes.add(fwBase)
  }

  const additions: string[] = []
  for (const locale of localePackages) {
    if (selected.has(locale.name)) continue
    const match = locale.name.match(/^@molecule\/(api|app)-locales-(.+)$/)
    if (!match) continue
    const [, stack, suffix] = match
    const suffixes = selectedSuffixes.get(stack)
    if (!suffixes) continue

    // Direct match: suffix exactly matches a selected package's suffix
    if (suffixes.has(suffix)) {
      additions.push(locale.name)
      continue
    }

    // Prefix match for sub-feature locales (e.g. user-payments → user is selected)
    for (const s of suffixes) {
      if (suffix.startsWith(s + '-')) {
        additions.push(locale.name)
        break
      }
    }
  }

  return additions
}

/**
 * Resolve featureBundled packages for selected packages.
 *
 * When packages are specified via --packages or templates, the interactive
 * feature menu (which expands featureBundled) is bypassed. This function
 * ensures featureBundled packages are still included by finding packages
 * in the same category that have featureBundled=true.
 *
 * Example: @molecule/api-resource-user (category: auth) is selected →
 * @molecule/api-resource-device (category: auth, featureBundled: true)
 * is auto-included so that get('device') works at runtime.
 */
export function resolveFeatureBundledPackages(
  selectedNames: string[],
  allPackages: InferredPackage[],
): string[] {
  const selected = new Set(selectedNames)

  // Collect categories of all selected packages
  const selectedCategories = new Set<string>()
  for (const name of selected) {
    const pkg = allPackages.find((p) => p.name === name)
    if (pkg?.molecule?.category) {
      selectedCategories.add(pkg.molecule.category)
    }
  }

  // Find featureBundled packages in those categories that aren't already selected
  const additions: string[] = []
  for (const pkg of allPackages) {
    if (!pkg.molecule?.featureBundled) continue
    if (selected.has(pkg.name)) continue
    if (!pkg.molecule.category) continue
    if (selectedCategories.has(pkg.molecule.category)) {
      additions.push(pkg.name)
    }
  }

  return additions
}

/**
 * Collect and deduplicate secrets from selected packages.
 * Keeps the first occurrence of each secret name (most specific default).
 */
export function collectSecrets(packages: InferredPackage[]): MoleculeSecret[] {
  const seen = new Map<string, MoleculeSecret>()

  for (const pkg of packages) {
    if (!pkg.molecule?.secrets) continue
    for (const secret of pkg.molecule.secrets) {
      if (!seen.has(secret.name)) {
        seen.set(secret.name, secret)
      }
    }
  }

  return [...seen.values()]
}
