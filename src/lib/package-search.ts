/**
 * The canonical package-search contract shared by `mlcl search` and the hosted
 * MCP server.
 *
 * This module is PURE — registry-shaped data in, ranked hits out: no filesystem,
 * no registry loader, no oclif/CLI, and no vendor or `@molecule/*` import. That
 * is what lets the standalone hosted MCP (`mcp/src/package-search.ts`, which
 * must build from the `mcp/` package alone — its Dockerfile and
 * `scripts/deploy-remote.sh` ship no CLI or workspace) carry the SAME ranking,
 * stack filtering and DTO instead of hand-maintaining a second scorer.
 *
 * The copy under `mcp/src/` is generated from this file by
 * `scripts/generate-mcp-package-search.mjs`; `src/lib/__tests__/mcp-search-owner-drift.test.ts`
 * fails when the two diverge. Edit this file, then regenerate — never the copy.
 *
 * Input is the loose registry-entry shape, because the two readers hold
 * different views of one registry: the CLI adapts `loadRegistry()`'s
 * `InferredPackage` (flattening its `molecule` metadata), and the hosted server
 * passes the raw registry entry. Both therefore reach the same scorer.
 *
 * @module
 */

/**
 * One package as either registry reader can hand it to the search contract.
 *
 * Every metadata field is optional because the hosted side reads an
 * UNVALIDATED registry document: an entry missing a label, or carrying a
 * non-array `exports`, must degrade to a score (or no match), never throw
 * inside the tool handler.
 */
/**
 * Whether a project can be offered this package. Not the dev tooling every scaffold installs
 * (`stack: 'tooling'`, such as the shared ESLint config), not a package renamed to another
 * (`replacedBy`: projects that installed the old name keep it, nothing offers it again), and not
 * a package that composes the scaffolds (`selection: 'scaffold-only'`, such as the flagship
 * templates' bond bundle: naming one in a custom stack installs every provider it wires). Search,
 * the catalogs, the create menu and the role lookups all apply this one rule.
 *
 * @param entry - A registry entry, or a package's registry metadata.
 * @param entry.stack - Its declared stack.
 * @param entry.replacedBy - The package that replaced it, if any.
 * @param entry.selection - `scaffold-only` for a package only the scaffolds choose.
 * @returns True when it may be offered.
 */
export function isOfferedPackage(entry: {
  stack?: string
  replacedBy?: string
  selection?: string
}): boolean {
  return entry.stack !== 'tooling' && !entry.replacedBy && entry.selection !== 'scaffold-only'
}

export interface SearchSourceEntry {
  /** Full package name, e.g. `@molecule/api-payments-stripe`. */
  name: string
  /** Declared stack. Absent only in a malformed/legacy registry entry. */
  stack?: 'api' | 'app' | 'tooling'
  /** The package that took this one's place under a new name, when it was renamed. */
  replacedBy?: string
  /** `scaffold-only` for a package only the scaffolds choose (see {@link isOfferedPackage}). */
  selection?: string
  category?: string
  label?: string
  description?: string
  exports?: readonly string[]
  /** Its kind (`core`, `provider`, …), as the registry records it. */
  type?: string
  /** The interface package a provider implements. */
  implements?: string
  /** The provider an add of this interface package also declares when the project has none. */
  defaultProvider?: string
  /** The `@molecule/*` packages an add declares with this one. */
  moleculePeers?: readonly string[]
  /**
   * The UI framework the package is written for (`react`, `vue`, `svelte`, `solid`,
   * `angular`, `react-native`); absent for a framework-neutral package.
   */
  framework?: string
  /** Dependencies and peers, as sync-registry records them; {@link packageFramework} reads them. */
  runtimeDependencies?: readonly string[]
  intentHints?: readonly string[]
  /** Optional package-authored decision guidance in the registry. */
  decisionGuide?: {
    configuration?: readonly string[]
  }
  /** Its README's Quick Start code, as sync-registry records it ({@link quickStartOf}). */
  quickStart?: string
  /** The environment variables it reads, as the registry declares them (`required` defaults to true). */
  secrets?: readonly { name?: unknown; required?: unknown }[]
}

/**
 * One ranked discovery hit, as both transports return it.
 *
 * This is the shared DTO shape: transports add only their own `install`
 * command, so a consumer reading `label` (or any other field) gets the same
 * answer over the CLI, stdio MCP and hosted MCP.
 */
export interface SearchHit {
  name: string
  stack: 'api' | 'app'
  category: string
  label: string
  description: string
  /** Concrete common-shape configuration, when this package declares it. */
  configuration?: string[]
  /** Its README's Quick Start code (the import and the call), on the first {@link QUICK_START_HITS} hits. */
  quickStart?: string
  /**
   * The environment variables it reads, an optional one marked `(optional)`. Asked which email
   * package to use, Codex searched and then read the provider's README for these names alone
   * (harness eval `find`, 2026-11-24).
   */
  envVars?: string[]
  /**
   * The other package one add of this one installs and wires: a provider's core, or an interface's
   * default provider. Shown on both hits, an agent ran one add for the core and another for its
   * provider, the second a no-op (harness eval `add`, 2026-11-25: every CLI path ran two).
   */
  includes?: string
}

/**
 * The environment variable names an entry declares, an optional one marked `(optional)`.
 *
 * @param secrets - The entry's `secrets`, unvalidated: an entry without a string name is skipped.
 * @returns The names, in declared order.
 */
export function envVarsOf(secrets: SearchSourceEntry['secrets']): string[] {
  if (!Array.isArray(secrets)) return []
  return secrets.flatMap((secret) =>
    secret && typeof secret.name === 'string' && secret.name
      ? [secret.required === false ? `${secret.name} (optional)` : secret.name]
      : [],
  )
}

/**
 * How many of the first hits carry their Quick Start: enough for a capability's core and its first
 * providers. Asked which package to use and how to call it, both harnesses used to search and then
 * read one or two READMEs only to copy their Quick Start: a model turn per README (harness eval
 * `find`, 2026-11-23).
 */
export const QUICK_START_HITS = 3

/**
 * The code of a README's Quick Start: the first fenced block under its `## Quick Start` heading.
 *
 * @param readme - A generated package README.
 * @returns The block's code without its fence, or undefined when the README has none.
 */
export function quickStartOf(readme: string): string | undefined {
  const section = /^## Quick Start\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(readme)?.[1]
  const code = section && /^```[^\n]*\n([\s\S]*?)^```/m.exec(section)?.[1]
  return code ? code.replace(/\n+$/, '') : undefined
}

/** What a caller may narrow before ranking and the limit cutoff. */
export interface SearchOptions {
  /**
   * Restrict to one stack. Applied BEFORE scoring/ranking/truncation, so a
   * crowded query cannot lose same-stack matches to the limit window being
   * filled by higher-scoring packages of the other stack.
   *
   * Matches the registry's DECLARED `stack` (the rule `loadRegistry(stack)`
   * applies), not the name-derived display fallback below.
   */
  stack?: 'api' | 'app'
  /**
   * The project's app framework (its `molecule.framework`). Applied BEFORE
   * ranking, like `stack`: a package written for a framework the project cannot
   * import is left out, framework-neutral packages stay. Every framework binding
   * exports the same hook names (`useProfileForm`, …), so without it a symbol
   * query returns each framework's package with the same score, and only the
   * caller knows which one its project can import. Without it, a feature's
   * framework counterparts share one place in the ranking (React's first) and
   * the others follow every other hit (see {@link onePlacePerFeature}).
   */
  framework?: string
  /**
   * The registry's `appFrameworks`, which say which package frameworks a project
   * framework can import ({@link frameworksAcceptedBy}). Without them only
   * packages declaring exactly `framework` are kept.
   */
  appFrameworks?: Record<string, AppFrameworkInstalls>
  /** Maximum number of hits. */
  limit?: number
}

/** What a registry `appFrameworks` entry says about the projects it scaffolds. */
export interface AppFrameworkInstalls {
  /** The UI package set its projects render with, when it is another framework's (react-native-web → react-native). */
  uiFramework?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

/**
 * The package frameworks a project of one app framework can import.
 *
 * Its own, the UI set it renders with (`uiFramework`), and every framework whose
 * identifying runtime the project installs in full. A framework is identified by
 * its `dependencies`, or by its `devDependencies` when it has none (the rule
 * `getAppFrameworkDeps` reads). A framework that renders with another
 * framework's UI set is identified by that set, so its packages are never
 * accepted by runtime alone. So a react-native-web project (react, react-dom,
 * react-router) imports React packages, a react-native one (no react-dom) does
 * not, and a React project does not import react-native-web packages.
 *
 * @param project - The project's framework key (`molecule.framework`).
 * @param appFrameworks - The registry's `appFrameworks`.
 * @returns The accepted package frameworks, the project's own first; just the
 *   project's key when the registry does not know it.
 */
export function frameworksAcceptedBy(
  project: string,
  appFrameworks: Record<string, AppFrameworkInstalls>,
): string[] {
  const own = appFrameworks[project]
  // The hosted reader passes an unvalidated registry document.
  if (!own || typeof own !== 'object') return [project]
  const installed = new Set([
    ...Object.keys(own.dependencies ?? {}),
    ...Object.keys(own.devDependencies ?? {}),
  ])
  const accepted = [project]
  if (own.uiFramework && own.uiFramework !== project) accepted.push(own.uiFramework)
  for (const [key, identifying] of runtimeFrameworks(appFrameworks)) {
    if (accepted.includes(key)) continue
    if ([...identifying].every((dep) => installed.has(dep))) accepted.push(key)
  }
  return accepted
}

/**
 * The frameworks that are a runtime of their own, each with the dependencies that
 * identify it: its `dependencies`, or its `devDependencies` when it has none (the
 * rule `getAppFrameworkDeps` reads). A framework that renders with another
 * framework's UI set (react-native-web) is not one: it is identified by that set.
 *
 * @param appFrameworks - The registry's `appFrameworks` (unvalidated on the hosted side).
 * @returns Framework key → identifying dependency names, frameworks with none left out.
 */
function runtimeFrameworks(
  appFrameworks: Record<string, AppFrameworkInstalls>,
): Array<[string, Set<string>]> {
  const runtimes: Array<[string, Set<string>]> = []
  for (const [key, fw] of Object.entries(appFrameworks)) {
    if (!fw || typeof fw !== 'object') continue
    if (fw.uiFramework && fw.uiFramework !== key) continue
    const runtime = Object.keys(fw.dependencies ?? {})
    const identifying = runtime.length > 0 ? runtime : Object.keys(fw.devDependencies ?? {})
    if (identifying.length > 0) runtimes.push([key, new Set(identifying)])
  }
  return runtimes
}

/**
 * The framework a package is written for: its registry `framework`, else the one
 * its `runtimeDependencies` (dependencies and peers, as sync-registry records
 * them) name.
 *
 * A dependency names a framework when it identifies a runtime framework (react,
 * react-dom, vue, solid-js, svelte, …). The package is written for the framework
 * with the fewest identifying dependencies that still has every one the package
 * names: `react` alone is react, `react` with `react-native` is react-native.
 * The registry `framework` covers a package whose dependencies name none, like a
 * bond over `@react-native-clipboard/clipboard`.
 *
 * @param entry - The package's registry entry.
 * @param appFrameworks - The registry's `appFrameworks`.
 * @returns The framework key, or undefined for a framework-neutral package (and for
 *   dependencies two frameworks fit equally, which the registry tests refuse).
 */
export function packageFramework(
  entry: { stack?: unknown; framework?: unknown; runtimeDependencies?: unknown },
  appFrameworks: Record<string, AppFrameworkInstalls>,
): string | undefined {
  if (typeof entry.framework === 'string' && entry.framework) return entry.framework
  // UI frameworks are the app stack's: an API package that peers react (to render an
  // email, say) is not a React binding.
  if (entry.stack === 'api' || !Array.isArray(entry.runtimeDependencies)) return undefined
  const runtimes = runtimeFrameworks(appFrameworks)
  const named = entry.runtimeDependencies.filter(
    (dep): dep is string =>
      typeof dep === 'string' && runtimes.some(([, identifying]) => identifying.has(dep)),
  )
  if (named.length === 0) return undefined
  const fits = runtimes
    .filter(([, identifying]) => named.every((dep) => identifying.has(dep)))
    .sort((a, b) => a[1].size - b[1].size)
  if (fits.length === 0 || (fits.length > 1 && fits[1][1].size === fits[0][1].size))
    return undefined
  return fits[0][0]
}

/** Result count both `mlcl search` and `search_packages` use when none is given. */
export const DEFAULT_SEARCH_LIMIT = 20

/**
 * The stack a hit reports. A declared stack wins; a legacy/malformed entry
 * falls back to the package-name convention (the same rule both readers used
 * before the contract was shared).
 *
 * @param entry - A registry-shaped package.
 * @returns The stack to report on the hit.
 */
function resolveStack(entry: SearchSourceEntry): 'api' | 'app' {
  if (entry.stack === 'api' || entry.stack === 'app') return entry.stack
  return entry.name.includes('/app-') ? 'app' : 'api'
}

/**
 * Score a package against the query tokens. Higher = more relevant.
 * Exact names, exported symbols and complete capability phrases outrank
 * incidental name substrings ("form" in "formula"). The existing token scores
 * remain useful for partial package names and broad category/provider queries.
 *
 * @param entry - A registry-shaped package.
 * @param q - Package name, exported symbol or natural capability query.
 * @returns Relevance score; zero means no match.
 */
export function scoreSearchEntry(entry: SearchSourceEntry, q: string): number {
  const name = entry.name.replace('@molecule/', '')
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return 0
  let score = 0
  const phrase = (value: string): string =>
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
  const query = phrase(q)
  const symbolQuery = q.trim().replace(/\(\)$/, '').toLowerCase()
  // The hosted server scores an unvalidated document, so `exports` may not be
  // the string[] the registry contract says: treat anything else as no export
  // list rather than throwing inside the tool handler.
  const exportsList: readonly unknown[] = Array.isArray(entry.exports) ? entry.exports : []
  const exactSymbol =
    /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(symbolQuery) &&
    exportsList.some((symbol) => typeof symbol === 'string' && symbol.toLowerCase() === symbolQuery)
  if (!query && !exactSymbol) return 0
  const containsPhrase = (text: string, candidate: string): boolean =>
    ` ${text} `.includes(` ${candidate} `)
  const hints = (entry.intentHints ?? []).map(phrase)
  if (
    q.trim().toLowerCase() === entry.name.toLowerCase() ||
    q.trim().toLowerCase() === name.toLowerCase()
  ) {
    score += 400
  }
  // Match the WHOLE symbol, never its prefix/substring; e.g. "use" must not
  // match every hook, and "useProfileFormState" must not match useProfileForm.
  // A short query can name both a category and a common export (e.g. query):
  // the category keeps its members ahead of unrelated symbol owners, and the two
  // count once, or a provider exporting an alias named after its category
  // (`email`) outranks the core it implements.
  if (exactSymbol || (entry.category && phrase(entry.category) === query)) score += 160
  if (query.includes(' ')) {
    if (hints.includes(query)) score += 120
    else if (
      hints.some(
        (hint) =>
          hint.includes(' ') && (containsPhrase(query, hint) || containsPhrase(hint, query)),
      )
    )
      score += 80
    else if (
      [name, entry.category, entry.label, entry.description].some(
        (field) => field && containsPhrase(phrase(field), query),
      )
    )
      score += 60
  }
  for (const tok of tokens) {
    if (name === tok) score += 40
    else if (name.includes(tok)) score += 20
    if (entry.category?.includes(tok)) score += 8
    if (entry.intentHints?.some((h) => h.includes(tok) || tok.includes(h))) score += 6
    if (entry.description?.toLowerCase().includes(tok)) score += 3
    if (entry.label?.toLowerCase().includes(tok)) score += 3
  }
  return score
}

/**
 * Rank a registry into the shared discovery DTO.
 *
 * The stack filter is applied to the SOURCE entries first — before any scoring,
 * sorting or truncation — because the limit window is otherwise claimed by the
 * highest-scoring packages of BOTH stacks and a stack-restricted caller can be
 * left with none of its own.
 *
 * @param entries - Registry-shaped packages, from either reader.
 * @param query - Package name, exported symbol or natural capability query.
 * @param options - Optional stack and framework restrictions and result limit.
 * @returns Ranked hits (score stripped), at most `limit` of them.
 */
export function searchPackages(
  entries: Iterable<SearchSourceEntry>,
  query: string,
  options: SearchOptions = {},
): SearchHit[] {
  const { stack, framework, appFrameworks, limit = DEFAULT_SEARCH_LIMIT } = options
  const accepted = framework
    ? new Set(appFrameworks ? frameworksAcceptedBy(framework, appFrameworks) : [framework])
    : null
  const ranked: Array<SearchHit & { score: number; dependsOn: readonly unknown[] }> = []
  for (const entry of entries) {
    // The rule `loadRegistry(stack)` applies — declared stack equality — kept
    // here so the transport that has no loader (hosted MCP) filters identically.
    if (stack && entry.stack !== stack) continue
    if (!isOfferedPackage(entry)) continue
    if (accepted) {
      const written = appFrameworks
        ? packageFramework(entry, appFrameworks)
        : typeof entry.framework === 'string'
          ? entry.framework
          : undefined
      if (written && !accepted.has(written)) continue
    }
    const score = scoreSearchEntry(entry, query)
    if (score <= 0) continue
    const configuration = Array.isArray(entry.decisionGuide?.configuration)
      ? entry.decisionGuide.configuration.filter(
          (line): line is string => typeof line === 'string' && line.length > 0,
        )
      : []
    const envVars = envVarsOf(entry.secrets)
    ranked.push({
      name: entry.name,
      stack: resolveStack(entry),
      category: entry.category ?? '',
      label: entry.label ?? entry.name,
      description: entry.description ?? '',
      ...(configuration.length > 0 ? { configuration } : {}),
      ...(typeof entry.quickStart === 'string' && entry.quickStart
        ? { quickStart: entry.quickStart }
        : {}),
      ...(envVars.length > 0 ? { envVars } : {}),
      ...includesOf(entry),
      score,
      dependsOn: Array.isArray(entry.runtimeDependencies) ? entry.runtimeDependencies : [],
    })
  }
  // Equal relevance goes to the package more of the other matches build on: the core before the
  // templates, providers and features that require it ("transactional email" tied
  // @molecule/api-email-templates with @molecule/api-emails, and the name put templates first).
  const dependents = new Map<string, number>()
  for (const hit of ranked)
    for (const name of hit.dependsOn)
      if (typeof name === 'string') dependents.set(name, (dependents.get(name) ?? 0) + 1)
  const builtOn = (hit: { name: string }): number => dependents.get(hit.name) ?? 0
  ranked.sort(
    (a, b) => b.score - a.score || builtOn(b) - builtOn(a) || a.name.localeCompare(b.name),
  )
  return (accepted ? ranked : onePlacePerFeature(ranked, Object.keys(appFrameworks ?? {})))
    .slice(0, limit)
    .map(({ score: _score, dependsOn: _dependsOn, quickStart, ...hit }, index) =>
      index < QUICK_START_HITS && quickStart ? { ...hit, quickStart } : hit,
    )
}

/**
 * What one add of an entry also installs and wires: the core a provider implements (when the provider
 * declares it) and an interface's default provider (declared only when nothing in the project
 * implements the interface, as `mlcl add` decides).
 *
 * @param entry - A registry entry.
 * @returns `{ includes }`, or nothing when the add brings neither.
 */
function includesOf(entry: SearchSourceEntry): { includes?: string } {
  const peers = Array.isArray(entry.moleculePeers) ? entry.moleculePeers : []
  if (entry.type === 'provider' && entry.implements && peers.includes(entry.implements))
    return {
      includes: `${entry.implements}, its interface (your code imports it): one add installs both`,
    }
  if (entry.defaultProvider)
    return {
      includes: `${entry.defaultProvider}, its default provider, unless the project has a provider for it: one add installs both`,
    }
  return {}
}

/**
 * The command that installs and wires a hit, as every search surface prints it. `npx mlcl` is how
 * every doc and skill spells the CLI: it runs with or without a global install, where a bare
 * `mlcl add` fails in a home that has none.
 *
 * @param name - Full package name.
 * @returns The command line.
 */
export function installCommand(name: string): string {
  return `npx mlcl add ${name} --inject`
}

/**
 * Search hits as the JSON text `mlcl search --json` prints and both MCP servers return.
 *
 * @param hits - Ranked hits from {@link searchPackages}.
 * @returns Indented JSON: one array of hits, each with its {@link installCommand}.
 */
export function searchResultsJson(hits: readonly SearchHit[]): string {
  return JSON.stringify(
    hits.map(({ includes, ...hit }) => ({
      ...hit,
      install: installCommand(hit.name),
      ...(includes ? { includes } : {}),
    })),
    null,
    2,
  )
}

/**
 * The refusal for a framework the registry does not list, or undefined when it lists it.
 *
 * @param framework - The framework the caller asked for.
 * @param appFrameworks - The registry's `appFrameworks`.
 * @returns The message every search surface shows, or undefined.
 */
export function unknownFrameworkMessage(
  framework: string,
  appFrameworks: Record<string, unknown>,
): string | undefined {
  return Object.hasOwn(appFrameworks, framework)
    ? undefined
    : `Unknown framework "${framework}". Known: ${Object.keys(appFrameworks).join(', ')}`
}

/** Where a project declares its framework, relative to its root: the app half first. */
export const FRAMEWORK_MANIFESTS: readonly string[] = ['app/package.json', 'package.json']

/**
 * The UI framework a project declares: the `molecule.framework` marker `mlcl create` writes into
 * every app's package.json, read from its app half (a full-stack project) or the root's own
 * package.json. Dependencies are not consulted: a package that merely depends on React (mlcl
 * itself, for its tests) is not a React app.
 *
 * @param readManifest - Reads one of {@link FRAMEWORK_MANIFESTS}; undefined when it is absent.
 * @returns The declared framework key, or undefined when no manifest declares one.
 */
export function declaredFramework(
  readManifest: (relativePath: string) => string | undefined,
): string | undefined {
  for (const manifest of FRAMEWORK_MANIFESTS) {
    const source = readManifest(manifest)
    if (source === undefined) continue
    let pkg: unknown
    try {
      pkg = JSON.parse(source)
    } catch (_error) {
      // An unreadable manifest declares nothing; search then ranks every framework's packages,
      // as it does outside a project.
      continue
    }
    const framework = (pkg as { molecule?: { framework?: unknown } } | null)?.molecule?.framework
    if (typeof framework === 'string' && framework) return framework
  }
  return undefined
}

/**
 * Without a framework filter, give a feature's framework counterparts one place in the ranking.
 *
 * Counterparts are packages whose names differ only in a trailing framework key of the registry's
 * `appFrameworks` (`…-react`, `…-vue`, `…-svelte`, …). The group takes the place of its best hit,
 * led by its best-scoring member and, among equal scores, by the framework `appFrameworks` lists
 * first (React). Its other members follow every other hit. Otherwise each matching feature fills
 * five places of the limit window, and a caller that names no framework sees a fifth as many
 * capabilities. A query that names a framework (`waveform angular`) still leads with that one,
 * since its name scores higher.
 *
 * @param ranked - Hits sorted by score, then name.
 * @param frameworks - The registry's `appFrameworks` keys, in its order.
 * @returns The same hits, each feature's counterparts after its leading one.
 */
function onePlacePerFeature<T extends { name: string; score: number }>(
  ranked: T[],
  frameworks: string[],
): T[] {
  if (frameworks.length === 0) return ranked
  // The longest key first, so `-react-native-web` is not read as `-web` or `-react`.
  const suffixes = [...frameworks].sort((a, b) => b.length - a.length)
  const counterpart = (name: string): { feature: string; rank: number } | undefined => {
    const key = suffixes.find((framework) => name.endsWith(`-${framework}`))
    return key
      ? { feature: name.slice(0, -key.length - 1), rank: frameworks.indexOf(key) }
      : undefined
  }
  const groups = new Map<string, Array<{ hit: T; rank: number }>>()
  for (const hit of ranked) {
    const found = counterpart(hit.name)
    if (!found) continue
    const members = groups.get(found.feature) ?? []
    members.push({ hit, rank: found.rank })
    groups.set(found.feature, members)
  }
  const leading: T[] = []
  const following: T[] = []
  const placed = new Set<string>()
  for (const hit of ranked) {
    const found = counterpart(hit.name)
    if (!found) {
      leading.push(hit)
      continue
    }
    if (placed.has(found.feature)) continue
    placed.add(found.feature)
    const [lead, ...others] = (groups.get(found.feature) ?? [])
      .sort((a, b) => b.hit.score - a.hit.score || a.rank - b.rank)
      .map(({ hit: member }) => member)
    leading.push(lead)
    following.push(...others)
  }
  return [...leading, ...following]
}
