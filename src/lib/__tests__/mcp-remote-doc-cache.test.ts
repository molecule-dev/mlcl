/**
 * `read_package_doc` must not re-download a package's npm packument per call.
 *
 * The npm registry exposes a package README only inside the FULL packument
 * (`/@molecule%2F<name>`), which nests one manifest per published version —
 * ~270 kB for a package with a few dozen versions, and growing with every
 * release, for a ~64 kB `readme` field. The tool is a public, unauthenticated
 * endpoint, so an uncached fetch made the cost per request scale with the
 * caller's call rate: the same package, asked twice, pulled and JSON-parsed the
 * whole document twice. The sibling registry/templates fetches have been cached
 * for 10 minutes all along; the doc path was the one uncached outbound call.
 *
 * A SUCCESS is cached; anything else (a rejected fetch, a body without a
 * README) is not — the file's stated policy is that a failed lookup leaves the
 * cache untouched so the next call retries the network.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it, vi } from 'vitest'

/** The `molecule-mcp` package — its own node_modules holds the MCP SDK. */
const MCP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'mcp')
/**
 * mcp is not an npm workspace member, so `npm ci` in mlcl (which is how CI
 * builds this repo) never installs its deps, and the module under test imports
 * the SDK at its top. Without the marker the static import errors and every
 * test below ERRORs — a red suite in a checkout where the sibling mcp suites
 * correctly SKIP. Absent marker = skip out loud.
 */
const DEPS_MARKER = join(MCP_DIR, 'node_modules', '@modelcontextprotocol', 'sdk', 'package.json')

/** Skip this suite, out loud, in the one environment it cannot run in. */
function skipped(ctx: { skip: () => void }): boolean {
  if (existsSync(DEPS_MARKER)) return false
  console.warn(
    '[mcp-remote-doc-cache] mcp/node_modules is not installed — SKIPPING. ' +
      'Install mcp\u2019s deps (cd mcp && npm install) so the suite runs.',
  )
  ctx.skip()
  return true
}

/** A package name unique to one test, so the module-level cache cannot leak across them. */
let seq = 0
const uniqueName = (): string => `doc-cache-test-${seq++}`

/**
 * Answer the next `fetch` calls with an npm-shaped body. The spy KEEPS its
 * arguments: the request URL is part of this tool's contract (the README only
 * exists in the FULL packument at the `%2F`-encoded scoped URL), and a stub
 * that discards every argument let that contract regress invisibly — a
 * stubbed 200 answers `registry.npmjs.org/<name>` exactly as cheerfully as
 * the real endpoint 404s it.
 */
function stubRegistry(body: unknown, opts: { reject?: Error } = {}): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async () => {
    if (opts.reject) throw opts.reject
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', spy)
  return spy
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('mcp remote package-doc fetch', () => {
  it('downloads a package README once and serves the second lookup from the cache', async (ctx) => {
    if (skipped(ctx)) return
    const { fetchPackageReadme } = await import('../../../mcp/src/remote.js')
    const name = uniqueName()
    const readme = '# Doc\n\nA published README.'
    const fetchSpy = stubRegistry({ readme })

    const first = await fetchPackageReadme(name)
    const second = await fetchPackageReadme(name)

    expect(first).toBe(readme)
    expect(second).toBe(readme)
    // The README lives only in the FULL packument — the `%2F`-encoded scoped
    // URL. An unscoped or unencoded URL is a 404 against the real registry,
    // and this stub's 200 would have hidden the regression completely.
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(`https://registry.npmjs.org/@molecule%2F${name}`)
    // The assertion that fails without the cache: two lookups, ONE request.
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('keeps one cache entry per package — a different name is fetched separately', async (ctx) => {
    if (skipped(ctx)) return
    const { fetchPackageReadme } = await import('../../../mcp/src/remote.js')
    const a = uniqueName()
    const b = uniqueName()
    const fetchSpy = stubRegistry({ readme: '# Doc' })

    await fetchPackageReadme(a)
    await fetchPackageReadme(a)
    await fetchPackageReadme(b)

    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('caches nothing when the registry carries no README, so the next call retries', async (ctx) => {
    if (skipped(ctx)) return
    const { fetchPackageReadme } = await import('../../../mcp/src/remote.js')
    const name = uniqueName()
    // A 404 body is exactly this shape, and a package published before its
    // README lands resolves here too — neither may be remembered as "no doc".
    const fetchSpy = stubRegistry({ error: 'Not found' })

    expect(await fetchPackageReadme(name)).toBeUndefined()
    expect(await fetchPackageReadme(name)).toBeUndefined()

    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('caches nothing when the fetch fails, so a transient failure does not stick', async (ctx) => {
    if (skipped(ctx)) return
    const { fetchPackageReadme } = await import('../../../mcp/src/remote.js')
    const name = uniqueName()
    const failing = stubRegistry({}, { reject: new Error('ECONNRESET') })

    await expect(fetchPackageReadme(name)).rejects.toThrow(/ECONNRESET/)
    expect(failing).toHaveBeenCalledTimes(1)

    const healthy = stubRegistry({ readme: '# Back' })
    expect(await fetchPackageReadme(name)).toBe('# Back')
    expect(healthy).toHaveBeenCalledTimes(1)
  })

  it('evicts the least recently USED entry, so a re-read package survives the cap', async (ctx) => {
    if (skipped(ctx)) return
    const { fetchPackageReadme, README_CACHE_LIMIT } = await import('../../../mcp/src/remote.js')
    // The cap exists because a cached entry is a ~270 kB packument that grows
    // with every publish — but evicting by INSERTION order (a Map keeps its
    // order, and re-setting an existing key does not move it) evicted the
    // package a caller had just re-read, so the working set the cache is for (a
    // client asking about the same packages repeatedly) still re-fetched the
    // whole document on every call past the cap.
    const fetchSpy = stubRegistry({ readme: '# Lru' })
    // Fill past the cap, so the entries below are exactly the last LIMIT
    // inserted (each earlier one has already been evicted).
    const names = Array.from({ length: README_CACHE_LIMIT + 5 }, () => uniqueName())
    for (const name of names) await fetchPackageReadme(name)
    const filled = fetchSpy.mock.calls.length
    expect(filled).toBe(names.length)

    const oldest = names[names.length - README_CACHE_LIMIT] as string
    const nextOldest = names[names.length - README_CACHE_LIMIT + 1] as string

    // Re-read the oldest cached entry — it is now the most recently USED…
    await fetchPackageReadme(oldest)
    expect(
      fetchSpy,
      'a re-read of a cached package must not hit the network',
    ).toHaveBeenCalledTimes(filled)

    // …so a NEW package at the cap evicts the entry that was not touched since
    // it was cached, and the re-read one survives.
    await fetchPackageReadme(uniqueName())
    expect(fetchSpy).toHaveBeenCalledTimes(filled + 1)
    await fetchPackageReadme(oldest)
    expect(
      fetchSpy,
      'the re-read package must still be cached (an insertion-order cap evicts it)',
    ).toHaveBeenCalledTimes(filled + 1)
    await fetchPackageReadme(nextOldest)
    expect(
      fetchSpy,
      'the package untouched since it was cached is the one evicted',
    ).toHaveBeenCalledTimes(filled + 2)
  })

  it('re-fetches once the cached entry is older than the 10-minute TTL', async (ctx) => {
    if (skipped(ctx)) return
    const { fetchPackageReadme } = await import('../../../mcp/src/remote.js')
    // An entry that never expires would pass every count-based assertion
    // above: the TTL is half the cache policy, and only the clock can reach it.
    vi.useFakeTimers()
    try {
      const name = uniqueName()
      const fetchSpy = stubRegistry({ readme: '# Ttl' })

      await fetchPackageReadme(name)
      await fetchPackageReadme(name)
      expect(fetchSpy).toHaveBeenCalledTimes(1)

      vi.setSystemTime(Date.now() + 10 * 60_000 + 1)
      await fetchPackageReadme(name)
      expect(fetchSpy, 'a stale entry must re-fetch').toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('evicts the oldest entry once the cache passes its cap', async (ctx) => {
    if (skipped(ctx)) return
    const { fetchPackageReadme, README_CACHE_LIMIT } = await import('../../../mcp/src/remote.js')
    // The cap keeps a long-lived server from holding one doc per fleet package.
    // Fill past the limit, then ask for the OLDEST and the NEWEST: the oldest
    // must have been evicted (a fresh network call), the newest must still be
    // served from the cache.
    const fetchSpy = stubRegistry({ readme: '# Cap' })
    const names = Array.from({ length: README_CACHE_LIMIT + 1 }, () => uniqueName())
    for (const name of names) await fetchPackageReadme(name)
    const filled = fetchSpy.mock.calls.length
    expect(filled).toBe(names.length)

    await fetchPackageReadme(names[0])
    expect(fetchSpy, 'the oldest entry must have been evicted at the cap').toHaveBeenCalledTimes(
      filled + 1,
    )

    await fetchPackageReadme(names[names.length - 1])
    expect(fetchSpy, 'the newest entry must still be cached').toHaveBeenCalledTimes(filled + 1)
  })
})
