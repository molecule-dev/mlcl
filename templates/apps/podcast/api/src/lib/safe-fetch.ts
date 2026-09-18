import { lookup as dnsLookup } from 'node:dns'
import net from 'node:net'

import { Agent } from 'undici'

/** True for an IPv4 address in any private/loopback/link-local/CGNAT/reserved range. */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true
  const [a, b] = parts as [number, number, number, number]
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) || // link-local incl. cloud metadata 169.254.169.254
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    a >= 224 // multicast / reserved
  )
}

/** True for an IPv6 loopback/unspecified/unique-local/link-local (or mapped-private v4). */
export function isPrivateIPv6(ip: string): boolean {
  const s = ip.toLowerCase()
  if (s === '::1' || s === '::') return true
  if (s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe80')) return true
  // IPv4-mapped IPv6 in dotted-decimal form, e.g. ::ffff:169.254.169.254.
  const mappedDotted = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mappedDotted) return isPrivateIPv4(mappedDotted[1] as string)
  // IPv4-mapped IPv6 in the parser-normalized HEX form, e.g. ::ffff:a9fe:a9fe.
  // The WHATWG URL parser (`new URL('http://[::ffff:169.254.169.254]/')`) ALWAYS
  // emits this hex form, never the dotted one — so this branch, not the dotted
  // one above, is what actually fires on the safeFetch() path. Reconstruct the
  // embedded 32-bit IPv4 from the two 16-bit groups and classify it.
  const mappedHex = s.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (mappedHex) {
    const hi = parseInt(mappedHex[1] as string, 16)
    const lo = parseInt(mappedHex[2] as string, 16)
    return isPrivateIPv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`)
  }
  // Fail closed: any other IPv4-mapped / v4-embedded form we cannot parse here
  // (e.g. the deprecated ::ffff:0:HHHH:HHHH variant) is treated as private/blocked
  // rather than falling through to "public".
  if (s.startsWith('::ffff:')) return true
  return false
}

/** True if `ip` (a literal IPv4/IPv6 string) is private/internal/metadata. */
export function isPrivateAddress(ip: string): boolean {
  return net.isIPv6(ip) ? isPrivateIPv6(ip) : isPrivateIPv4(ip)
}

/**
 * A shared undici dispatcher whose connect-time DNS lookup refuses any host that
 * resolves to a private/internal/metadata address. Validation happens in the SAME
 * resolution undici uses to open the socket, so there is NO validate-then-connect
 * TOCTOU / DNS-rebinding window (the flaw a separate pre-fetch `dns.lookup` has —
 * the host could rebind to 169.254.169.254 between the check and the connect).
 */
const ssrfSafeAgent = new Agent({
  connect: {
    lookup(hostname, options, callback): void {
      dnsLookup(hostname, { ...(options ?? {}), all: true, verbatim: true }, (err, addresses) => {
        if (err) {
          callback(err, '', 0)
          return
        }
        const list = (Array.isArray(addresses) ? addresses : [addresses]) as Array<{
          address: string
          family: number
        }>
        for (const a of list) {
          if (isPrivateAddress(a.address)) {
            callback(new Error('Refusing to connect to a private/internal address (SSRF)'), '', 0)
            return
          }
        }
        if (options && (options as { all?: boolean }).all) callback(null, list as never, 0)
        else callback(null, list[0].address, list[0].family)
      })
    },
  },
})

/**
 * Hosts the operator has EXPLICITLY exempted from the private-address block,
 * via `SAFE_FETCH_ALLOW_HOSTS` — a comma-separated list of `host` or
 * `host:port` entries (e.g. `127.0.0.1:9099,receiver.internal`). Off by
 * default (empty ⇒ nothing is exempt). This is the deliberate opt-in for
 * delivering to a known-trusted local/internal receiver (local development,
 * E2E harnesses, an internal service you own) — each entry names one exact
 * host, so the SSRF posture for everything else is unchanged.
 */
const allowedHosts = (): Set<string> =>
  new Set(
    (process.env.SAFE_FETCH_ALLOW_HOSTS ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  )

/**
 * SSRF-safe replacement for `fetch` when the URL is (or derives from) untrusted input.
 * Only http(s) is allowed; the connection is pinned away from private/internal/metadata
 * addresses (both IP-literal hosts — checked synchronously since they skip DNS — and
 * hostnames — validated inside the connect lookup). Redirects are not auto-followed so
 * a 3xx cannot rebind to an internal host. Hosts explicitly allow-listed via
 * `SAFE_FETCH_ALLOW_HOSTS` skip the private-address pinning (see `allowedHosts`).
 *
 * @param rawUrl - The (untrusted) URL to fetch.
 * @param init - Standard fetch init.
 * @returns The fetch Response.
 */
export async function safeFetch(rawUrl: string, init?: RequestInit): Promise<Response> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch (error) {
    throw new Error('Invalid URL', { cause: error })
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are allowed')
  }
  // Operator-allow-listed hosts (exact `host:port` or `host` match) are
  // trusted by explicit configuration — skip the private-address pinning but
  // keep manual redirects so a 3xx can't bounce elsewhere.
  const allow = allowedHosts()
  if (allow.has(url.host.toLowerCase()) || allow.has(url.hostname.toLowerCase())) {
    return fetch(url, { ...init, redirect: 'manual' })
  }
  // IP-literal hosts skip DNS (connect.lookup is never called), so check them here.
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (net.isIP(host) && isPrivateAddress(host)) {
    throw new Error('URL targets a private/internal address (blocked)')
  }
  return fetch(url, {
    ...init,
    redirect: 'manual',
    dispatcher: ssrfSafeAgent,
  } as RequestInit & { dispatcher: Agent })
}
