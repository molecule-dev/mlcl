import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterEach, describe, expect, it } from 'vitest'

import { isPrivateAddress, isPrivateIPv4, isPrivateIPv6, safeFetch } from '../lib/safe-fetch.js'

describe('isPrivateIPv4', () => {
  it('flags loopback / private / link-local / CGNAT / reserved ranges', () => {
    expect(isPrivateIPv4('127.0.0.1')).toBe(true)
    expect(isPrivateIPv4('0.0.0.0')).toBe(true)
    expect(isPrivateIPv4('10.0.0.5')).toBe(true)
    expect(isPrivateIPv4('172.16.5.5')).toBe(true)
    expect(isPrivateIPv4('172.31.255.255')).toBe(true)
    expect(isPrivateIPv4('192.168.1.1')).toBe(true)
    expect(isPrivateIPv4('169.254.169.254')).toBe(true) // cloud metadata
    expect(isPrivateIPv4('100.64.0.1')).toBe(true) // CGNAT
    expect(isPrivateIPv4('224.0.0.1')).toBe(true) // multicast
  })

  it('allows genuine public addresses', () => {
    expect(isPrivateIPv4('93.184.216.34')).toBe(false)
    expect(isPrivateIPv4('8.8.8.8')).toBe(false)
    expect(isPrivateIPv4('172.32.0.1')).toBe(false) // just outside 172.16/12
  })

  it('treats malformed input as private (fail closed)', () => {
    expect(isPrivateIPv4('not.an.ip')).toBe(true)
    expect(isPrivateIPv4('1.2.3')).toBe(true)
    expect(isPrivateIPv4('999.1.1.1')).toBe(true)
  })
})

describe('isPrivateIPv6', () => {
  it('flags loopback / unspecified / unique-local / link-local', () => {
    expect(isPrivateIPv6('::1')).toBe(true)
    expect(isPrivateIPv6('::')).toBe(true)
    expect(isPrivateIPv6('fc00::1')).toBe(true)
    expect(isPrivateIPv6('fd00::1')).toBe(true)
    expect(isPrivateIPv6('fe80::1')).toBe(true)
  })

  it('flags v4-mapped private addresses', () => {
    expect(isPrivateIPv6('::ffff:169.254.169.254')).toBe(true)
    expect(isPrivateIPv6('::ffff:10.0.0.1')).toBe(true)
  })

  it('allows public v6 and v4-mapped public addresses', () => {
    expect(isPrivateIPv6('2606:2800:220:1:248:1893:25c8:1946')).toBe(false)
    expect(isPrivateIPv6('::ffff:93.184.216.34')).toBe(false)
  })
})

describe('isPrivateAddress', () => {
  it('dispatches by family', () => {
    expect(isPrivateAddress('169.254.169.254')).toBe(true)
    expect(isPrivateAddress('::1')).toBe(true)
    expect(isPrivateAddress('93.184.216.34')).toBe(false)
  })
})

describe('safeFetch — synchronous IP-literal blocking (no network)', () => {
  it('blocks the cloud metadata IP literal before any connection', async () => {
    await expect(safeFetch('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(
      /private\/internal address \(blocked\)/,
    )
  })

  it('blocks loopback and private IP literals', async () => {
    await expect(safeFetch('http://127.0.0.1/x')).rejects.toThrow(/blocked/)
    await expect(safeFetch('http://10.0.0.1/x')).rejects.toThrow(/blocked/)
    await expect(safeFetch('http://192.168.1.1/x')).rejects.toThrow(/blocked/)
    await expect(safeFetch('http://[::1]/x')).rejects.toThrow(/blocked/)
    await expect(safeFetch('http://[fd00::1]/x')).rejects.toThrow(/blocked/)
  })

  it('rejects non-http(s) protocols', async () => {
    await expect(safeFetch('file:///etc/passwd')).rejects.toThrow(/http\(s\)/)
    await expect(safeFetch('gopher://127.0.0.1/')).rejects.toThrow(/http\(s\)/)
  })

  it('rejects a malformed URL', async () => {
    await expect(safeFetch('not a url')).rejects.toThrow(/Invalid URL/)
  })
})

describe('safeFetch — SAFE_FETCH_ALLOW_HOSTS explicit opt-in', () => {
  let server: Server | null = null
  const savedAllowHosts = process.env.SAFE_FETCH_ALLOW_HOSTS

  afterEach(async () => {
    if (savedAllowHosts === undefined) delete process.env.SAFE_FETCH_ALLOW_HOSTS
    else process.env.SAFE_FETCH_ALLOW_HOSTS = savedAllowHosts
    if (server) {
      await new Promise<void>((resolve) => server?.close(() => resolve()))
      server = null
    }
  })

  it('an allow-listed host:port reaches a local receiver; others stay blocked', async () => {
    server = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('{"received":true}')
    })
    await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve))
    const port = (server.address() as AddressInfo).port
    process.env.SAFE_FETCH_ALLOW_HOSTS = `127.0.0.1:${port}`

    const response = await safeFetch(`http://127.0.0.1:${port}/hook`, { method: 'POST' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true })

    // Same address on a DIFFERENT port is NOT exempt — the allowlist is exact.
    await expect(safeFetch(`http://127.0.0.1:${port + 1}/hook`)).rejects.toThrow(/blocked/)
    // Unrelated private targets stay blocked too.
    await expect(safeFetch('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(/blocked/)
  })

  it('an empty/unset allowlist exempts nothing', async () => {
    delete process.env.SAFE_FETCH_ALLOW_HOSTS
    await expect(safeFetch('http://127.0.0.1:9/x')).rejects.toThrow(/blocked/)
    process.env.SAFE_FETCH_ALLOW_HOSTS = '  , ,'
    await expect(safeFetch('http://127.0.0.1:9/x')).rejects.toThrow(/blocked/)
  })
})
