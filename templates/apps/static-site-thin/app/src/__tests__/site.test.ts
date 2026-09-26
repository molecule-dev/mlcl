import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { resolveRequest } from '../serve.js'
import { createSite, normalizeBase } from '../site.js'

describe('normalizeBase', () => {
  it('treats empty and / as the origin root', () => {
    expect(normalizeBase(undefined)).toBe('/')
    expect(normalizeBase('')).toBe('/')
    expect(normalizeBase('/')).toBe('/')
  })

  it('always gives a leading and a trailing slash', () => {
    expect(normalizeBase('blog')).toBe('/blog/')
    expect(normalizeBase('/blog')).toBe('/blog/')
    expect(normalizeBase('/blog/')).toBe('/blog/')
    expect(normalizeBase('//a/b//')).toBe('/a/b/')
  })
})

describe('createSite', () => {
  it('puts every path under the base path and the site URL', () => {
    const site = createSite({ basePath: '/blog', siteUrl: 'https://example.com/' })
    expect(site.withBase('/about/')).toBe('/blog/about/')
    expect(site.withBase('feed.xml')).toBe('/blog/feed.xml')
    expect(site.absoluteUrl('/')).toBe('https://example.com/blog/')
    expect(site.absoluteUrl('/a/')).toBe('https://example.com/blog/a/')
  })
})

describe('resolveRequest (the static host rules)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'thin-serve-'))
  mkdirSync(join(dir, 'about'))
  writeFileSync(join(dir, 'index.html'), 'home')
  writeFileSync(join(dir, 'about', 'index.html'), 'about')
  writeFileSync(join(dir, 'feed.xml'), '<rss/>')

  it('serves a directory index only with its trailing slash, redirecting without it', () => {
    expect(resolveRequest(dir, '/', '/about/')).toEqual({ file: join(dir, 'about', 'index.html') })
    expect(resolveRequest(dir, '/', '/about')).toEqual({ redirect: '/about/' })
  })

  it('serves files by path and nothing that does not exist', () => {
    expect(resolveRequest(dir, '/', '/feed.xml')).toEqual({ file: join(dir, 'feed.xml') })
    expect(resolveRequest(dir, '/', '/missing/')).toBeNull()
  })

  it('serves only under the base path', () => {
    expect(resolveRequest(dir, '/blog/', '/blog/about/')).toEqual({
      file: join(dir, 'about', 'index.html'),
    })
    expect(resolveRequest(dir, '/blog/', '/about/')).toBeNull()
    expect(resolveRequest(dir, '/blog/', '/blog')).toEqual({ redirect: '/blog/' })
    // The root sends a browser (and the IDE preview) to the site.
    expect(resolveRequest(dir, '/blog/', '/')).toEqual({ redirect: '/blog/' })
  })

  it('never serves a file outside the directory', () => {
    expect(resolveRequest(dir, '/', '/../etc/passwd')).toBeNull()
  })
})
