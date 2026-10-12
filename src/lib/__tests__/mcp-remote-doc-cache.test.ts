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

import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
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
function stubRegistry(
  body: unknown,
  opts: { reject?: Error; status?: number } = {},
): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async () => {
    if (opts.reject) throw opts.reject
    return new Response(JSON.stringify(body), {
      status: opts.status ?? 200,
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

  it('shares one outbound fetch between callers that ask for the SAME package at once', async (ctx) => {
    if (skipped(ctx)) return
    const { fetchPackageReadme } = await import('../../../mcp/src/remote.js')
    const name = uniqueName()
    // A fetch that stays parked: the cache read and the cache write straddle
    // this await, so a caller arriving during it found neither the entry nor
    // anything in flight — it missed the cache too and started its OWN request.
    // Two (or ten) callers asking for one uncached package therefore pulled the
    // whole ~270 kB packument each, which is exactly the "load scales with the
    // call rate rather than the package count" defect the cache exists to
    // remove, still reachable at the moment load is highest.
    let release: (() => void) | null = null
    const spy = vi.fn(async () => {
      await new Promise<void>((resolve) => {
        release = resolve
      })
      return new Response(JSON.stringify({ readme: '# Shared' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', spy)

    const first = fetchPackageReadme(name)
    const second = fetchPackageReadme(name)

    // The assertion that fails without the shared in-flight entry: two callers,
    // ONE request — and it is made before either has settled.
    expect(spy).toHaveBeenCalledTimes(1)

    release!()
    expect(await first).toBe('# Shared')
    expect(await second).toBe('# Shared')
    // …and the settled value is cached, so a later caller does not ask again.
    expect(await fetchPackageReadme(name)).toBe('# Shared')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('shares one outbound fetch for a registry/templates document too', async (ctx) => {
    if (skipped(ctx)) return
    const { fetchJson, isRegistryPayload } = await import('../../../mcp/src/remote.js')
    // The same straddle as above, on the sibling loader: the registry document
    // is ~1.5 MB and is fetched by search_packages on every uncached call.
    const url = `https://example.test/registry-${uniqueName()}.json`
    let release: (() => void) | null = null
    const spy = vi.fn(async () => {
      await new Promise<void>((resolve) => {
        release = resolve
      })
      return new Response(JSON.stringify({ packages: { '@molecule/api-fixture': {} } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', spy)

    const first = fetchJson<{ packages: Record<string, unknown> }>(
      url,
      undefined,
      1_000,
      isRegistryPayload,
    )
    const second = fetchJson<{ packages: Record<string, unknown> }>(
      url,
      undefined,
      1_000,
      isRegistryPayload,
    )

    expect(spy).toHaveBeenCalledTimes(1)

    release!()
    expect((await first).packages['@molecule/api-fixture']).toEqual({})
    expect((await second).packages['@molecule/api-fixture']).toEqual({})
  })

  it('a cache entry another reader’s check admitted is re-checked by THIS caller’s', async (ctx) => {
    if (skipped(ctx)) return
    // The cache key is the document's SOURCE (url or file), not its shape, and
    // the entry holds whatever the FIRST reader's check admitted. Handing it to
    // a reader that declares a DIFFERENT shape for the same source — without
    // running that reader's own check — answered list_templates with a registry
    // document, whose missing `templates` section then died on
    // `Object.entries(undefined)` inside the handler: the exact crash the shape
    // check exists to prevent, reached through the cache instead of the fetch.
    const { fetchJson, isRegistryPayload, isTemplatesPayload, clearRemoteCaches } =
      await import('../../../mcp/src/remote.js')
    const dir = mkdtempSync(join(tmpdir(), 'mlcl-remote-json-check-'))
    const file = join(dir, 'document.json')
    writeFileSync(file, JSON.stringify({ packages: { '@molecule/api-fixture': {} } }))
    try {
      // The registry reader goes first: its check admits the payload, which is
      // what puts it in the cache the second reader reads.
      const registry = await fetchJson<{ packages: Record<string, unknown> }>(
        file,
        file,
        1_000,
        isRegistryPayload,
      )
      expect(registry.packages['@molecule/api-fixture']).toEqual({})

      // …and the templates reader must get its OWN refusal, not the foreign
      // payload resolved as its declared type.
      await expect(
        fetchJson<{ templates: Record<string, unknown> }>(file, file, 1_000, isTemplatesPayload),
      ).rejects.toThrow(/did not return the expected payload/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
      clearRemoteCaches()
    }
  })

  it('a fetch shared while in flight is re-checked by the sharer’s own check too', async (ctx) => {
    if (skipped(ctx)) return
    // The sharing path is the cache path one step earlier: the parked work
    // carries the FIRST caller's check, so a caller that declares a different
    // shape and shares it must apply its own before treating the answer as its
    // declared type. One request is still all either caller pays for.
    const { fetchJson, isRegistryPayload, isTemplatesPayload, clearRemoteCaches } =
      await import('../../../mcp/src/remote.js')
    const url = `https://example.test/registry-${uniqueName()}.json`
    let release: (() => void) | null = null
    const spy = vi.fn(async () => {
      await new Promise<void>((resolve) => {
        release = resolve
      })
      return new Response(JSON.stringify({ packages: { '@molecule/api-fixture': {} } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', spy)

    try {
      const registry = fetchJson<{ packages: Record<string, unknown> }>(
        url,
        undefined,
        1_000,
        isRegistryPayload,
      )
      const templates = fetchJson<{ templates: Record<string, unknown> }>(
        url,
        undefined,
        1_000,
        isTemplatesPayload,
      )

      // Still ONE outbound request — the refusal must not come from a second
      // fetch, or the sharing the cache exists for is gone.
      expect(spy).toHaveBeenCalledTimes(1)

      release!()
      expect((await registry).packages['@molecule/api-fixture']).toEqual({})
      await expect(templates).rejects.toThrow(/did not return the expected payload/)
    } finally {
      clearRemoteCaches()
    }
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

  it('treats a non-2xx registry answer as a failure and caches nothing — the next call retries', async (ctx) => {
    if (skipped(ctx)) return
    const { fetchPackageReadme } = await import('../../../mcp/src/remote.js')
    const name = uniqueName()
    // The shape no thrown fetch produces: the registry ANSWERS — a 429 rate
    // limit or a 503 outage, both routine for unauthenticated packument
    // traffic — and its JSON error body deserializes as happily as a packument
    // does. Without the ok-gate the body had no `readme`, so the call resolved
    // `undefined` and the client read "doc not fetched" — the SAME sentence a
    // package that genuinely has no README gets — instead of the upstream
    // failure, and nothing distinguished an outage from a doc-less package.
    const failing = stubRegistry({ error: 'too many requests' }, { status: 429 })

    await expect(fetchPackageReadme(name)).rejects.toThrow(/HTTP 429/)
    await expect(fetchPackageReadme(name)).rejects.toThrow(/HTTP 429/)
    // Two attempts, two requests: a FAILED answer must never be cached.
    expect(failing).toHaveBeenCalledTimes(2)

    // …and recovery needs no restart: a healthy answer after the outage lands.
    const healthy = stubRegistry({ readme: '# After the outage' })
    expect(await fetchPackageReadme(name)).toBe('# After the outage')
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

      // Just INSIDE the documented window the entry still serves. Without this
      // probe the suite only pinned "a lookup ten minutes later re-fetches" —
      // true for ANY TTL at or under ten minutes, so a cache shortened to one
      // minute kept every assertion green while doing none of what the module
      // and the README promise ("cached 10 minutes"). The clock moves in steps,
      // so the entry's age is measured from the fetch above throughout.
      vi.setSystemTime(Date.now() + 9 * 60_000)
      await fetchPackageReadme(name)
      expect(fetchSpy, 'an entry inside its TTL must not re-fetch').toHaveBeenCalledTimes(1)

      // …and just past it, it does.
      vi.setSystemTime(Date.now() + 60_000 + 1)
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
