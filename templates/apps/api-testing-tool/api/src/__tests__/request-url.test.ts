import { describe, expect, it } from 'vitest'

import { withQueryParams } from '../lib/request-url.js'

// Saved query_params were dropped when a request ran. withQueryParams merges them into the URL.

describe('withQueryParams', () => {
  it('appends params to an absolute URL with no existing query', () => {
    const out = withQueryParams('https://api.example.com/v1/items', { page: '2', limit: '10' })
    const u = new URL(out)
    expect(u.searchParams.get('page')).toBe('2')
    expect(u.searchParams.get('limit')).toBe('10')
  })

  it('merges with an existing query string (overwriting same keys)', () => {
    const out = withQueryParams('https://api.example.com/s?q=old&keep=1', { q: 'new' })
    const u = new URL(out)
    expect(u.searchParams.get('q')).toBe('new')
    expect(u.searchParams.get('keep')).toBe('1')
  })

  it('parses a JSON-string query_params value (how it is stored)', () => {
    const out = withQueryParams('https://api.example.com/x', JSON.stringify({ a: '1' }))
    expect(new URL(out).searchParams.get('a')).toBe('1')
  })

  it('returns the URL unchanged when there are no params', () => {
    expect(withQueryParams('https://api.example.com/x', {})).toBe('https://api.example.com/x')
    expect(withQueryParams('https://api.example.com/x', null)).toBe('https://api.example.com/x')
    expect(withQueryParams('https://api.example.com/x', '')).toBe('https://api.example.com/x')
  })

  it('url-encodes keys and values', () => {
    const out = withQueryParams('https://api.example.com/x', { 'a b': 'c&d' })
    expect(new URL(out).searchParams.get('a b')).toBe('c&d')
    expect(out).toContain('a+b=c%26d')
  })

  it('falls back to a manual encoded append for a non-absolute URL', () => {
    expect(withQueryParams('/relative/path', { x: '1', y: '2' })).toBe('/relative/path?x=1&y=2')
    expect(withQueryParams('/relative/path?z=0', { x: '1' })).toBe('/relative/path?z=0&x=1')
  })

  it('ignores null/undefined param values', () => {
    const out = withQueryParams('https://api.example.com/x', {
      a: '1',
      b: null,
      c: undefined,
    } as unknown)
    const u = new URL(out)
    expect(u.searchParams.get('a')).toBe('1')
    expect(u.searchParams.has('b')).toBe(false)
    expect(u.searchParams.has('c')).toBe(false)
  })
})
