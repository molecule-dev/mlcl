import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isPrivateAddress, isPrivateIPv4, isPrivateIPv6, safeFetch } from '../lib/safe-fetch.js'

describe('isPrivateIPv4', () => {
  it('flags loopback / RFC1918 / link-local / CGNAT / multicast as private', () => {
    for (const ip of [
      '0.0.0.0',
      '10.0.0.5',
      '127.0.0.1',
      '169.254.169.254', // cloud metadata
      '172.16.4.4',
      '172.31.255.255',
      '192.168.1.10',
      '100.64.1.1', // CGNAT
      '224.0.0.1', // multicast
    ]) {
      expect(isPrivateIPv4(ip)).toBe(true)
    }
  })

  it('treats public IPv4 as not private', () => {
    for (const ip of ['8.8.8.8', '93.184.216.34', '1.1.1.1', '172.32.0.1']) {
      expect(isPrivateIPv4(ip)).toBe(false)
    }
  })

  it('treats malformed IPv4 as private (fail-closed)', () => {
    for (const ip of ['', 'nope', '1.2.3', '999.1.1.1', '1.2.3.4.5']) {
      expect(isPrivateIPv4(ip)).toBe(true)
    }
  })
})

describe('isPrivateIPv6', () => {
  it('flags loopback / unspecified / ULA / link-local as private', () => {
    for (const ip of ['::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1']) {
      expect(isPrivateIPv6(ip)).toBe(true)
    }
  })

  it('flags v4-mapped private addresses as private', () => {
    expect(isPrivateIPv6('::ffff:127.0.0.1')).toBe(true)
    expect(isPrivateIPv6('::ffff:169.254.169.254')).toBe(true)
  })

  it('treats public IPv6 as not private', () => {
    expect(isPrivateIPv6('2606:4700:4700::1111')).toBe(false)
    expect(isPrivateIPv6('::ffff:8.8.8.8')).toBe(false)
  })
})

describe('isPrivateAddress', () => {
  it('dispatches to the v4 or v6 checker by literal family', () => {
    expect(isPrivateAddress('127.0.0.1')).toBe(true)
    expect(isPrivateAddress('::1')).toBe(true)
    expect(isPrivateAddress('8.8.8.8')).toBe(false)
    expect(isPrivateAddress('2606:4700:4700::1111')).toBe(false)
  })
})

describe('safeFetch', () => {
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchSpy = vi.fn(async () => new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('blocks the cloud metadata endpoint 169.254.169.254 (IP literal, no connect)', async () => {
    await expect(safeFetch('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(
      /private\/internal address/,
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('blocks loopback (127.0.0.1) literals', async () => {
    await expect(safeFetch('http://127.0.0.1:5432/')).rejects.toThrow(/private\/internal address/)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('blocks IPv6 loopback ::1 literals', async () => {
    await expect(safeFetch('http://[::1]:6379/')).rejects.toThrow(/private\/internal address/)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('blocks RFC1918 + CGNAT literals', async () => {
    for (const u of [
      'http://10.0.0.5/',
      'http://172.16.4.4/',
      'http://192.168.1.10/',
      'http://100.64.1.1/',
    ]) {
      await expect(safeFetch(u)).rejects.toThrow(/private\/internal address/)
    }
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects non-http(s) protocols before any connection', async () => {
    for (const u of ['file:///etc/passwd', 'ftp://example.com/', 'gopher://example.com/']) {
      await expect(safeFetch(u)).rejects.toThrow(/Only http\(s\)/)
    }
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects malformed URLs (binding the parse error as cause)', async () => {
    await expect(safeFetch('not a url')).rejects.toThrow(/Invalid URL/)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('allows a public IP literal and pins the request (manual redirect + dispatcher)', async () => {
    const res = await safeFetch('https://8.8.8.8/health', { method: 'GET' })
    expect(res.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [calledUrl, init] = fetchSpy.mock.calls[0] as [URL, RequestInit & { dispatcher: unknown }]
    expect(calledUrl).toBeInstanceOf(URL)
    expect(calledUrl.hostname).toBe('8.8.8.8')
    expect(init.method).toBe('GET')
    expect(init.redirect).toBe('manual')
    expect(init.dispatcher).toBeDefined()
  })

  it('allows a public hostname and defers IP validation to the connect lookup', async () => {
    // Hostnames are validated inside the undici connect lookup, not synchronously,
    // so safeFetch forwards them to fetch (where the pinned dispatcher enforces SSRF).
    const res = await safeFetch('https://api.example.com/v1/webhook', {
      method: 'POST',
      body: '{}',
    })
    expect(res.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [calledUrl, init] = fetchSpy.mock.calls[0] as [URL, RequestInit & { dispatcher: unknown }]
    expect(calledUrl.hostname).toBe('api.example.com')
    expect(init.redirect).toBe('manual')
    expect(init.dispatcher).toBeDefined()
  })
})

describe('safeFetch — SAFE_FETCH_ALLOW_HOSTS explicit opt-in', () => {
  let fetchSpy: ReturnType<typeof vi.fn>
  const savedAllowHosts = process.env.SAFE_FETCH_ALLOW_HOSTS

  beforeEach(() => {
    fetchSpy = vi.fn(async () => new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    if (savedAllowHosts === undefined) delete process.env.SAFE_FETCH_ALLOW_HOSTS
    else process.env.SAFE_FETCH_ALLOW_HOSTS = savedAllowHosts
  })

  it('an allow-listed host:port skips the private-address pinning (manual redirect, no dispatcher)', async () => {
    process.env.SAFE_FETCH_ALLOW_HOSTS = '127.0.0.1:9099'
    const res = await safeFetch('http://127.0.0.1:9099/hook', { method: 'POST' })
    expect(res.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [calledUrl, init] = fetchSpy.mock.calls[0] as [
      URL,
      RequestInit & { dispatcher?: unknown },
    ]
    expect(calledUrl.host).toBe('127.0.0.1:9099')
    expect(init.redirect).toBe('manual')
    expect(init.dispatcher).toBeUndefined()
  })

  it('the allowlist is exact — other ports and unrelated private targets stay blocked', async () => {
    process.env.SAFE_FETCH_ALLOW_HOSTS = '127.0.0.1:9099'
    await expect(safeFetch('http://127.0.0.1:9100/hook')).rejects.toThrow(/blocked/)
    await expect(safeFetch('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(/blocked/)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('an empty/unset allowlist exempts nothing', async () => {
    delete process.env.SAFE_FETCH_ALLOW_HOSTS
    await expect(safeFetch('http://127.0.0.1:9099/x')).rejects.toThrow(/blocked/)
    process.env.SAFE_FETCH_ALLOW_HOSTS = ' , ,'
    await expect(safeFetch('http://127.0.0.1:9099/x')).rejects.toThrow(/blocked/)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
