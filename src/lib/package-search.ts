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
export interface SearchSourceEntry {
  /** Full package name, e.g. `@molecule/api-payments-stripe`. */
  name: string
  /** Declared stack. Absent only in a malformed/legacy registry entry. */
  stack?: 'api' | 'app'
  category?: string
  label?: string
  description?: string
  exports?: readonly string[]
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
   * caller knows which one its project can import.
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
  return entry.stack ?? (entry.name.includes('/app-') ? 'app' : 'api')
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
  if (exactSymbol) score += 160
  // A short query can name both a category and a common export (e.g. query).
  // Keep that category and its providers ahead of unrelated symbol owners.
  if (entry.category && phrase(entry.category) === query) score += 160
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
  const ranked: Array<SearchHit & { score: number }> = []
  for (const entry of entries) {
    // The rule `loadRegistry(stack)` applies — declared stack equality — kept
    // here so the transport that has no loader (hosted MCP) filters identically.
    if (stack && entry.stack !== stack) continue
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
    ranked.push({
      name: entry.name,
      stack: resolveStack(entry),
      category: entry.category ?? '',
      label: entry.label ?? entry.name,
      description: entry.description ?? '',
      ...(configuration.length > 0 ? { configuration } : {}),
      score,
    })
  }
  return ranked
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ score: _score, ...hit }) => hit)
}
