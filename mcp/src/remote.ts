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
 *     README for each @molecule/* package)
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

interface RegistryEntry {
  description?: string
  type?: string
  stack?: 'api' | 'app'
  category?: string
  label?: string
  intentHints?: string[]
}

const cache = new Map<string, { at: number; data: unknown }>()

async function fetchJson<T>(url: string, file?: string): Promise<T> {
  const key = file ?? url
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data as T
  const data: T = file
    ? (JSON.parse(readFileSync(file, 'utf8')) as T)
    : ((await (await fetch(url)).json()) as T)
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
        const meta = (await (
          await fetch(`https://registry.npmjs.org/@molecule%2F${short}`)
        ).json()) as {
          readme?: string
        }
        if (meta.readme && meta.readme.length > 0) {
          const doc = meta.readme
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
