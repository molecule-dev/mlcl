/**
 * The metadata `mlcl init` flags and a package's own `molecule.font` /
 * `tables` declarations become paths, SQL and markup in the scaffolded output.
 * These tests pin the refusals that keep hostile values out of those sinks:
 *
 * - a font `family`/`faces[].file`/`url`/`utilityCss` that carries its markup
 *   context's own syntax (`</style>`, `"`, a `'`) must be refused, not
 *   interpolated — the module itself declares this metadata untrusted for its
 *   PATHS (`isInsideDir`); the markup half gets the same treatment.
 * - a `--category`-derived table name may not carry path or quote syntax: it
 *   becomes `src/__setup__/<table>.sql` AND the quoted identifier in the
 *   migration the generated runner replays.
 * - an `implements` value becomes a generated import's module specifier.
 * - a package directory resolved from that metadata stays inside `packages/`.
 * - a registry-declared `tables[].sqlFile` is only read from INSIDE its own
 *   package — whatever the copy lands in `__setup__/` the migration runner
 *   replays as SQL.
 *
 * Every refusal names the value's own contract, so a legitimate declaration
 * that trips one is a metadata bug to fix, not a gate to loosen. The last
 * test runs the guard over the REAL registry fleet, so tightening a shape
 * here cannot silently break a published font package.
 *
 * @module
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  assertNpmPackageName,
  assertSafeFontMeta,
  assertSafeTableName,
  copySqlSetupScripts,
  generateFontHtml,
  resolvePackageDirectory,
} from '../scaffold.js'
import type { InferredPackage } from '../schema.js'

const fontPackage = (font: Record<string, unknown>): InferredPackage[] => [
  {
    name: '@molecule/app-fonts-hostile',
    version: '1.0.0',
    type: 'provider' as never,
    dependencies: {},
    peerDependencies: {},
    routes: [],
    tables: [],
    exports: [],
    path: '/fake',
    molecule: { category: 'fonts', type: 'provider', font } as never,
  },
]

describe('font metadata that could leave its markup context is refused', () => {
  it('the guard refuses a family that closes the <style> element', () => {
    expect(() =>
      assertSafeFontMeta(
        { source: 'local', family: 'A</style><script>alert(1)</script>' } as never,
        '@molecule/app-fonts-hostile',
      ),
    ).toThrow(/family/)
  })

  it('the guard refuses a face file with a quote or a path separator', () => {
    const withQuote = `a.woff2', url('https://evil`
    expect(() =>
      assertSafeFontMeta(
        { source: 'local', family: 'X', faces: [{ file: withQuote }] } as never,
        '@molecule/app-fonts-hostile',
      ),
    ).toThrow(/faces\[\]\.file/)
    expect(() =>
      assertSafeFontMeta(
        { source: 'local', family: 'X', faces: [{ file: '../../etc/passwd' }] } as never,
        '@molecule/app-fonts-hostile',
      ),
    ).toThrow(/faces\[\]\.file/)
  })

  it('the guard refuses an http stylesheet URL and a quote in preconnect', () => {
    expect(() =>
      assertSafeFontMeta(
        { source: 'cdn', family: 'X', url: 'http://fonts.example/x.css' } as never,
        '@molecule/app-fonts-hostile',
      ),
    ).toThrow(/url/)
    expect(() =>
      assertSafeFontMeta(
        { source: 'cdn', family: 'X', preconnect: ['https://x" onerror=1'] } as never,
        '@molecule/app-fonts-hostile',
      ),
    ).toThrow(/preconnect/)
  })

  it('the guard refuses utilityCss that closes the style element', () => {
    expect(() =>
      assertSafeFontMeta(
        { source: 'local', family: 'X', utilityCss: '.i {} </style><script>x</script>' } as never,
        '@molecule/app-fonts-hostile',
      ),
    ).toThrow(/utilityCss/)
  })

  it('generateFontHtml interpolates none of a hostile declaration into the document', () => {
    const font = {
      source: 'local',
      family: "A'</style><script>alert(1)</script>",
      faces: [{ file: 'a</style><script>b</script>.ttf', weight: '400' }],
    }
    let html = ''
    try {
      html = generateFontHtml(['@molecule/app-fonts-hostile'], fontPackage(font)).html
      expect.unreachable('a hostile font declaration must be refused')
    } catch (error) {
      expect((error as Error).message).toMatch(/app-fonts-hostile/)
    }
    expect(html, 'nothing may be built from the refused values').toBe('')
  })

  it('every real registry font declaration passes the guard unchanged', async () => {
    // The fleet check lives with the guard: a shape rule tightened past what a
    // published package declares must fail HERE, not on a user's `mlcl create`.
    const { loadRegistry } = await import('../registry.js')
    const fleet = loadRegistry()
    const fonts = fleet.filter(
      (p) =>
        p.molecule?.category === 'fonts' && p.molecule?.type === 'provider' && p.molecule?.font,
    )
    expect(fonts.length, 'the registry must still declare font packages').toBeGreaterThan(5)
    for (const pkg of fonts) {
      expect(() => assertSafeFontMeta(pkg.molecule.font as never, pkg.name)).not.toThrow()
      // The create path renders the fleet's declarations without a refusal.
      expect(() => generateFontHtml([pkg.name], fleet)).not.toThrow()
    }
  })
})

describe('init metadata that becomes a path, an identifier or a module specifier', () => {
  it('a package directory resolved from --category stays inside the monorepo', () => {
    // `../..` cancels `bonds` and folds back inside `packages/` — legal, if
    // odd — so the payload escapes the monorepo for real.
    expect(() =>
      resolvePackageDirectory('/monorepo', {
        name: 'api-cache-evil',
        type: 'provider',
        stack: 'api',
        category: '../../../../tmp/evil',
      }),
    ).toThrow(/outside/)
    expect(() =>
      resolvePackageDirectory('/monorepo', {
        name: 'api-../../../../tmp/evil-package',
        type: 'resource',
        stack: 'api',
        category: 'project',
      }),
    ).toThrow(/outside/)
    // …and the legitimate shapes still resolve to where they always did.
    expect(
      resolvePackageDirectory('/monorepo', {
        name: 'api-cache-redis',
        type: 'provider',
        stack: 'api',
        category: 'cache',
      }),
    ).toBe(join('/monorepo', 'packages', 'api', 'bonds', 'cache', 'redis'))
  })

  it('a table name carrying path, quote or control syntax is refused', () => {
    expect(assertSafeTableName('code_editors')).toBe('code_editors')
    expect(assertSafeTableName('code-editors')).toBe('code-editors')
    expect(() => assertSafeTableName('../../shared/evil')).toThrow(/table name/)
    expect(() => assertSafeTableName('users" ; DROP TABLE users; --')).toThrow(/table name/)
    expect(() => assertSafeTableName('users\nEVIL=1')).toThrow(/table name/)
  })

  it('an implements value that is not a package name is refused', () => {
    expect(assertNpmPackageName('@molecule/api-cache')).toBe('@molecule/api-cache')
    expect(assertNpmPackageName('left-pad')).toBe('left-pad')
    expect(() => assertNpmPackageName("@molecule/api-cache'; process.exit(1)")).toThrow(
      /implements/,
    )
  })
})

describe('a declared sqlFile is only read from inside its own package', () => {
  let dir: string | null = null

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true })
    dir = null
  })

  it('copies a contained sqlFile and skips one that escapes the package', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-sqlsetup-'))
    const projectPath = join(dir, 'app')
    const pkgPath = join(dir, 'pkgs', 'demo')
    await mkdir(join(projectPath, '__setup__'), { recursive: true })
    await mkdir(join(pkgPath, 'src', '__setup__'), { recursive: true })
    const contained = 'CREATE TABLE contained();\n'
    const outside = 'CREATE TABLE outside();\n'
    await writeFile(join(pkgPath, 'src', '__setup__', 'demo.sql'), contained)
    await writeFile(join(dir, 'outside.sql'), outside)

    const pkg: InferredPackage = {
      name: '@molecule/api-demo',
      version: '1.0.0',
      type: 'resource' as never,
      dependencies: {},
      peerDependencies: {},
      routes: [],
      tables: [
        { name: 'demo', sqlFile: 'src/__setup__/demo.sql' },
        { name: 'evil', sqlFile: '../../../outside.sql' },
      ],
      exports: [],
      path: pkgPath,
      molecule: {} as never,
    }
    await copySqlSetupScripts(projectPath, [pkg.name], [pkg])

    // The legitimate declaration is still copied…
    expect(await readFile(join(projectPath, '__setup__', 'demo.sql'), 'utf8')).toBe(contained)
    // …and the escaping one never lands in the directory the runner replays.
    await expect(readFile(join(projectPath, '__setup__', 'outside.sql'), 'utf8')).rejects.toThrow()
    const copied: string[] = []
    const { readdir } = await import('node:fs/promises')
    for (const entry of await readdir(join(projectPath, '__setup__'))) {
      copied.push(entry)
      const body = await readFile(join(projectPath, '__setup__', entry), 'utf8')
      expect(body, `${entry} must not carry the escaped file's bytes`).not.toBe(outside)
    }
  })
})
