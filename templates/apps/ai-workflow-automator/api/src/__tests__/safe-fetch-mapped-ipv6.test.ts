import { describe, expect, it, vi } from 'vitest'

import { isPrivateAddress, isPrivateIPv6, safeFetch } from '../lib/safe-fetch.js'

/**
 * Regression for M5-1: SSRF guard bypass via IPv4-mapped IPv6 literals.
 *
 * `new URL('http://[::ffff:169.254.169.254]/')` normalizes the host to the HEX
 * form `::ffff:a9fe:a9fe` — the WHATWG parser NEVER emits the dotted-decimal
 * form. The old guard only matched the dotted form, so the synchronous
 * IP-literal check in safeFetch() passed and the socket reached cloud metadata
 * (169.254.169.254) / loopback (127.0.0.1) via the dual-stack kernel.
 *
 * These tests drive the FULL attacker path (real `new URL()` normalization),
 * not the function-internal dotted shortcut, so they cannot silently regress.
 */
describe('SSRF guard — IPv4-mapped IPv6 literal bypass (M5-1)', () => {
  it('the WHATWG URL parser emits the hex form, not dotted-decimal', () => {
    // The exact host string the guard must classify on the real safeFetch path.
    expect(new URL('http://[::ffff:169.254.169.254]/').hostname).toBe('[::ffff:a9fe:a9fe]')
    expect(new URL('http://[::ffff:127.0.0.1]/').hostname).toBe('[::ffff:7f00:1]')
  })

  it('classifies the parser-normalized hex form of mapped-private v4 as private', () => {
    expect(isPrivateIPv6('::ffff:a9fe:a9fe')).toBe(true) // 169.254.169.254 (cloud metadata)
    expect(isPrivateIPv6('::ffff:7f00:1')).toBe(true) // 127.0.0.1 (loopback)
    expect(isPrivateIPv6('::ffff:a00:1')).toBe(true) // 10.0.0.1 (RFC-1918)
    expect(isPrivateAddress('::ffff:a9fe:a9fe')).toBe(true)
  })

  it('still allows genuinely public mapped addresses (no over-blocking)', () => {
    expect(isPrivateIPv6('::ffff:5db8:d822')).toBe(false) // 93.184.216.34 (public, hex)
    expect(isPrivateIPv6('::ffff:93.184.216.34')).toBe(false) // dotted form preserved
  })

  it('safeFetch blocks the mapped metadata + loopback IPv6 literals before any connection', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    await expect(safeFetch('http://[::ffff:169.254.169.254]/latest/meta-data/')).rejects.toThrow(
      /private\/internal address \(blocked\)/,
    )
    await expect(safeFetch('http://[::ffff:127.0.0.1]:6379/')).rejects.toThrow(/blocked/)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('safeFetch still passes a public mapped-IPv6 literal through to fetch', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'))
    await safeFetch('http://[::ffff:93.184.216.34]/data')
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })
})
