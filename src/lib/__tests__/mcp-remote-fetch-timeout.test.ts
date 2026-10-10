/**
 * The remote MCP server's outbound fetches (the mlcl repo's
 * registry/templates, the npm registry's package metadata) used to carry no
 * timeout. Node's undici defaults let an upstream that accepts the
 * connection and then stalls hold the call — and with it the client's whole
 * HTTP request — for ~5 minutes, while every other outbound path in this
 * package (telemetry) bounds its calls at 5 s. The fetches are now bounded by
 * AbortSignal.timeout: a hung upstream fails the tool call in seconds, leaves
 * the cache untouched (the next call retries the network), and a healthy
 * upstream is unaffected.
 *
 * The never-responding server below is the shape no stub of `fetch` can
 * produce honestly: the socket connects, the request is delivered, and no
 * response ever comes.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { type AddressInfo, createServer, type Server, type ServerResponse } from 'node:http'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { FETCH_TIMEOUT_MS, fetchJson } from '../../../mcp/src/remote.js'

const MCP_REMOTE = join(import.meta.dirname, '..', '..', '..', 'mcp', 'src', 'remote.ts')

/**
 * The full text of every `fetch(...)` call in `source`, scanned with balanced
 * parentheses so each call's own arguments are inspected as a unit (a call
 * wraps its URL and options across lines).
 *
 * @param source - Module source to scan.
 * @returns Each call's text, from `fetch(` through its closing paren.
 */
function fetchCallsIn(source: string): string[] {
  const calls: string[] = []
  const re = /\bfetch\s*\(/g
  let match: RegExpExecArray | null
  while ((match = re.exec(source)) !== null) {
    let depth = 0
    let end = match.index + match[0].length - 1
    for (; end < source.length; end++) {
      if (source[end] === '(') depth++
      else if (source[end] === ')') {
        depth--
        if (depth === 0) break
      }
    }
    calls.push(source.slice(match.index, end + 1))
  }
  return calls
}

let server: Server | null = null

afterEach(async () => {
  if (server) {
    await new Promise((resolve) => server!.close(resolve))
    server = null
  }
})

async function listen(handler: (req: unknown, res: ServerResponse) => void): Promise<string> {
  server = createServer(handler as never)
  await new Promise((resolve) => server!.listen(0, '127.0.0.1', resolve))
  return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`
}

describe('mcp remote outbound fetch timeout', () => {
  it('fails fast when the upstream accepts and never responds — then recovers', async () => {
    // The same origin plays both roles: it hangs until `respond` flips, then
    // answers — so the second call proves a timed-out fetch cached nothing
    // and the tool recovers on its next attempt without a restart.
    let respond = false
    const base = await listen((_req, res) => {
      if (!respond) return // hold the connection open, never reply
      res.setHeader('content-type', 'application/json')
      res.end('{"packages":{}}')
    })
    const url = `${base}/registry.json`

    const startedAt = Date.now()
    await expect(fetchJson(url, undefined, 250)).rejects.toThrow(/abort|timeout/i)
    const elapsed = Date.now() - startedAt
    // The undici default this replaces is ~5 minutes; the bound must actually
    // be doing the work, or this test would itself hang for minutes.
    expect(elapsed).toBeLessThan(10_000)

    respond = true
    await expect(fetchJson(url, undefined, 2_000)).resolves.toEqual({ packages: {} })
  })

  it('treats a non-2xx JSON body as a failure and caches nothing — the next call retries', async () => {
    // The shape no thrown fetch produces: the upstream ANSWERS, with an HTTP
    // error and a JSON error body. `res.json()` resolves on it exactly as it
    // would on the registry, so without the ok-gate the body was returned AS
    // the registry AND cached — search_packages then threw
    // `Object.entries(undefined)` and every call for the next 10 minutes got
    // the same error body instead of retrying the network.
    let hits = 0
    const base = await listen((_req, res) => {
      hits++
      res.statusCode = 503
      res.setHeader('content-type', 'application/json')
      res.end('{"error":"service unavailable"}')
    })
    const url = `${base}/registry.json`

    await expect(fetchJson(url, undefined, 2_000)).rejects.toThrow(/HTTP 503/)
    await expect(fetchJson(url, undefined, 2_000)).rejects.toThrow(/HTTP 503/)
    // Two attempts, two requests: a FAILED answer must never be cached.
    expect(hits).toBe(2)
  })

  it('serves a healthy upstream and caches it (the bound adds no overhead path)', async () => {
    let hits = 0
    const base = await listen((_req, res) => {
      hits++
      res.setHeader('content-type', 'application/json')
      res.end('{"templates":{}}')
    })

    const first = await fetchJson(`${base}/templates.json`, undefined, 2_000)
    const second = await fetchJson(`${base}/templates.json`, undefined, 2_000)
    expect(first).toEqual({ templates: {} })
    expect(second).toEqual(first)
    expect(hits).toBe(1)
  })

  it('ships a default bound in the same class as telemetry’s 5 s', () => {
    // Guards the export the two wiring sites name: a bound removed or raised
    // to an undici-default-scale value fails here before any client waits on it.
    expect(FETCH_TIMEOUT_MS).toBeGreaterThanOrEqual(1_000)
    expect(FETCH_TIMEOUT_MS).toBeLessThanOrEqual(60_000)
  })

  it('wires the bound into every outbound fetch in remote.ts', () => {
    // fetchJson's signal is driven by the two tests above; read_package_doc's
    // inline npm fetch has no test seam, so its wiring is pinned at the
    // source — the same shape the version test pins remote.ts with.
    //
    // The bound must be in THAT call's OWN argument list. Counting `fetch(`
    // against `signal: AbortSignal.timeout(` in isolation could be balanced by
    // an unrelated call carrying an extra inline signal, so an unbounded fetch
    // added anywhere in the file stayed green — the exact ~5-minute stall this
    // guard exists to prevent.
    const source = readFileSync(MCP_REMOTE, 'utf-8')
    const calls = fetchCallsIn(source)
    expect(calls.length).toBeGreaterThanOrEqual(2)
    for (const call of calls) {
      expect(call, `an outbound fetch is missing its AbortSignal bound:\n${call}`).toMatch(
        /signal: AbortSignal\.timeout\(/,
      )
    }
  })
})
