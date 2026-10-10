/**
 * molecule-mcp REMOTE mode — the hosted, read-only face of the server.
 *
 * Vibecoding platforms (Lovable chat connectors, v0 MCP integrations,
 * bolt.new Connectors) and any client preferring a URL over a local process
 * connect to this via HTTP transport. The stdio server in server.ts wraps a
 * LOCAL mlcl; this one needs no local install at all, so its tools are the
 * read/discovery layer, sourced live:
 *
 *   - registry + templates fetched from the public mlcl repo (raw GitHub),
 *     env-overridable (MOLECULE_REGISTRY_URL / MOLECULE_TEMPLATES_URL or
 *     *_FILE for local dev), cached 10 minutes
 *   - package docs from the npm registry API (the authoritative published
 *     README for each @molecule/* package), also cached 10 minutes
 */
import { readFileSync } from 'node:fs'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { serverVersion, tracked } from './telemetry.js'

const REGISTRY_URL =
  process.env.MOLECULE_REGISTRY_URL ??
  'https://raw.githubusercontent.com/molecule-dev/mlcl/main/registry.json'
const REGISTRY_FILE = process.env.MOLECULE_REGISTRY_FILE
const TEMPLATES_URL =
  process.env.MOLECULE_TEMPLATES_URL ??
  'https://raw.githubusercontent.com/molecule-dev/mlcl/main/templates/apps/registry.json'
const TEMPLATES_FILE = process.env.MOLECULE_TEMPLATES_FILE
const CACHE_TTL_MS = 10 * 60_000

/**
 * Bound on every outbound fetch this server makes (the mlcl repo's
 * registry/templates and the npm registry's package metadata). Node's undici
 * defaults let an upstream that accepts and then stalls hold the call — and
 * with it the client's whole HTTP request — for ~5 minutes; a hung
 * raw.githubusercontent.com must fail the tool call in seconds instead. The
 * failure is the caller's to surface: a timed-out fetch leaves the cache
 * untouched, so the next call retries the network (and a stale entry keeps
 * serving until its TTL, never a failed one).
 */
export const FETCH_TIMEOUT_MS = 15_000

interface RegistryEntry {
  description?: string
  type?: string
  stack?: 'api' | 'app'
  category?: string
  label?: string
  intentHints?: string[]
}

const cache = new Map<string, { at: number; data: unknown }>()

/**
 * Resolved package READMEs, keyed by the npm package name, with the same TTL as
 * {@link cache}.
 *
 * The npm registry serves a README only inside the FULL packument for a package
 * — `https://registry.npmjs.org/@molecule%2F<name>` — which nests one manifest
 * per published VERSION (`/<name>/latest` carries no `readme`). At this fleet's
 * release cadence that document is ~270 kB for a package with a few dozen
 * versions, and it grows with every publish, while the tool only ever reads the
 * one `readme` field (~64 kB). Without a cache, every `read_package_doc` call —
 * a public, unauthenticated endpoint — re-downloaded and re-parsed the whole
 * thing, so a client asking about the same package repeatedly paid the full
 * egress and CPU each time (and the load on registry.npmjs.org scaled with the
 * call rate rather than the package count). Only a SUCCESSFUL lookup is cached:
 * a missing/unreadable README keeps the file's own policy — the next call
 * retries the network — and the map is capped so a long-lived server cannot
 * accumulate one cached doc per package name in the fleet.
 */
const README_CACHE_TTL_MS = 10 * 60_000
const README_CACHE_LIMIT = 50
const readmeCache = new Map<string, { at: number; readme: string }>()

/**
 * Fetch a package's published README from the npm registry, cached per package.
 *
 * The network branch is bounded by {@link FETCH_TIMEOUT_MS} (`timeoutMs`
 * shortens it for tests, like {@link fetchJson}). A fetched body with no
 * `readme` resolves to `undefined`; a rejected or aborted fetch REJECTS, the
 * same as {@link fetchJson} — the caller's own try/catch is the fallback (see
 * the `read_package_doc` handler). Neither case caches anything, so the next
 * call retries the network.
 *
 * @param short - Package name WITHOUT the `@molecule/` scope.
 * @param timeoutMs - Abort bound for the outbound fetch.
 * @returns The published README, or undefined when the registry has none.
 */
export async function fetchPackageReadme(
  short: string,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<string | undefined> {
  const hit = readmeCache.get(short)
  if (hit && Date.now() - hit.at < README_CACHE_TTL_MS) return hit.readme
  const meta = (await (
    await fetch(`https://registry.npmjs.org/@molecule%2F${short}`, {
      signal: AbortSignal.timeout(timeoutMs),
    })
  ).json()) as { readme?: string }
  if (typeof meta.readme !== 'string' || meta.readme.length === 0) return undefined
  if (readmeCache.size >= README_CACHE_LIMIT && !readmeCache.has(short)) {
    const oldest = readmeCache.keys().next().value
    if (oldest !== undefined) readmeCache.delete(oldest)
  }
  readmeCache.set(short, { at: Date.now(), readme: meta.readme })
  return meta.readme
}

/**
 * Fetch (and cache) the registry/templates JSON, or read it from a local file.
 *
 * The network branch is bounded by {@link FETCH_TIMEOUT_MS}; `timeoutMs`
 * shortens that bound — the timeout regression test drives a never-responding
 * local server through it, which the 15 s default would make a 5-minute test.
 * A failed (timed-out, rejected, or non-2xx) fetch throws without touching the
 * cache, so the next call retries the network.
 */
export async function fetchJson<T>(
  url: string,
  file?: string,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<T> {
  const key = file ?? url
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data as T
  let data: T
  if (file) {
    data = JSON.parse(readFileSync(file, 'utf8')) as T
  } else {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    // A non-2xx answer is a FAILURE, not a payload. An error body deserializes
    // as happily as the registry does — a 404 whose body is `{"error":"Not
    // found"}`, a proxy's 503 `{"message":…}` — so without this gate that body
    // is returned AS the registry/templates and cached, and every call for the
    // next 10 minutes serves it (search_packages then dies on
    // `Object.entries(undefined)` instead of reporting the upstream failure).
    if (!response.ok) {
      throw new Error(`GET ${url} failed: HTTP ${response.status}`)
    }
    data = (await response.json()) as T
  }
  cache.set(key, { at: Date.now(), data })
  return data
}

/** Same scoring shape as `mlcl search` — name match dominates, intent/category tokens follow. */
function scoreEntry(name: string, entry: RegistryEntry, q: string): number {
  const short = name.replace('@molecule/', '')
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return 0
  let score = 0
  for (const tok of tokens) {
    if (short === tok) score += 40
    else if (short.includes(tok)) score += 20
    if (entry.category?.includes(tok)) score += 8
    if (entry.intentHints?.some((h) => h.includes(tok) || tok.includes(h))) score += 6
    if (entry.description?.toLowerCase().includes(tok)) score += 3
    if (entry.label?.toLowerCase().includes(tok)) score += 3
  }
  return score
}

const text = (t: string): { content: Array<{ type: 'text'; text: string }> } => ({
  content: [{ type: 'text' as const, text: t }],
})

export function buildRemoteServer(): McpServer {
  // The package.json version, not a hardcoded copy — the literal here went
  // stale on the first package bump and every client's initialize response
  // then reported a server that was not deployed.
  const server = new McpServer({ name: 'molecule-remote', version: serverVersion() })

  server.registerTool(
    'search_packages',
    {
      title: 'Search @molecule packages',
      description:
        'Search the @molecule/* package fleet by name or capability (e.g. "payments", "social login"). Returns matching packages with stack, category, and install command. Prefer an existing package over hand-rolling any capability.',
      inputSchema: {
        query: z.string().describe('Capability or package-name query'),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    tracked('search_packages', async ({ query, limit }) => {
      const registry = await fetchJson<{ packages: Record<string, RegistryEntry> }>(
        REGISTRY_URL,
        REGISTRY_FILE,
      )
      const packages = registry.packages
      const hits = Object.entries(packages)
        .map(([name, entry]) => ({
          name,
          stack: entry.stack ?? (name.includes('/app-') ? 'app' : 'api'),
          category: entry.category ?? '',
          description: entry.description ?? '',
          score: scoreEntry(name, entry, query),
        }))
        .filter((h) => h.score > 0)
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
        .slice(0, limit ?? 20)
        .map(({ score: _score, ...hit }) => ({
          ...hit,
          install: `npx mlcl add ${hit.name} --inject`,
        }))
      return text(JSON.stringify(hits, null, 2))
    }),
  )

  server.registerTool(
    'list_templates',
    {
      title: 'List molecule app templates',
      description:
        'List the flagship full-stack app templates (blog, crm, team-chat, …) — the fastest starting point for a new app.',
      inputSchema: {},
    },
    tracked('list_templates', async () => {
      const t = await fetchJson<{
        templates: Record<
          string,
          { label?: string; description?: string; type?: string; packages?: string[] }
        >
      }>(TEMPLATES_URL, TEMPLATES_FILE)
      const list = Object.entries(t.templates ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([slug, e]) => ({
          slug,
          label: e.label ?? slug,
          description: e.description ?? '',
          type: e.type ?? 'full-stack',
          packageCount: e.packages?.length ?? 0,
          create: `npx mlcl create my-app --template ${slug} --no-interactive`,
        }))
      return text(JSON.stringify(list, null, 2))
    }),
  )

  server.registerTool(
    'read_package_doc',
    {
      title: 'Read a package README',
      description:
        "Fetch a @molecule/* package's generated usage reference (API, examples, wiring) — the authoritative published doc.",
      inputSchema: {
        name: z.string().describe('Package name, with or without the @molecule/ scope'),
      },
    },
    tracked('read_package_doc', async ({ name }) => {
      const short = name.replace(/^@molecule\//, '')
      if (!/^[A-Za-z0-9._-]+$/.test(short)) {
        return text(`Invalid package name "${short}" — expected @molecule/<name>.`)
      }
      try {
        const doc = await fetchPackageReadme(short)
        if (doc) {
          if (doc.length > 100_000)
            return text(
              `${doc.slice(0, 100_000)}\n\n[…truncated — full doc: https://www.molecule.dev/packages/${short}]`,
            )
          return text(doc)
        }
      } catch (_error) {
        // fall through to the pointer below
      }
      return text(
        `Doc not fetched for @molecule/${short} — browse https://www.molecule.dev/packages/${short}`,
      )
    }),
  )

  server.registerResource(
    'conventions',
    'molecule://conventions',
    {
      title: 'The molecule way',
      description:
        'The molecule conventions for building and extending apps — packages before hand-rolled code, bonds for providers, ClassMap styling, i18n text, plus the mlcl quickstart.',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [
        {
          uri: 'molecule://conventions',
          mimeType: 'text/markdown',
          // Bundled copy of mlcl's templates/shared/agent-init-section.md.tpl —
          // keep the two in sync when the doctrine changes.
          text: readFileSync(new URL('../assets/conventions.md', import.meta.url), 'utf8'),
        },
      ],
    }),
  )

  return server
}
