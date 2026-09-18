import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type LookupCb = (err: Error | null, address?: unknown, family?: number) => void
type ConnectLookup = (hostname: string, options: unknown, callback: LookupCb) => void

// Mock the connect-time DNS resolver and capture the `connect.lookup` that
// safe-fetch installs on its undici Agent, so we can exercise the rebinding
// guard (the part that closes the validate-then-fetch TOCTOU window) directly.
// `fetch` is stubbed so the pass-through path never touches the network.
const { dnsLookup, fetchMock, FakeAgent, getCapturedLookup } = vi.hoisted(() => {
  const dnsLookup = vi.fn()
  const fetchMock = vi.fn()
  let captured: ConnectLookup | undefined
  class FakeAgent {
    constructor(opts: { connect?: { lookup?: ConnectLookup } }) {
      captured = opts?.connect?.lookup
    }
  }
  return { dnsLookup, fetchMock, FakeAgent, getCapturedLookup: () => captured }
})

vi.mock('node:dns', () => ({ lookup: dnsLookup }))
vi.mock('undici', () => ({ Agent: FakeAgent }))
vi.stubGlobal('fetch', fetchMock)

const { safeFetch, isPrivateAddress, isPrivateIPv4, isPrivateIPv6 } =
  await import('../lib/safe-fetch.js')

describe('isPrivateIPv4', () => {
  it('flags loopback, RFC-1918, link-local/metadata, CGNAT, multicast/reserved', () => {
    for (const ip of [
      '0.0.0.0',
      '10.0.0.5',
      '127.0.0.1',
      '169.254.169.254', // cloud metadata endpoint
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '100.64.0.1', // CGNAT
      '224.0.0.1', // multicast
      '255.255.255.255',
    ]) {
      expect(isPrivateIPv4(ip)).toBe(true)
    }
  })

  it('allows public IPv4 addresses', () => {
    for (const ip of ['8.8.8.8', '93.184.216.34', '1.1.1.1', '172.32.0.1', '169.253.0.1']) {
      expect(isPrivateIPv4(ip)).toBe(false)
    }
  })

  it('treats malformed octets as private (fail closed)', () => {
    for (const ip of ['not.an.ip.addr', '10.0.0', '999.1.1.1', '1.2.3.4.5']) {
      expect(isPrivateIPv4(ip)).toBe(true)
    }
  })
})

describe('isPrivateIPv6', () => {
  it('flags loopback/unspecified/unique-local/link-local and mapped-private v4', () => {
    for (const ip of [
      '::1',
      '::',
      'fc00::1',
      'fd00::1',
      'fe80::1',
      '::ffff:127.0.0.1',
      '::ffff:169.254.169.254',
    ]) {
      expect(isPrivateIPv6(ip)).toBe(true)
    }
  })

  it('allows public IPv6 and mapped-public v4', () => {
    for (const ip of ['2606:2800:220:1:248:1893:25c8:1946', '::ffff:8.8.8.8']) {
      expect(isPrivateIPv6(ip)).toBe(false)
    }
  })
})

describe('isPrivateAddress', () => {
  it('dispatches to the v4/v6 classifier by family', () => {
    expect(isPrivateAddress('169.254.169.254')).toBe(true)
    expect(isPrivateAddress('::1')).toBe(true)
    expect(isPrivateAddress('93.184.216.34')).toBe(false)
    expect(isPrivateAddress('2606:2800:220:1:248:1893:25c8:1946')).toBe(false)
  })
})

describe('safeFetch', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('blocks a private IP-literal host synchronously and never fetches', async () => {
    await expect(safeFetch('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(
      /private\/internal/,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('blocks loopback, RFC-1918, and IPv6 literal hosts without fetching', async () => {
    for (const url of [
      'http://127.0.0.1:5432/',
      'http://10.0.0.5/',
      'http://192.168.1.1/',
      'http://172.16.0.1/',
      'http://[::1]:6379/',
    ]) {
      await expect(safeFetch(url)).rejects.toThrow(/private\/internal/)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects non-http(s) schemes before any fetch', async () => {
    await expect(safeFetch('file:///etc/passwd')).rejects.toThrow(/http\(s\)/)
    await expect(safeFetch('gopher://127.0.0.1/')).rejects.toThrow(/http\(s\)/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a malformed URL', async () => {
    await expect(safeFetch('not a url')).rejects.toThrow(/Invalid URL/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('passes a public IP-literal URL through to fetch with redirect:manual and the SSRF dispatcher', async () => {
    fetchMock.mockResolvedValue({ ok: true } as Response)
    const res = await safeFetch('https://93.184.216.34/audio.mp3')
    expect(res).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, init] = fetchMock.mock.calls[0] as [
      URL,
      RequestInit & { dispatcher: unknown },
    ]
    expect(String(calledUrl)).toBe('https://93.184.216.34/audio.mp3')
    expect(init.redirect).toBe('manual')
    expect(init.dispatcher).toBeInstanceOf(FakeAgent)
  })

  it('passes a public hostname URL through to fetch (DNS enforced at connect time, not pre-fetch)', async () => {
    fetchMock.mockResolvedValue({ ok: true } as Response)
    await safeFetch('https://cdn.example.com/episode-42.mp3')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    // The hostname is NOT resolved before the fetch — resolution + the private-IP
    // check happen inside the dispatcher's connect.lookup, so there is no
    // validate-then-connect rebinding window.
    expect(dnsLookup).not.toHaveBeenCalled()
  })
})

describe('connect-time DNS guard (closes the rebinding window)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('rejects a host that resolves to a private/metadata address', async () => {
    const lookup = getCapturedLookup()
    expect(lookup).toBeTypeOf('function')
    dnsLookup.mockImplementation((_host: string, _opts: unknown, cb: LookupCb) => {
      cb(null, [{ address: '169.254.169.254', family: 4 }])
    })
    const err = await new Promise<Error | null>((resolve) => {
      ;(lookup as ConnectLookup)('rebind.evil.example.com', {}, (e) => resolve(e))
    })
    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toMatch(/SSRF/)
  })

  it('rejects if ANY of multiple resolved addresses is private', async () => {
    const lookup = getCapturedLookup()
    dnsLookup.mockImplementation((_host: string, _opts: unknown, cb: LookupCb) => {
      cb(null, [
        { address: '93.184.216.34', family: 4 },
        { address: '10.0.0.5', family: 4 },
      ])
    })
    const err = await new Promise<Error | null>((resolve) => {
      ;(lookup as ConnectLookup)('mixed.example.com', {}, (e) => resolve(e))
    })
    expect(err).toBeInstanceOf(Error)
  })

  it('allows a host that resolves only to public addresses', async () => {
    const lookup = getCapturedLookup()
    dnsLookup.mockImplementation((_host: string, _opts: unknown, cb: LookupCb) => {
      cb(null, [{ address: '93.184.216.34', family: 4 }])
    })
    const result = await new Promise<{ err: Error | null; address: unknown }>((resolve) => {
      ;(lookup as ConnectLookup)('cdn.example.com', {}, (e, address) =>
        resolve({ err: e, address }),
      )
    })
    expect(result.err).toBeNull()
    expect(result.address).toBe('93.184.216.34')
  })

  it('propagates an underlying DNS resolution error', async () => {
    const lookup = getCapturedLookup()
    const dnsErr = new Error('ENOTFOUND')
    dnsLookup.mockImplementation((_host: string, _opts: unknown, cb: LookupCb) => {
      cb(dnsErr)
    })
    const err = await new Promise<Error | null>((resolve) => {
      ;(lookup as ConnectLookup)('nope.example.com', {}, (e) => resolve(e))
    })
    expect(err).toBe(dnsErr)
  })
})

describe('safeFetch — SAFE_FETCH_ALLOW_HOSTS explicit opt-in', () => {
  const savedAllowHosts = process.env.SAFE_FETCH_ALLOW_HOSTS

  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    if (savedAllowHosts === undefined) delete process.env.SAFE_FETCH_ALLOW_HOSTS
    else process.env.SAFE_FETCH_ALLOW_HOSTS = savedAllowHosts
  })

  it('an allow-listed host:port skips the pinning: fetch without the SSRF dispatcher', async () => {
    process.env.SAFE_FETCH_ALLOW_HOSTS = '127.0.0.1:9099'
    fetchMock.mockResolvedValue({ ok: true } as Response)
    await safeFetch('http://127.0.0.1:9099/rss.xml')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, init] = fetchMock.mock.calls[0] as [
      URL,
      RequestInit & { dispatcher?: unknown },
    ]
    expect(calledUrl.host).toBe('127.0.0.1:9099')
    expect(init.redirect).toBe('manual')
    expect(init.dispatcher).toBeUndefined()
  })

  it('exact-match only — other ports and unrelated private targets stay blocked', async () => {
    process.env.SAFE_FETCH_ALLOW_HOSTS = '127.0.0.1:9099'
    await expect(safeFetch('http://127.0.0.1:9100/rss.xml')).rejects.toThrow(/blocked/)
    await expect(safeFetch('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(/blocked/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('an empty/unset allowlist exempts nothing', async () => {
    delete process.env.SAFE_FETCH_ALLOW_HOSTS
    await expect(safeFetch('http://127.0.0.1:9099/rss.xml')).rejects.toThrow(/blocked/)
    process.env.SAFE_FETCH_ALLOW_HOSTS = ' , ,'
    await expect(safeFetch('http://127.0.0.1:9099/rss.xml')).rejects.toThrow(/blocked/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
