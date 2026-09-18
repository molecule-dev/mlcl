import { describe, expect, it } from 'vitest'

import { applyAuth } from '../lib/apply-auth.js'

// auth_type / auth_config were persisted + schema-validated but the execute path
// never applied them. applyAuth turns them into outbound headers.

describe('applyAuth', () => {
  it('bearer sets Authorization: Bearer <token>', () => {
    const h: Record<string, string> = {}
    applyAuth(h, 'bearer', { token: 'abc' })
    expect(h.Authorization).toBe('Bearer abc')
  })

  it('oauth uses the same bearer scheme', () => {
    const h: Record<string, string> = {}
    applyAuth(h, 'oauth', { token: 'oa' })
    expect(h.Authorization).toBe('Bearer oa')
  })

  it('basic sets Authorization: Basic base64(username:password)', () => {
    const h: Record<string, string> = {}
    applyAuth(h, 'basic', { username: 'u', password: 'p' })
    expect(h.Authorization).toBe('Basic dTpw') // base64('u:p')
  })

  it('apikey sets a custom header', () => {
    const h: Record<string, string> = {}
    applyAuth(h, 'apikey', { key: 'X-API-Key', value: 'k123' })
    expect(h['X-API-Key']).toBe('k123')
  })

  it('parses a JSON-string auth_config (the stored form)', () => {
    const h: Record<string, string> = {}
    applyAuth(h, 'bearer', JSON.stringify({ token: 'xyz' }))
    expect(h.Authorization).toBe('Bearer xyz')
  })

  it('leaves headers untouched for none / undefined', () => {
    const h: Record<string, string> = { 'X-Existing': '1' }
    applyAuth(h, 'none', {})
    applyAuth(h, undefined, {})
    expect(h).toEqual({ 'X-Existing': '1' })
  })

  it('skips a query-placement apikey (header form only)', () => {
    const h: Record<string, string> = {}
    applyAuth(h, 'apikey', { key: 'api_key', value: 'v', in: 'query' })
    expect(h).toEqual({})
  })
})
