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
import { readSetupSqlFileOwner } from '../setup-sql.js'

/**
 * The bytes below the owner line mlcl prepends to every `__setup__/` file.
 *
 * The owner line is how the next run knows whose file it is (r10 review, F6);
 * the SQL payload after it is what replays, and it must be the package's own.
 *
 * @param content - A written `__setup__/` file.
 * @returns Its SQL payload.
 */
function sqlPayload(content: string): string {
  if (!readSetupSqlFileOwner(content)) return content
  return content.slice(content.indexOf('\n') + 1)
}

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

  /** A project + one source-tree package, with the given table declarations. */
  async function fixture(
    tables: { name: string; sqlFile: string }[],
  ): Promise<{ projectPath: string; pkg: InferredPackage }> {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-sqlsetup-'))
    const projectPath = join(dir, 'app')
    const pkgPath = join(dir, 'pkgs', 'demo')
    await mkdir(join(projectPath, '__setup__'), { recursive: true })
    await mkdir(join(pkgPath, 'src', '__setup__'), { recursive: true })
    await writeFile(join(pkgPath, 'src', '__setup__', 'demo.sql'), 'CREATE TABLE contained();\n')
    await writeFile(
      join(pkgPath, 'package.json'),
      `${JSON.stringify({ name: '@molecule/api-demo', version: '1.0.0' }, null, 2)}\n`,
    )
    await writeFile(join(dir, 'outside.sql'), 'CREATE TABLE outside();\n')
    return {
      projectPath,
      pkg: {
        name: '@molecule/api-demo',
        version: '1.0.0',
        type: 'resource' as never,
        dependencies: {},
        peerDependencies: {},
        routes: [],
        tables,
        exports: [],
        path: pkgPath,
        molecule: {} as never,
      },
    }
  }

  it('copies a contained sqlFile', async () => {
    const { projectPath, pkg } = await fixture([
      { name: 'demo', sqlFile: 'src/__setup__/demo.sql' },
    ])
    await copySqlSetupScripts(projectPath, [pkg.name], [pkg], { '@molecule/api-demo': '1.0.0' })
    expect(sqlPayload(await readFile(join(projectPath, '__setup__', 'demo.sql'), 'utf8'))).toBe(
      'CREATE TABLE contained();\n',
    )
  })

  it('refuses a declaration that escapes its package, writing nothing at all', async () => {
    const { projectPath, pkg } = await fixture([
      { name: 'demo', sqlFile: 'src/__setup__/demo.sql' },
      { name: 'evil', sqlFile: '../../../outside.sql' },
    ])

    // The preflight reports the same problem before `create` writes anything;
    // the copier refuses too, so a corrupt declaration can never leave an app
    // with a partial `__setup__/` (the contained file is not copied either).
    await expect(
      copySqlSetupScripts(projectPath, [pkg.name], [pkg], { '@molecule/api-demo': '1.0.0' }),
    ).rejects.toThrow(/outside its package/)
    const { readdir } = await import('node:fs/promises')
    expect(await readdir(join(projectPath, '__setup__'))).toEqual([])
  })
})

describe('copySqlSetupScripts and the compatibility preflight share one resolver', () => {
  let dir: string | null = null

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true })
    dir = null
  })

  const SQL = 'CREATE TABLE "addresses" ("id" UUID PRIMARY KEY);\n'
  const VERSION = '1.0.0'
  const VERSIONS = { '@molecule/api-resource-address': VERSION }

  /** A project with an empty `__setup__/`, plus its own (absent) package root. */
  async function project(): Promise<{ projectPath: string }> {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-sqlsetup-source-'))
    const projectPath = join(dir, 'app', 'api')
    await mkdir(join(projectPath, '__setup__'), { recursive: true })
    return { projectPath }
  }

  const pkg = (path: string, molecule: Record<string, unknown> = {}): InferredPackage => ({
    name: '@molecule/api-resource-address',
    version: '1.0.0',
    type: 'resource' as never,
    dependencies: {},
    peerDependencies: {},
    routes: [],
    tables: [{ name: 'addresses', sqlFile: 'src/__setup__/addresses.sql' }],
    exports: [],
    path,
    molecule: molecule as never,
  })

  it('writes the SQL of a package installed ABOVE the project (production layout)', async () => {
    // `mlcl create --skip-install` on the platform host: no molecule checkout,
    // one fleet install above the project. The preflight always walked this
    // chain; the copier only looked INSIDE the project, so the generated app
    // shipped an empty `__setup__/`.
    const { projectPath } = await project()
    const fleetPackage = join(dir!, 'node_modules', '@molecule', 'api-resource-address')
    await mkdir(join(fleetPackage, 'src', '__setup__'), { recursive: true })
    await writeFile(join(fleetPackage, 'src', '__setup__', 'addresses.sql'), SQL)
    // A real installed package declares the version its SQL belongs to; the
    // copier binds to it instead of taking the first directory it finds.
    await writeFile(
      join(fleetPackage, 'package.json'),
      `${JSON.stringify({ name: '@molecule/api-resource-address', version: VERSION }, null, 2)}\n`,
    )

    await copySqlSetupScripts(
      projectPath,
      ['@molecule/api-resource-address'],
      [pkg('/nonexistent/molecule/checkout')],
      VERSIONS,
    )

    expect(
      sqlPayload(await readFile(join(projectPath, '__setup__', 'addresses.sql'), 'utf8')),
    ).toBe(SQL)
  })

  it('writes the registry’s bundled SQL when no copy exists anywhere', async () => {
    const { projectPath } = await project()
    await copySqlSetupScripts(
      projectPath,
      ['@molecule/api-resource-address'],
      [
        pkg('/nonexistent/molecule/checkout', {
          setupSql: { 'src/__setup__/addresses.sql': SQL },
          setupSqlVersion: VERSION,
        }),
      ],
      VERSIONS,
    )
    expect(
      sqlPayload(await readFile(join(projectPath, '__setup__', 'addresses.sql'), 'utf8')),
    ).toBe(SQL)
  })

  it('refuses, writing nothing, when neither a copy nor bundled SQL exists', async () => {
    const { projectPath } = await project()
    await expect(
      copySqlSetupScripts(
        projectPath,
        ['@molecule/api-resource-address'],
        [pkg('/nonexistent/molecule/checkout')],
        VERSIONS,
      ),
    ).rejects.toThrow(/bundles no setup SQL/)
    const { readdir } = await import('node:fs/promises')
    expect(await readdir(join(projectPath, '__setup__'))).toEqual([])
  })

  it('refuses two packages that would write one destination with different bytes (F8)', async () => {
    // The writer names the destination by BASENAME, so `src/__setup__/x.sql` and
    // `setup/x.sql` collide. Different bytes used to be a silent overwrite: one
    // package's schema shipped and the other's table was simply missing.
    const { projectPath } = await project()
    const first: InferredPackage = {
      ...pkg('/nonexistent/checkout-a', {
        setupSql: { 'src/__setup__/shared.sql': 'CREATE TABLE a (id int);\n' },
        setupSqlVersion: VERSION,
      }),
      tables: [{ name: 'a', sqlFile: 'src/__setup__/shared.sql' }],
    }
    const second: InferredPackage = {
      ...pkg('/nonexistent/checkout-b', {
        setupSql: { 'setup/shared.sql': 'CREATE TABLE b (id int);\n' },
        setupSqlVersion: VERSION,
      }),
      name: '@molecule/api-other',
      tables: [{ name: 'b', sqlFile: 'setup/shared.sql' }],
    }
    const versions = { [first.name]: VERSION, [second.name]: VERSION }
    await expect(
      copySqlSetupScripts(projectPath, [first.name, second.name], [first, second], versions),
    ).rejects.toThrow(/DIFFERENT bytes/)
    const { readdir } = await import('node:fs/promises')
    // Refused BEFORE writing — not a partial `__setup__/`.
    expect(await readdir(join(projectPath, '__setup__'))).toEqual([])
  })

  it('writes one file when two packages declare the same destination with identical bytes (F8 control)', async () => {
    const { projectPath } = await project()
    const sql = 'CREATE TABLE a (id int);\n'
    const first: InferredPackage = {
      ...pkg('/nonexistent/checkout-a', {
        setupSql: { 'src/__setup__/shared.sql': sql },
        setupSqlVersion: VERSION,
      }),
      tables: [{ name: 'a', sqlFile: 'src/__setup__/shared.sql' }],
    }
    const second: InferredPackage = {
      ...pkg('/nonexistent/checkout-b', {
        setupSql: { 'setup/shared.sql': sql },
        setupSqlVersion: VERSION,
      }),
      name: '@molecule/api-other',
      tables: [{ name: 'a', sqlFile: 'setup/shared.sql' }],
    }
    const versions = { [first.name]: VERSION, [second.name]: VERSION }
    await copySqlSetupScripts(projectPath, [first.name, second.name], [first, second], versions)
    const { readdir } = await import('node:fs/promises')
    expect(await readdir(join(projectPath, '__setup__'))).toEqual(['shared.sql'])
    expect(sqlPayload(await readFile(join(projectPath, '__setup__', 'shared.sql'), 'utf8'))).toBe(
      sql,
    )
  })
})
