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

import { CLI_COMMAND } from '#cli-command'

import { defaultProviderEntries, defaultProviderFor } from './default-provider.js'
import { APP_TEMPLATES_DIR, frameworkTemplateFeatures } from './optional-features.js'
import { frameworksAcceptedBy, isOfferedPackage } from './package-search.js'
import { loadAppFrameworks, loadRegistry } from './registry.js'
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
  /** Selected by default in the interactive menu */
  checked: boolean
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
    // A renamed package is offered under its replacement's name only.
    if (!isOfferedPackage(pkg.molecule!)) continue
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
      label: primary.molecule!.ui?.label ?? primary.molecule!.label,
      description: primary.molecule!.description ?? '',
      order: primary.molecule!.ui!.order!,
      checked: primary.molecule!.ui?.checked === true,
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
          `[features] cannot determine @molecule peers of ${name} — no moleculePeers in registry.json and package.json unreadable (${(error as Error).message}). Peer expansion may be incomplete; run \`${CLI_COMMAND} sync-registry\`.`,
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
 * Returns the defaults compatible with the project renderer for cores that the selection does
 * not already provide.
 *
 * @param selectedNames - The packages the project will declare.
 * @param allPackages - The registry packages available to this project.
 * @param framework - The project renderer selected by create, if it has an app.
 * @param projectDependencies - External dependencies provided by the selected framework.
 * @returns The providers to add.
 */
export function resolveDefaultProviders(
  selectedNames: string[],
  allPackages: InferredPackage[],
  framework?: string,
  projectDependencies?: ReadonlySet<string>,
): string[] {
  const byName = new Map(allPackages.map((p) => [p.name, p]))
  const entries = defaultProviderEntries(allPackages)
  const allProjectPackages = expandPeerDeps(new Set(selectedNames), byName)
  const additions: string[] = []
  for (const name of allProjectPackages) {
    const provider = defaultProviderFor(
      name,
      entries,
      allProjectPackages,
      framework,
      projectDependencies,
    )
    if (!provider) continue
    allProjectPackages.add(provider)
    additions.push(provider)
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
 * - Sub-feature: a locale bond NO package owns by the rules above
 *   (@molecule/api-locales-user-payments) follows the package its name extends
 *   (@molecule/api-resource-user). A locale bond another package owns
 *   (@molecule/api-locales-secrets-doppler, owned by @molecule/api-secrets-doppler)
 *   is that package's, and comes only with it.
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
  /** Adds the locale suffixes a package name answers to into `into` (keyed by stack). */
  const addSuffixes = (name: string, into: Map<string, Set<string>>): void => {
    const match = name.match(/^@molecule\/(api|app)-(.+)$/)
    if (!match) return
    const [, stack, rest] = match
    if (!into.has(stack)) into.set(stack, new Set())
    const suffixes = into.get(stack)!
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
  for (const name of selected) addSuffixes(name, selectedSuffixes)
  // The suffixes every non-locale package answers to: a locale bond matching one
  // of them is that package's companion and never a sub-feature of a shorter
  // name. Every app with the secrets core used to install the Doppler bond's
  // locales (`secrets-doppler` starts with `secrets-`) without the bond.
  const ownedSuffixes = new Map<string, Set<string>>()
  for (const pkg of allPackages) {
    if (pkg.molecule?.type !== 'locales') addSuffixes(pkg.name, ownedSuffixes)
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

    // Prefix match for sub-feature locales (e.g. user-payments → user is selected),
    // only for a locale bond no package of its own owns, and only when the stack
    // has the feature the rest of the name names (a payments package): without
    // one, the user resource's payment strings are never shown.
    if (ownedSuffixes.get(stack)?.has(suffix)) continue
    for (const s of suffixes) {
      if (!suffix.startsWith(s + '-')) continue
      const feature = suffix.slice(s.length + 1)
      if ([...suffixes].some((other) => other === feature || other.startsWith(feature + '-'))) {
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

/**
 * The app feature menu `mlcl create` offers a framework: the packages a project of it can import
 * (a react-native-web project imports React providers too), so a category whose primary is a
 * framework's own package (the settings panel, the footer) offers that framework's, and only the
 * packages whose template feature (the settings page) the framework's templates have.
 *
 * @param appPackages - The registry's app packages.
 * @param framework - The app framework, or none to offer every package.
 * @returns The menu.
 */
export function buildAppFeatureMenu(
  appPackages: InferredPackage[],
  framework: string | undefined,
): ReturnType<typeof buildFeatureMenu> {
  const accepted = framework
    ? new Set(frameworksAcceptedBy(framework, loadAppFrameworks()))
    : undefined
  const importable = appPackages.filter((pkg) => {
    const pkgFramework = pkg.molecule?.framework
    return !accepted || !pkgFramework || accepted.has(pkgFramework)
  })
  const menu =
    importable.length > 0 ? buildFeatureMenu(importable) : { alwaysInclude: [], features: [] }
  if (framework) {
    const templateFeatures = frameworkTemplateFeatures(APP_TEMPLATES_DIR, framework)
    menu.features = menu.features.filter((feature) => {
      const brings = feature.primary.molecule?.optionalFeature
      return !brings || templateFeatures.has(brings)
    })
  }
  return menu
}

/**
 * The app packages the interactive `mlcl create` checks by default for a framework (the settings
 * page, the footer and about page). A caller that creates projects with `--no-interactive
 * --packages` and wants the starter a person gets names these.
 *
 * @param framework - The app framework.
 * @returns The packages, by name.
 */
export function defaultCheckedAppPackages(framework: string): string[] {
  return buildAppFeatureMenu(loadRegistry('app'), framework)
    .features.filter((feature) => feature.checked)
    .map((feature) => feature.primary.name)
}
