import { describe, expect, it, vi } from 'vitest'

import { isPrivateAddress, safeFetch } from '../lib/safe-fetch.js'

describe('safe-fetch SSRF guard (status-page monitor probes)', () => {
  it('classifies private/internal/metadata IPs', () => {
    for (const ip of [
      '127.0.0.1',
      '169.254.169.254',
      '10.0.0.1',
      '192.168.1.1',
      '172.16.0.1',
      '::1',
      'fd00::1',
    ])
      expect(isPrivateAddress(ip)).toBe(true)
    for (const ip of ['93.184.216.34', '8.8.8.8', '1.1.1.1'])
      expect(isPrivateAddress(ip)).toBe(false)
  })

  it('blocks a private/metadata IP-literal monitor_url synchronously without fetching', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    for (const u of [
      'http://169.254.169.254/latest/meta-data/',
      'http://127.0.0.1/health',
      'https://10.0.0.5/health',
    ]) {
      await expect(safeFetch(u)).rejects.toThrow()
    }
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('rejects non-http(s) schemes + malformed URLs before fetching', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    await expect(safeFetch('file:///etc/passwd')).rejects.toThrow()
    await expect(safeFetch('gopher://x')).rejects.toThrow()
    await expect(safeFetch('not a url')).rejects.toThrow()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('SAFE_FETCH_ALLOW_HOSTS: an exact allow-listed host:port skips the pinning; everything else stays blocked', async () => {
    const saved = process.env.SAFE_FETCH_ALLOW_HOSTS
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))
    try {
      process.env.SAFE_FETCH_ALLOW_HOSTS = '127.0.0.1:9099'
      const res = await safeFetch('http://127.0.0.1:9099/health')
      expect(res.status).toBe(200)
      expect(spy).toHaveBeenCalledTimes(1)
      const init = spy.mock.calls[0]?.[1] as RequestInit & { dispatcher?: unknown }
      expect(init.redirect).toBe('manual')
      expect(init.dispatcher).toBeUndefined()
      // Exact match only — a different port and unrelated private targets block.
      await expect(safeFetch('http://127.0.0.1:9100/health')).rejects.toThrow(/blocked/)
      await expect(safeFetch('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(/blocked/)
      // Empty/unset allowlist exempts nothing.
      delete process.env.SAFE_FETCH_ALLOW_HOSTS
      await expect(safeFetch('http://127.0.0.1:9099/health')).rejects.toThrow(/blocked/)
      expect(spy).toHaveBeenCalledTimes(1)
    } finally {
      if (saved === undefined) delete process.env.SAFE_FETCH_ALLOW_HOSTS
      else process.env.SAFE_FETCH_ALLOW_HOSTS = saved
      spy.mockRestore()
    }
  })
})
