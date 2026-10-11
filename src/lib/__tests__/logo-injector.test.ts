import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  buildLogoSvg,
  DEFAULT_LOGO_MD5,
  getGlyphsDir,
  injectLogo,
  listGlyphs,
  pickGlyph,
  readGlyph,
} from '../logo-injector.js'

/**
 * The default glyph a scaffold copies into `public/logo.svg` before
 * `injectLogo` runs (`scaffold.ts` → `loadTemplate('app/shared/logo.svg.tpl')`).
 * `DEFAULT_LOGO_MD5` is documented as the md5 of THIS file.
 */
const DEFAULT_LOGO_TEMPLATE = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'templates',
  'app',
  'shared',
  'logo.svg.tpl',
)

describe('listGlyphs', () => {
  it('returns at least one glyph from the shipped library', () => {
    const glyphs = listGlyphs()
    expect(glyphs.length).toBeGreaterThan(0)
  })

  it('returns names without the .svg extension', () => {
    for (const name of listGlyphs()) {
      expect(name.endsWith('.svg')).toBe(false)
    }
  })

  it('returns the same sorted list on repeated calls (deterministic ordering)', () => {
    const a = listGlyphs()
    const b = listGlyphs()
    expect(a).toEqual(b)
    expect([...a].sort()).toEqual(a) // already sorted
  })
})

describe('pickGlyph', () => {
  const glyphs = ['alpha', 'beta', 'gamma', 'delta']

  it('picks deterministically for the same app name', () => {
    expect(pickGlyph('my-app', glyphs)).toBe(pickGlyph('my-app', glyphs))
  })

  it('is case-insensitive (normalized to lowercase before hashing)', () => {
    expect(pickGlyph('MY-APP', glyphs)).toBe(pickGlyph('my-app', glyphs))
  })

  it('returns one of the supplied glyph names', () => {
    const picked = pickGlyph('some-name', glyphs)
    expect(glyphs).toContain(picked)
  })

  it('throws when glyphs array is empty', () => {
    expect(() => pickGlyph('app', [])).toThrow(/No glyphs found/)
  })

  it('uses the shipped glyphs when called without a custom list', () => {
    // Should not throw; result should be one of the shipped glyphs.
    const installed = listGlyphs()
    expect(installed).toContain(pickGlyph('demo'))
  })
})

describe('readGlyph', () => {
  it('returns the raw SVG body containing __BRAND_COLOR__ token', () => {
    const name = listGlyphs()[0]!
    const body = readGlyph(name)
    expect(body).toContain('__BRAND_COLOR__')
  })

  it('does NOT wrap with outer <svg> tags (caller is responsible)', () => {
    const body = readGlyph(listGlyphs()[0]!)
    expect(body.startsWith('<svg')).toBe(false)
  })
})

describe('buildLogoSvg', () => {
  const glyphName = listGlyphs()[0]!

  it('wraps the glyph in a 32×32 <svg> document', () => {
    const out = buildLogoSvg(glyphName, '#ff0000')
    expect(out).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"')
    expect(out).toContain('viewBox="0 0 32 32"')
    expect(out).toContain('</svg>')
  })

  it('substitutes the brand color into the glyph body', () => {
    const out = buildLogoSvg(glyphName, '#FF8800')
    expect(out).toContain('#FF8800')
    expect(out).not.toContain('__BRAND_COLOR__')
  })

  it('replaces ALL occurrences of __BRAND_COLOR__', () => {
    // Some glyphs reference the token multiple times.
    const out = buildLogoSvg(glyphName, '#XYZ')
    expect(out.includes('__BRAND_COLOR__')).toBe(false)
  })

  it('always ends with a trailing newline (file-friendly)', () => {
    const out = buildLogoSvg(glyphName, '#000')
    expect(out.endsWith('\n')).toBe(true)
  })
})

describe('DEFAULT_LOGO_MD5', () => {
  it('is a 32-char lowercase hex string', () => {
    expect(DEFAULT_LOGO_MD5).toMatch(/^[0-9a-f]{32}$/)
  })
})

describe('getGlyphsDir', () => {
  it('points to a real directory containing .svg files', () => {
    const dir = getGlyphsDir()
    expect(dir).toContain('logo-glyphs')
    expect(listGlyphs().length).toBeGreaterThan(0) // implicit existence test
  })
})

describe('injectLogo', () => {
  let appPath: string

  beforeEach(async () => {
    appPath = await mkdtemp(join(tmpdir(), 'mlcl-logo-injector-test-'))
  })

  afterEach(async () => {
    await rm(appPath, { recursive: true, force: true })
  })

  it('skips with reason=no-public-dir when publicDir does not exist', async () => {
    const result = await injectLogo({ appPath, appName: 'demo', brandColor: '#f00' })
    expect(result.written).toBe(false)
    expect(result.reason).toBe('no-public-dir')
    expect(result.glyph).toBeDefined() // glyph picked even when skipped
  })

  it('writes a logo when publicDir exists + no existing logo', async () => {
    await mkdir(join(appPath, 'public'), { recursive: true })
    const result = await injectLogo({ appPath, appName: 'demo', brandColor: '#f00' })
    expect(result.written).toBe(true)
    expect(result.reason).toBeUndefined()
    const written = await readFile(result.logoPath, 'utf-8')
    expect(written).toContain('#f00')
    expect(written).toContain('<svg')
  })

  it('overwrites the default-md5 logo (treats it as unbranded)', async () => {
    await mkdir(join(appPath, 'public'), { recursive: true })
    // The file a scaffold writes moments before injectLogo runs: the shipped
    // default glyph, byte for byte (`scaffold.ts` writes
    // `loadTemplate('app/shared/logo.svg.tpl')`, which is an identity render —
    // the file carries no `{{…}}` placeholder). Its md5 IS DEFAULT_LOGO_MD5,
    // which is the sentinel's whole definition — so this test also pins the
    // constant to the template it hashes. A stale constant (the template glyph
    // tweaked without the hash) or an inverted comparison makes every custom
    // `mlcl create` keep the unbranded Molecule glyph, silently, and before this
    // test nothing could see either: the sibling case below asserts the CUSTOM
    // path, whose name ("overwrites the default-md5 logo") promised this one.
    const defaultLogoSvg = readFileSync(DEFAULT_LOGO_TEMPLATE, 'utf-8')
    expect(
      createHash('md5').update(defaultLogoSvg).digest('hex'),
      'DEFAULT_LOGO_MD5 must be the md5 of the shipped default logo it describes',
    ).toBe(DEFAULT_LOGO_MD5)
    await writeFile(join(appPath, 'public', 'logo.svg'), defaultLogoSvg)

    const result = await injectLogo({ appPath, appName: 'demo', brandColor: '#abcdef' })

    // Unbranded ⇒ replaced…
    expect(result.written).toBe(true)
    expect(result.reason).toBeUndefined()
    const after = await readFile(result.logoPath, 'utf-8')
    expect(after).not.toBe(defaultLogoSvg)
    expect(after).toContain('#abcdef')
  })

  it('preserves a custom logo whose md5 is not the default (no over-writing)', async () => {
    await mkdir(join(appPath, 'public'), { recursive: true })
    const customSvg = '<svg>custom user content</svg>'
    await writeFile(join(appPath, 'public', 'logo.svg'), customSvg)
    const md5 = createHash('md5').update(customSvg).digest('hex')
    expect(md5).not.toBe(DEFAULT_LOGO_MD5)

    const result = await injectLogo({ appPath, appName: 'demo', brandColor: '#000' })
    expect(result.written).toBe(false)
    expect(result.reason).toBe('custom-logo')
    // File should still be the user's custom content
    const after = await readFile(join(appPath, 'public', 'logo.svg'), 'utf-8')
    expect(after).toBe(customSvg)
  })

  it('force=true overrides custom-logo protection', async () => {
    await mkdir(join(appPath, 'public'), { recursive: true })
    await writeFile(join(appPath, 'public', 'logo.svg'), '<svg>custom</svg>')

    const result = await injectLogo({
      appPath,
      appName: 'demo',
      brandColor: '#abcdef',
      force: true,
    })
    expect(result.written).toBe(true)
    const after = await readFile(result.logoPath, 'utf-8')
    expect(after).toContain('#abcdef')
    expect(after).not.toBe('<svg>custom</svg>')
  })

  it('honours a custom publicDir', async () => {
    await mkdir(join(appPath, 'static'), { recursive: true })
    const result = await injectLogo({
      appPath,
      appName: 'demo',
      brandColor: '#000',
      publicDir: 'static',
    })
    expect(result.written).toBe(true)
    expect(result.logoPath).toContain('/static/')
  })

  it('picks the same glyph for the same app name across calls', async () => {
    await mkdir(join(appPath, 'public'), { recursive: true })
    const a = await injectLogo({ appPath, appName: 'deterministic', brandColor: '#1' })
    // Clean up to allow second write
    await rm(a.logoPath, { force: true })
    const b = await injectLogo({ appPath, appName: 'deterministic', brandColor: '#2' })
    expect(a.glyph).toBe(b.glyph)
  })
})
