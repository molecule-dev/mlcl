import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { loadRegistry } from '../registry.js'
import { createAppProject, generateFontHtml, syncProjectAssets } from '../scaffold.js'

const roots: string[] = []
const fontName = '@molecule/app-fonts-fixture'
const font = {
  family: 'Fixture Font',
  source: 'local',
  fontsDir: 'fonts',
  faces: [{ file: 'fixture.woff2', weight: 400 }],
}

function fixture(mode?: string, svelte = false): string {
  const root = mkdtempSync(join(tmpdir(), 'mlcl-font-mode-'))
  roots.push(root)
  const fontsDir = join(root, 'node_modules', fontName, 'fonts')
  mkdirSync(fontsDir, { recursive: true })
  writeFileSync(join(fontsDir, 'fixture.woff2'), 'COMPLETE-FONT-BYTES')
  writeFileSync(
    join(root, 'node_modules', fontName, 'package.json'),
    JSON.stringify({ name: fontName, molecule: { font } }),
  )
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      dependencies: { [fontName]: '1.0.0' },
      molecule: {
        framework: svelte ? 'svelte' : 'react',
        ...(mode ? { fontAssetMode: mode } : {}),
      },
    }),
  )
  const publicDir = join(root, svelte ? 'static' : 'public', 'fonts')
  mkdirSync(publicDir, { recursive: true })
  writeFileSync(join(publicDir, 'curated.woff2'), 'CURATED')
  writeFileSync(join(publicDir, 'MaterialSymbolsOutlined.static.woff2'), 'HEALER')
  if (svelte) mkdirSync(join(root, 'src'))
  writeFileSync(
    join(root, svelte ? 'src/app.html' : 'index.html'),
    `<head><!-- mol:fonts --><style>
      @font-face { font-family: 'Curated'; src: url('/fonts/curated.woff2'); }
      @font-face { font-family: 'Fixture Font'; src: url('/fonts/old.woff2'); }
    </style><script>/* mol:icon-healer */var fallback='/fonts/MaterialSymbolsOutlined.static.woff2';</script><!-- /mol:fonts --></head>`,
  )
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('caller-declared font assets', () => {
  it('keeps default generation byte-identical to explicit copy mode', () => {
    const packages = loadRegistry('app')
    const names = ['@molecule/app-fonts-source-sans-3']
    const original = generateFontHtml(names, packages)
    expect(original).toEqual(generateFontHtml(names, packages, 'copy'))
    expect(original.fontFiles).toHaveLength(1)
    expect(original.html).toContain("url('/fonts/SourceSans3-VariableFont.ttf')")
  })

  it('renders public package assets without asking the caller to copy files', () => {
    const packages = loadRegistry('app')
    const names = ['@molecule/app-fonts-source-sans-3']
    const result = generateFontHtml(names, packages, 'module')
    expect(result.fontFiles).toEqual([])
    expect(result.html).toContain(
      "url('@molecule/app-fonts-source-sans-3/fonts/SourceSans3-VariableFont.ttf')",
    )
    expect(result.html).toContain('font-weight: 200 900')
    expect(result.html).toContain("local('Source Sans Pro')")
  })

  it('persists only an explicit mode in the generated app manifest', async () => {
    const root = fixture()
    const app = join(root, 'generated')
    await createAppProject(app, 'font-app', 'react', false, '', {}, [], undefined, {}, 'module')
    expect(JSON.parse(readFileSync(join(app, 'package.json'), 'utf8')).molecule.fontAssetMode).toBe(
      'module',
    )
    const legacy = join(root, 'legacy')
    await createAppProject(legacy, 'font-app', 'react')
    expect(
      JSON.parse(readFileSync(join(legacy, 'package.json'), 'utf8')).molecule.fontAssetMode,
    ).toBeUndefined()
  })

  it('refuses opting Svelte app.html into Vite index.html handling', async () => {
    const root = fixture()
    await expect(
      createAppProject(
        join(root, 'svelte'),
        'font-app',
        'svelte',
        false,
        '',
        {},
        [],
        undefined,
        {},
        'module',
      ),
    ).rejects.toThrow('Vite index.html')
  })

  it('reuses explicit module assets on sync without copying or deleting curated/healer files', async () => {
    const root = fixture('module')
    await syncProjectAssets(root)
    const first = readFileSync(join(root, 'index.html'), 'utf8')
    await syncProjectAssets(root)
    expect(readFileSync(join(root, 'index.html'), 'utf8')).toBe(first)
    expect(first).toContain(`${fontName}/fonts/fixture.woff2`)
    expect(first).not.toContain('rel="preload"')
    expect(first).toContain('/fonts/curated.woff2')
    expect(first).toContain('mol:icon-healer')
    expect(existsSync(join(root, 'public/fonts/fixture.woff2'))).toBe(false)
    expect(readFileSync(join(root, 'public/fonts/curated.woff2'), 'utf8')).toBe('CURATED')
    expect(
      readFileSync(join(root, 'public/fonts/MaterialSymbolsOutlined.static.woff2'), 'utf8'),
    ).toBe('HEALER')
  })

  it.each([undefined, 'copy', 'unknown'])(
    'keeps legacy copy behavior for mode %s',
    async (mode) => {
      const root = fixture(mode)
      await syncProjectAssets(root)
      expect(readFileSync(join(root, 'public/fonts/fixture.woff2'), 'utf8')).toBe(
        'COMPLETE-FONT-BYTES',
      )
      expect(readFileSync(join(root, 'index.html'), 'utf8')).toContain(
        "url('/fonts/fixture.woff2')",
      )
    },
  )

  it('keeps unstamped Svelte static files and app.html URLs', async () => {
    const root = fixture(undefined, true)
    await syncProjectAssets(root)
    expect(readFileSync(join(root, 'static/fonts/fixture.woff2'), 'utf8')).toBe(
      'COMPLETE-FONT-BYTES',
    )
    expect(readFileSync(join(root, 'src/app.html'), 'utf8')).toContain(
      "url('/fonts/fixture.woff2')",
    )
  })

  it('refuses an inconsistent module contract when sync selects Svelte app.html', async () => {
    const root = fixture('module', true)
    const path = join(root, 'src/app.html')
    const before = readFileSync(path, 'utf8')
    await expect(syncProjectAssets(root)).rejects.toThrow('app.html must use copy mode')
    expect(readFileSync(path, 'utf8')).toBe(before)
    expect(existsSync(join(root, 'static/fonts/fixture.woff2'))).toBe(false)
    expect(readFileSync(join(root, 'static/fonts/curated.woff2'), 'utf8')).toBe('CURATED')
  })

  it.each(["@molecule/bad');alert(1)//", '@molecule/../escape'])(
    'refuses unsafe module names %s',
    (name) => {
      const packages = loadRegistry('app')
      const original = packages.find((p) => p.name === '@molecule/app-fonts-source-sans-3')!
      expect(() => generateFontHtml([name], [{ ...original, name }], 'module')).toThrow(
        'packageName',
      )
    },
  )

  it('refuses a module font directory that could escape or inject markup', () => {
    const packages = loadRegistry('app')
    const original = packages.find((p) => p.name === '@molecule/app-fonts-source-sans-3')!
    const changed = {
      ...original,
      molecule: {
        ...original.molecule!,
        font: { ...original.molecule!.font!, fontsDir: '../escape' },
      },
    }
    expect(() => generateFontHtml([original.name], [changed], 'module')).toThrow('fontsDir')
  })

  it('refuses an unknown mode from an untyped caller instead of dropping required copies', () => {
    expect(() => generateFontHtml([], [], 'unknown' as 'copy')).toThrow('copy or module')
  })
})
