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
 * `mcp/scripts/generate-package-search.mjs`; `src/lib/__tests__/mcp-search-owner-drift.test.ts`
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
  intentHints?: readonly string[]
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
  /** Maximum number of hits. */
  limit?: number
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
 * @param options - Optional stack restriction and result limit.
 * @returns Ranked hits (score stripped), at most `limit` of them.
 */
export function searchPackages(
  entries: Iterable<SearchSourceEntry>,
  query: string,
  options: SearchOptions = {},
): SearchHit[] {
  const { stack, limit = DEFAULT_SEARCH_LIMIT } = options
  const ranked: Array<SearchHit & { score: number }> = []
  for (const entry of entries) {
    // The rule `loadRegistry(stack)` applies — declared stack equality — kept
    // here so the transport that has no loader (hosted MCP) filters identically.
    if (stack && entry.stack !== stack) continue
    const score = scoreSearchEntry(entry, query)
    if (score <= 0) continue
    ranked.push({
      name: entry.name,
      stack: resolveStack(entry),
      category: entry.category ?? '',
      label: entry.label ?? entry.name,
      description: entry.description ?? '',
      score,
    })
  }
  return ranked
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ score: _score, ...hit }) => hit)
}
