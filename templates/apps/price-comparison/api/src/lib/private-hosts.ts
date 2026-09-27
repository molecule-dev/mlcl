import { lookup as dnsLookup } from 'node:dns'
import net from 'node:net'

/**
 * SSRF classification for admin-configured fetch targets (the same ranges
 * the fleet's safe-fetch pattern pins): private, loopback, link-local
 * (including the cloud metadata 169.254.169.254), CGNAT and reserved space.
 * IPv4-mapped IPv6 is classified as the embedded IPv4.
 */
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

export function isPrivateIPv6(ip: string): boolean {
  const s = ip.toLowerCase()
  if (s === '::1' || s === '::') return true
  if (s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe80')) return true
  // IPv4-mapped IPv6 in dotted-decimal form, e.g. ::ffff:169.254.169.254.
  const mappedDotted = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mappedDotted) return isPrivateIPv4(mappedDotted[1] as string)
  // IPv4-mapped IPv6 in the parser-normalized HEX form (what `new URL()`
  // emits for `http://[::ffff:169.254.169.254]/`). Reconstruct the embedded
  // IPv4 and classify it.
  const mappedHex = s.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (mappedHex) {
    const hi = parseInt(mappedHex[1] as string, 16)
    const lo = parseInt(mappedHex[2] as string, 16)
    return isPrivateIPv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`)
  }
  // Fail closed on any other v4-embedded form we cannot parse here.
  if (s.startsWith('::ffff:')) return true
  return false
}

/** True if `ip` (a literal IPv4/IPv6 string) is private/internal/metadata. */
export function isPrivateAddress(ip: string): boolean {
  return net.isIPv6(ip) ? isPrivateIPv6(ip) : isPrivateIPv4(ip)
}

/**
 * Resolve `hostname` to ALL of its addresses and report whether ANY of them
 * is private/internal/metadata. A hostname the resolver cannot answer is
 * treated as private (fail closed) — there is no legitimate fetch to complete.
 * Admin-only callers use this BEFORE opening a connection to an
 * admin-configured endpoint; this is sink-ownership, not a general proxy.
 */
export async function isPrivateHost(hostname: string): Promise<boolean> {
  const host = hostname.replace(/^\[|\]$/g, '')
  // IP-literal hosts skip DNS — classify directly.
  if (net.isIP(host)) return isPrivateAddress(host)
  return new Promise((resolve) => {
    dnsLookup(host, { all: true, verbatim: true }, (err, addresses) => {
      if (err) {
        resolve(true)
        return
      }
      const list = (Array.isArray(addresses) ? addresses : [addresses]) as Array<{
        address: string
      }>
      resolve(list.some((a) => isPrivateAddress(a.address)))
    })
  })
}
