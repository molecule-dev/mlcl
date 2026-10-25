/**
 * The setup-SQL compatibility preflight (`database-compatibility.ts`).
 *
 * The vocabulary is the shared type contract
 * (`@molecule/api-database/sql-compatibility.js`), and the SQL analysis and the
 * compatibility decision live in this CLI's `sql-requirements.ts` — deciding
 * whether a selection can compile is compilation work, not a core contract.
 * This module is the mlcl layer that resolves a selection's setup files, runs the check with
 * the SELECTED provider's declaration, and refuses with package, file and the
 * provider's own explanation.
 *
 * What is proven here:
 *
 * 1. Absence is never support — a provider with no declaration, or one missing a
 *    feature the SQL uses, is refused (`missing-capability`), and a declared
 *    file that cannot be read is refused too.
 * 2. The provider's declaration decides — the same SQL and database pass or fail
 *    only because the capability map says so, including the translation the
 *    DuckDB bond provides for partial indexes.
 * 3. The registry library classification matches the real engine: exactly the
 *    packages whose setup SQL needs an `ON DELETE`/`ON UPDATE` referential action
 *    are refused on DuckDB; partial-index-only packages are NOT (the bond
 *    translates them). Cross-checked against
 *    `scripts/candidates/duckdb-resource-contract/evidence/classify.json`
 *    (real arm64 DuckDB, 2026-10-24).
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, relative } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  assertDdlCompatibility,
  DatabaseDdlCompatibilityError,
  preflightSqlCompatibility,
  providerSqlCapabilities,
} from '../database-compatibility.js'
import { getMoleculeVersion, loadRegistry } from '../registry.js'
import type { InferredPackage } from '../schema.js'
import { resolveSetupSqlSources, resolveSqlDirectorySources } from '../setup-sql.js'

const DUCKDB = '@molecule/api-database-duckdb'
const MOTHERDUCK = '@molecule/api-database-motherduck'
const POSTGRES = '@molecule/api-database-postgresql'
const COMMENT = '@molecule/api-resource-comment'
const ADDRESS = '@molecule/api-resource-address'
const PAYMENT = '@molecule/api-resource-payment-method'

/**
 * The exact version every fixture package is installed/bundled at.
 *
 * Setup SQL is bound to ONE package version (`setupSqlVersion` + the caller's
 * `versions` map); these fixtures pin everything at this version unless a case
 * deliberately uses another one.
 */
const VERSION = '1.0.0'

/**
 * The intended version map for a fixture selection.
 *
 * @param names - Package names in the selection.
 * @param version - The exact version intended for each (default {@link VERSION}).
 * @returns Package name → exact version.
 */
const versionsFor = (names: readonly string[], version: string = VERSION): Record<string, string> =>
  Object.fromEntries(names.map((name) => [name, version]))

/**
 * The DuckDB/MotherDuck declarations from
 * `scripts/candidates/duckdb-resource-contract/delta/sql-capabilities.json`
 * (support values only; the notes are the bond's own prose).
 */
const DUCKDB_CAPABILITIES = {
  'fk-referential-action': { support: 'unsupported' as const },
  'partial-index': { support: 'translated' as const },
  'unique-partial-index': { support: 'translated' as const },
}
/** PostgreSQL applies the published dialect as written. */
const POSTGRES_CAPABILITIES = {
  'fk-referential-action': { support: 'native' as const },
  'partial-index': { support: 'native' as const },
  'unique-partial-index': { support: 'native' as const },
}

const tempDirs: string[] = []
afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

/** A registry entry shaped enough for the preflight to resolve a database. */
function fixturePackage(
  name: string,
  options: {
    tables?: { name: string; sqlFile: string }[]
    path?: string
    label?: string
    setupSql?: Record<string, string>
    setupSqlVersion?: string
    sqlCapabilities?: Record<
      string,
      { support: 'native' | 'translated' | 'unsupported'; note?: string }
    >
  } = {},
): InferredPackage {
  return {
    name,
    version: '0.0.0',
    type: 'provider',
    routes: [],
    tables: options.tables ?? [],
    exports: [],
    path: options.path ?? `/nonexistent/${name}`,
    molecule: {
      type: 'provider',
      category: 'database',
      label: options.label ?? name,
      secrets: [],
      runtimeDependencies: [],
      ...(options.setupSql ? { setupSql: options.setupSql } : {}),
      ...(options.setupSqlVersion ? { setupSqlVersion: options.setupSqlVersion } : {}),
      ...(options.sqlCapabilities ? { sqlCapabilities: options.sqlCapabilities } : {}),
    },
  }
}

/** Write setup SQL where the preflight reads it (the installed copy). */
async function projectWithSetupSql(
  files: { packageName: string; sqlFile: string; sql: string; version?: string }[],
  options: { sourceTree?: boolean } = {},
): Promise<string> {
  const project = await mkdtemp(join(tmpdir(), 'mlcl-ddl-compat-'))
  tempDirs.push(project)
  for (const file of files) {
    const root = options.sourceTree
      ? join(project, 'source', file.packageName)
      : join(project, 'node_modules', file.packageName)
    const target = join(root, 'src', '__setup__', file.sqlFile)
    await mkdir(join(target, '..'), { recursive: true })
    await writeFile(target, file.sql)
    // A resolvable package root declares the version its bytes belong to; the
    // resolver binds to it, so a fixture without one is not a candidate at all.
    await writeFile(
      join(root, 'package.json'),
      `${JSON.stringify({ name: file.packageName, version: file.version ?? VERSION }, null, 2)}\n`,
    )
  }
  return project
}

const FK_CASCADE_SQL = `CREATE TABLE IF NOT EXISTS "comments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "parentId" UUID REFERENCES "comments"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
`
const PARTIAL_INDEX_SQL = `CREATE TABLE IF NOT EXISTS "addresses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_addresses_user_default_shipping"
  ON "addresses" ("userId") WHERE "isDefaultShipping" = TRUE;
`
const UNIQUE_PARTIAL_INDEX_SQL = `CREATE TABLE IF NOT EXISTS "payment_methods" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "payment_methods_userId_default_idx"
  ON "payment_methods" ("userId") WHERE "isDefault" = true;
`
const SUPPORTED_SQL = `CREATE TABLE IF NOT EXISTS "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
`

describe('providerSqlCapabilities', () => {
  it('reads the declaration from the registry entry, never from the provider', () => {
    expect(
      providerSqlCapabilities(fixturePackage(DUCKDB, { sqlCapabilities: DUCKDB_CAPABILITIES })),
    ).toEqual(DUCKDB_CAPABILITIES)
    // Absence is undefined, NOT "supports everything" — the preflight fails closed.
    expect(providerSqlCapabilities(fixturePackage(POSTGRES))).toBeUndefined()
  })
})

describe('resolveSetupSqlSources', () => {
  it('reads the installed copy first, and the source tree as the fallback', async () => {
    const installed = await projectWithSetupSql([
      { packageName: COMMENT, sqlFile: 'comments.sql', sql: FK_CASCADE_SQL },
    ])
    const sourceTree = await projectWithSetupSql(
      [{ packageName: COMMENT, sqlFile: 'comments.sql', sql: FK_CASCADE_SQL }],
      { sourceTree: true },
    )
    const pkg = fixturePackage(COMMENT, {
      tables: [{ name: 'comments', sqlFile: 'src/__setup__/comments.sql' }],
      path: join(sourceTree, 'source', COMMENT),
    })
    const result = await resolveSetupSqlSources({
      projectPath: installed,
      packageNames: [COMMENT],
      versions: versionsFor([COMMENT]),
      packages: [pkg],
    })
    expect(result.problems).toEqual([])
    expect(result.sources).toEqual([
      {
        source: `${COMMENT}:src/__setup__/comments.sql`,
        packageName: COMMENT,
        sqlFile: 'src/__setup__/comments.sql',
        sql: FK_CASCADE_SQL,
        origin: 'installed',
        version: VERSION,
        path: join(installed, 'node_modules', COMMENT, 'src', '__setup__', 'comments.sql'),
      },
    ])
  })

  it('finds a package installed for the PROJECT by node resolution (ancestor node_modules)', async () => {
    // A production host has no molecule checkout and one fleet install ABOVE the
    // project (`/app/node_modules` for a project at `/workspace/proj`). Only
    // joining `<project>/node_modules` missed it, so every database selection was
    // refused as "cannot read the setup SQL" even though the published package
    // ships `src/__setup__` and Node resolves it.
    const fleet = await mkdtemp(join(tmpdir(), 'mlcl-ddl-fleet-'))
    tempDirs.push(fleet)
    const target = join(fleet, 'node_modules', COMMENT, 'src', '__setup__', 'comments.sql')
    await mkdir(join(target, '..'), { recursive: true })
    await writeFile(target, FK_CASCADE_SQL)
    await writeFile(
      join(fleet, 'node_modules', COMMENT, 'package.json'),
      `${JSON.stringify({ name: COMMENT, version: VERSION }, null, 2)}\n`,
    )
    const project = join(fleet, 'workspace', 'api')
    await mkdir(project, { recursive: true })
    const result = await resolveSetupSqlSources({
      projectPath: project,
      packageNames: [COMMENT],
      versions: versionsFor([COMMENT]),
      packages: [
        fixturePackage(COMMENT, {
          tables: [{ name: 'comments', sqlFile: 'src/__setup__/comments.sql' }],
          path: '/nonexistent/source-checkout',
        }),
      ],
    })
    expect(result.problems).toEqual([])
    expect(result.sources).toHaveLength(1)
    expect(result.sources[0].sql).toBe(FK_CASCADE_SQL)
    expect(result.sources[0].origin).toBe('installed')
  })

  it('falls back to the exact SQL bundled in the registry when no copy exists at all', async () => {
    // The vendor package publishes its setup SQL, and the registry carries those
    // exact bytes (`sync-registry --scan-tables`). `--skip-install` on a host
    // with no molecule checkout and no installed fleet therefore still copies
    // and judges the REAL DDL — "not installed yet" is not an unavailable input.
    const project = await projectWithSetupSql([])
    const result = await resolveSetupSqlSources({
      projectPath: project,
      packageNames: [COMMENT],
      versions: versionsFor([COMMENT]),
      packages: [
        fixturePackage(COMMENT, {
          tables: [{ name: 'comments', sqlFile: 'src/__setup__/comments.sql' }],
          path: '/nonexistent/molecule/checkout',
          setupSql: { 'src/__setup__/comments.sql': FK_CASCADE_SQL },
          setupSqlVersion: VERSION,
        }),
      ],
    })
    expect(result.problems).toEqual([])
    expect(result.sources).toEqual([
      {
        source: `${COMMENT}:src/__setup__/comments.sql`,
        packageName: COMMENT,
        sqlFile: 'src/__setup__/comments.sql',
        sql: FK_CASCADE_SQL,
        origin: 'bundled',
        version: VERSION,
      },
    ])
  })

  it('never lets the bundled copy hide a declared file missing from an installed package', async () => {
    // The package root EXISTS at the intended version (it is installed); only
    // the declared file is absent. That is a broken install or stale metadata,
    // and copying the bundled bytes instead would mask it.
    const project = await projectWithSetupSql([])
    await mkdir(join(project, 'node_modules', COMMENT), { recursive: true })
    await writeFile(
      join(project, 'node_modules', COMMENT, 'package.json'),
      `${JSON.stringify({ name: COMMENT, version: VERSION }, null, 2)}\n`,
    )
    const result = await resolveSetupSqlSources({
      projectPath: project,
      packageNames: [COMMENT],
      versions: versionsFor([COMMENT]),
      packages: [
        fixturePackage(COMMENT, {
          tables: [{ name: 'comments', sqlFile: 'src/__setup__/comments.sql' }],
          setupSql: { 'src/__setup__/comments.sql': FK_CASCADE_SQL },
          setupSqlVersion: VERSION,
        }),
      ],
    })
    expect(result.sources).toEqual([])
    expect(result.problems).toHaveLength(1)
    expect(result.problems[0].source).toBe(`${COMMENT}:src/__setup__/comments.sql`)
    expect(result.problems[0].message).toContain(
      'Cannot read @molecule/api-resource-comment:src/__setup__/comments.sql',
    )
  })

  it('refuses a declared file with neither a copy nor bundled SQL', async () => {
    // Neither an installed/source root nor the registry's bundled bytes — there
    // is genuinely nothing to judge or copy, so the caller must refuse before it
    // writes or installs anything.
    const project = await projectWithSetupSql([])
    const result = await resolveSetupSqlSources({
      projectPath: project,
      packageNames: [COMMENT],
      versions: versionsFor([COMMENT]),
      packages: [
        fixturePackage(COMMENT, {
          tables: [{ name: 'comments', sqlFile: 'src/__setup__/comments.sql' }],
          path: '/nonexistent/molecule/checkout',
        }),
      ],
    })
    expect(result.sources).toEqual([])
    expect(result.problems).toHaveLength(1)
    expect(result.problems[0].message).toContain('bundles no setup SQL for it')
    expect(result.problems[0].message).toContain('sync-registry --scan-tables')
  })

  it('never reads outside the package a sqlFile is declared for', async () => {
    const project = await projectWithSetupSql([])
    await mkdir(join(project, 'node_modules', COMMENT), { recursive: true })
    await writeFile(
      join(project, 'node_modules', COMMENT, 'package.json'),
      `${JSON.stringify({ name: COMMENT, version: VERSION }, null, 2)}\n`,
    )
    const result = await resolveSetupSqlSources({
      projectPath: project,
      packageNames: [COMMENT],
      versions: versionsFor([COMMENT]),
      packages: [
        fixturePackage(COMMENT, {
          tables: [{ name: 'escape', sqlFile: '../../../etc/hostname' }],
          setupSql: { '../../../etc/hostname': 'CREATE TABLE "x" (id int);' },
          setupSqlVersion: VERSION,
        }),
      ],
    })
    expect(result.sources).toEqual([])
    expect(result.problems).toHaveLength(1)
    expect(result.problems[0].message).toContain('outside its package')
  })
})

describe('resolveSqlDirectorySources', () => {
  it('reads the SQL a boot replays from __setup__ and migrations', async () => {
    const project = await projectWithSetupSql([])
    await mkdir(join(project, '__setup__'), { recursive: true })
    await mkdir(join(project, 'migrations'), { recursive: true })
    await writeFile(join(project, '__setup__', 'comments.sql'), FK_CASCADE_SQL)
    await writeFile(join(project, 'migrations', '0001_posts.sql'), SUPPORTED_SQL)
    // Not `.sql` — never replayed, never judged.
    await writeFile(join(project, 'migrations', 'notes.md'), FK_CASCADE_SQL)
    const result = await resolveSqlDirectorySources([
      join(project, '__setup__'),
      join(project, 'migrations'),
    ])
    expect(result.problems).toEqual([])
    expect(result.sources.map((source) => source.sqlFile).sort()).toEqual([
      '0001_posts.sql',
      'comments.sql',
    ])
    expect(result.sources.every((source) => source.origin === 'replay')).toBe(true)
  })

  it('treats a directory that is not there as nothing to replay', async () => {
    const result = await resolveSqlDirectorySources(['/nonexistent/__setup__'])
    expect(result).toEqual({ sources: [], problems: [] })
  })
})

describe('resolveSetupSqlSources — the bytes are bound to the intended version (F3)', () => {
  const HERE = 'src/__setup__/addresses.sql'
  const SQL_AT_104 = 'CREATE TABLE "addresses" ("id" UUID PRIMARY KEY, "v" INT); -- 1.0.4\n'
  const SQL_AT_103 = 'CREATE TABLE "addresses" ("id" UUID PRIMARY KEY, "old" INT); -- 1.0.3\n'
  const TABLES = [{ name: 'addresses', sqlFile: HERE }]

  /**
   * Write an installed copy of ADDRESS at a root, with its own package.json.
   *
   * @param nodeModules - The `node_modules` directory to install into.
   * @param version - The version that copy declares.
   * @param sql - The bytes its declared file carries.
   * @returns The package root.
   */
  async function install(
    nodeModules: string,
    version: string,
    sql: string = SQL_AT_104,
  ): Promise<string> {
    const root = join(nodeModules, ADDRESS)
    await mkdir(join(root, 'src', '__setup__'), { recursive: true })
    await writeFile(join(root, 'src', '__setup__', 'addresses.sql'), sql)
    await writeFile(
      join(root, 'package.json'),
      `${JSON.stringify({ name: ADDRESS, version }, null, 2)}\n`,
    )
    return root
  }

  /**
   * A project directory (with an empty `node_modules`), optionally under a fleet root.
   *
   * @param fleetVersion - When set, an ancestor `node_modules` carries this version.
   * @returns The project path and its fleet root (null when none).
   */
  async function topology(
    fleetVersion?: string,
  ): Promise<{ project: string; fleet: string | null }> {
    const base = await mkdtemp(join(tmpdir(), 'mlcl-ddl-version-'))
    tempDirs.push(base)
    const project = join(base, 'workspace', 'api')
    await mkdir(project, { recursive: true })
    let fleet: string | null = null
    if (fleetVersion) {
      fleet = join(base, 'node_modules')
      await install(fleet, fleetVersion, SQL_AT_104)
    }
    return { project, fleet }
  }

  /**
   * A registry entry whose bundled bytes are tagged with `version`.
   *
   * @param version - `setupSqlVersion` (undefined = an untagged bundle).
   * @param sql - The bundled bytes.
   * @returns A fixture registry entry.
   */
  const bundled = (version?: string, sql: string = SQL_AT_104): InferredPackage =>
    fixturePackage(ADDRESS, {
      tables: TABLES,
      path: '/nonexistent/molecule/checkout',
      setupSql: { [HERE]: sql },
      ...(version ? { setupSqlVersion: version } : {}),
    })

  it('uses an installed copy at the intended version and tags the bytes with it', async () => {
    const { project } = await topology()
    await install(join(project, 'node_modules'), '1.0.4')
    const result = await resolveSetupSqlSources({
      projectPath: project,
      packageNames: [ADDRESS],
      versions: { [ADDRESS]: '1.0.4' },
      packages: [bundled('1.0.4', SQL_AT_103)],
    })
    expect(result.problems).toEqual([])
    expect(result.sources).toEqual([
      {
        source: `${ADDRESS}:${HERE}`,
        packageName: ADDRESS,
        sqlFile: HERE,
        sql: SQL_AT_104,
        origin: 'installed',
        version: '1.0.4',
        path: join(project, 'node_modules', ADDRESS, HERE),
      },
    ])
  })

  it('ignores a wrong-version parent fleet install and uses the intended bundle', async () => {
    // The production-ish shape: a fleet install ABOVE the project at another
    // release. Its bytes are not what the pin names, so they are not an input.
    const { project } = await topology('1.0.3')
    const result = await resolveSetupSqlSources({
      projectPath: project,
      packageNames: [ADDRESS],
      versions: { [ADDRESS]: '1.0.4' },
      packages: [bundled('1.0.4')],
    })
    expect(result.problems).toEqual([])
    expect(result.sources.map((source) => [source.origin, source.version, source.sql])).toEqual([
      ['bundled', '1.0.4', SQL_AT_104],
    ])
  })

  it('ignores a project install of another version', async () => {
    const { project } = await topology()
    await install(join(project, 'node_modules'), '1.0.3', SQL_AT_103)
    const result = await resolveSetupSqlSources({
      projectPath: project,
      packageNames: [ADDRESS],
      versions: { [ADDRESS]: '1.0.4' },
      packages: [bundled('1.0.4')],
    })
    expect(result.sources.map((source) => [source.origin, source.version])).toEqual([
      ['bundled', '1.0.4'],
    ])
  })

  it('prefers a matching source tree over a bundle of another version', async () => {
    const { project } = await topology()
    const source = await mkdtemp(join(tmpdir(), 'mlcl-ddl-source-'))
    tempDirs.push(source)
    await install(join(source, 'node_modules'), '1.0.4', SQL_AT_104)
    const result = await resolveSetupSqlSources({
      projectPath: project,
      packageNames: [ADDRESS],
      versions: { [ADDRESS]: '1.0.4' },
      packages: [
        fixturePackage(ADDRESS, {
          tables: TABLES,
          path: join(source, 'node_modules', ADDRESS),
          setupSql: { [HERE]: SQL_AT_103 },
          setupSqlVersion: '1.0.3',
        }),
      ],
    })
    expect(result.sources.map((source) => [source.origin, source.version, source.sql])).toEqual([
      ['source', '1.0.4', SQL_AT_104],
    ])
  })

  it('refuses a matching root whose declared file is missing — never the bundle', async () => {
    const { project } = await topology()
    const root = await install(join(project, 'node_modules'), '1.0.4')
    await rm(join(root, 'src', '__setup__', 'addresses.sql'))
    const result = await resolveSetupSqlSources({
      projectPath: project,
      packageNames: [ADDRESS],
      versions: { [ADDRESS]: '1.0.4' },
      packages: [bundled('1.0.4')],
    })
    expect(result.sources).toEqual([])
    expect(result.problems[0].message).toContain('Cannot read')
    expect(result.problems[0].message).toContain('declares 1.0.4 but not this file')
  })

  it('refuses a bundle recorded for another version', async () => {
    const { project } = await topology()
    const result = await resolveSetupSqlSources({
      projectPath: project,
      packageNames: [ADDRESS],
      versions: { [ADDRESS]: '1.0.4' },
      packages: [bundled('1.0.3', SQL_AT_103)],
    })
    expect(result.sources).toEqual([])
    expect(result.problems[0].message).toContain('bundled setup SQL belongs to')
    expect(result.problems[0].message).toContain('@1.0.3')
  })

  it('refuses a bundle with no recorded version', async () => {
    const { project } = await topology()
    const result = await resolveSetupSqlSources({
      projectPath: project,
      packageNames: [ADDRESS],
      versions: { [ADDRESS]: '1.0.4' },
      packages: [bundled(undefined)],
    })
    expect(result.sources).toEqual([])
    expect(result.problems[0].message).toContain('no setupSqlVersion recorded')
  })

  it('refuses when the intended version is available nowhere', async () => {
    const { project } = await topology('1.0.3')
    const result = await resolveSetupSqlSources({
      projectPath: project,
      packageNames: [ADDRESS],
      versions: { [ADDRESS]: '1.0.5' },
      packages: [bundled('1.0.4')],
    })
    expect(result.sources).toEqual([])
    expect(result.problems[0].message).toContain('@1.0.5 is not available')
    expect(result.problems[0].message).toContain('installed 1.0.3')
  })

  it('refuses a range or a tag as the intended version', async () => {
    const { project } = await topology()
    for (const intended of ['^1.0.4', 'latest', 'workspace:*', 'file:../address']) {
      const result = await resolveSetupSqlSources({
        projectPath: project,
        packageNames: [ADDRESS],
        versions: { [ADDRESS]: intended },
        packages: [bundled('1.0.4')],
      })
      expect(result.sources).toEqual([])
      expect(result.problems[0].message).toContain('is not an exact')
    }
  })

  it('refuses when no intended version is supplied at all', async () => {
    const { project } = await topology()
    const result = await resolveSetupSqlSources({
      projectPath: project,
      packageNames: [ADDRESS],
      versions: {},
      packages: [bundled('1.0.4')],
    })
    expect(result.sources).toEqual([])
    expect(result.problems[0].message).toContain('No exact version is recorded')
  })

  it('resolves an installed copy from a RELATIVE project path (mlcl inject -p app)', async () => {
    // `createRequire` needs an absolute anchor; a relative `-p` used to throw,
    // the catch returned "no roots", and the preflight judged the BUNDLE while
    // the injector wrote the INSTALLED copy — two different files under one
    // verdict (r6 acceptance review, F7).
    const project = await projectWithSetupSql([
      { packageName: ADDRESS, sqlFile: 'addresses.sql', sql: SQL_AT_104 },
    ])
    const relativeProject = relative(process.cwd(), project)
    expect(relativeProject.startsWith('..')).toBe(true)
    const result = await resolveSetupSqlSources({
      projectPath: relativeProject,
      packageNames: [ADDRESS],
      versions: { [ADDRESS]: VERSION },
      packages: [fixturePackage(ADDRESS, { tables: TABLES, path: '/nonexistent/checkout' })],
    })
    expect(result.problems).toEqual([])
    expect(result.sources.map((source) => [source.origin, source.version])).toEqual([
      ['installed', VERSION],
    ])
  })

  it('resolves the SAME bytes before and after an (un)matching install — preflight/copy parity', async () => {
    // `create --skip-install` preflights BEFORE the install and copies BEFORE it
    // too; a create that installs runs the copy after. The pair must agree. The
    // control that matters is a project install of ANOTHER version arriving in
    // between: it must not change which bytes are used.
    const { project } = await topology('1.0.4')
    const first = await resolveSetupSqlSources({
      projectPath: project,
      packageNames: [ADDRESS],
      versions: { [ADDRESS]: '1.0.4' },
      packages: [bundled('1.0.4')],
    })
    await install(join(project, 'node_modules'), '1.0.3', SQL_AT_103)
    const second = await resolveSetupSqlSources({
      projectPath: project,
      packageNames: [ADDRESS],
      versions: { [ADDRESS]: '1.0.4' },
      packages: [bundled('1.0.4')],
    })
    const tuple = (sources: { source: string; sql: string; version?: string }[]): unknown[][] =>
      sources.map((source) => [source.source, source.sql, source.version])
    expect(tuple(second.sources)).toEqual(tuple(first.sources))
    expect(first.sources.map((source) => source.origin)).toEqual(['installed'])
  })
})

describe('preflightSqlCompatibility', () => {
  it('returns null when the selection names no database', async () => {
    expect(
      await preflightSqlCompatibility({
        projectPath: '/nonexistent',
        packageNames: [COMMENT],
        packages: [
          fixturePackage(COMMENT, { tables: [{ name: 'comments', sqlFile: 'comments.sql' }] }),
        ],
      }),
    ).toBeNull()
  })

  it('accepts a selection whose SQL the provider applies or translates', async () => {
    const project = await projectWithSetupSql([
      { packageName: COMMENT, sqlFile: 'comments.sql', sql: SUPPORTED_SQL },
      { packageName: ADDRESS, sqlFile: 'addresses.sql', sql: PARTIAL_INDEX_SQL },
      { packageName: PAYMENT, sqlFile: 'payment_methods.sql', sql: UNIQUE_PARTIAL_INDEX_SQL },
    ])
    const report = await preflightSqlCompatibility({
      projectPath: project,
      packageNames: [DUCKDB, COMMENT, ADDRESS, PAYMENT],
      versions: versionsFor([DUCKDB, COMMENT, ADDRESS, PAYMENT]),
      packages: [
        fixturePackage(DUCKDB, { sqlCapabilities: DUCKDB_CAPABILITIES }),
        fixturePackage(COMMENT, {
          tables: [{ name: 'comments', sqlFile: 'src/__setup__/comments.sql' }],
        }),
        fixturePackage(ADDRESS, {
          tables: [{ name: 'addresses', sqlFile: 'src/__setup__/addresses.sql' }],
        }),
        fixturePackage(PAYMENT, {
          tables: [{ name: 'payment_methods', sqlFile: 'src/__setup__/payment_methods.sql' }],
        }),
      ],
    })
    // Both partial-index shapes are TRANSLATED by the DuckDB bond (the UNIQUE
    // one through CASE WHEN, so its uniqueness is preserved) — not refused.
    expect(report?.issues).toEqual([])
    expect(report?.missing).toEqual([])
    expect(new Set(report?.requirements.map((requirement) => requirement.feature))).toEqual(
      new Set(['partial-index', 'unique-partial-index']),
    )
  })

  it('refuses a referential action and carries the provider’s own note', async () => {
    const project = await projectWithSetupSql([
      { packageName: COMMENT, sqlFile: 'comments.sql', sql: FK_CASCADE_SQL },
    ])
    const report = await preflightSqlCompatibility({
      projectPath: project,
      packageNames: [DUCKDB, COMMENT],
      versions: versionsFor([DUCKDB, COMMENT]),
      packages: [
        fixturePackage(DUCKDB, {
          label: 'DuckDB',
          sqlCapabilities: {
            ...DUCKDB_CAPABILITIES,
            'fk-referential-action': {
              support: 'unsupported',
              note: 'DuckDB has no triggers, so a cascade cannot be reproduced.',
            },
          },
        }),
        fixturePackage(COMMENT, {
          tables: [{ name: 'comments', sqlFile: 'src/__setup__/comments.sql' }],
        }),
      ],
    })
    expect(report?.issues).toHaveLength(1)
    expect(report?.issues[0].kind).toBe('unsupported')
    expect(report?.issues[0].feature).toBe('fk-referential-action')
    expect(report?.issues[0].detail).toBe('ON DELETE CASCADE')
    expect(report?.issues[0].source).toBe(`${COMMENT}:src/__setup__/comments.sql`)
    expect(report?.issues[0].message).toContain('DuckDB cannot apply ON DELETE CASCADE')
    expect(report?.issues[0].message).toContain('no triggers')
  })

  it('fails closed when the provider declares no capability for a used feature', async () => {
    // A provider entry without `sqlCapabilities` (or missing one feature) is
    // missing metadata, never "nothing declared, so nothing to worry about".
    const project = await projectWithSetupSql([
      { packageName: COMMENT, sqlFile: 'comments.sql', sql: FK_CASCADE_SQL },
    ])
    const packages = [
      fixturePackage(DUCKDB, { label: 'DuckDB' }),
      fixturePackage(COMMENT, {
        tables: [{ name: 'comments', sqlFile: 'src/__setup__/comments.sql' }],
      }),
    ]
    const report = await preflightSqlCompatibility({
      projectPath: project,
      packageNames: [DUCKDB, COMMENT],
      versions: versionsFor([DUCKDB, COMMENT]),
      packages,
    })
    expect(report?.capabilities).toBeUndefined()
    expect(report?.issues.map((issue) => issue.kind)).toEqual(['missing-capability'])
  })

  it('reads the database from the manifest the caller supplies, not the injected package', async () => {
    // `mlcl inject -m <resource>` unions the project's dependencies in; the
    // database comes from the APP, so a Postgres app is judged as Postgres.
    const project = await projectWithSetupSql([
      { packageName: COMMENT, sqlFile: 'comments.sql', sql: FK_CASCADE_SQL },
    ])
    const packages = [
      fixturePackage(POSTGRES, { label: 'PostgreSQL', sqlCapabilities: POSTGRES_CAPABILITIES }),
      fixturePackage(COMMENT, {
        tables: [{ name: 'comments', sqlFile: 'src/__setup__/comments.sql' }],
      }),
    ]
    const report = await preflightSqlCompatibility({
      projectPath: project,
      packageNames: [POSTGRES, COMMENT],
      versions: versionsFor([POSTGRES, COMMENT]),
      packages,
    })
    expect(report?.database).toBe(POSTGRES)
    expect(report?.issues).toEqual([])
  })

  it('judges the SQL on disk when no package set is named (inject/swap)', async () => {
    // `inject`/`swap` must NOT re-derive a set from manifest keys: a transitive
    // peer's SQL may never have been copied, and judging it refuses SQL nothing
    // replays. The runner replays `__setup__/` and `migrations/`.
    const project = await projectWithSetupSql([])
    await mkdir(join(project, '__setup__'), { recursive: true })
    await writeFile(join(project, '__setup__', 'posts.sql'), FK_CASCADE_SQL)
    const packages = [
      fixturePackage(DUCKDB, { label: 'DuckDB', sqlCapabilities: DUCKDB_CAPABILITIES }),
      // Present in the manifest, but no SQL of its own is copied or replayed.
      fixturePackage('@molecule/api-workflow-database', {
        tables: [{ name: 'workflow', sqlFile: 'src/__setup__/workflow.sql' }],
      }),
    ]
    const report = await preflightSqlCompatibility({
      projectPath: project,
      sqlDirs: [join(project, '__setup__'), join(project, 'migrations')],
      database: DUCKDB,
      packages,
    })
    expect(report?.issues.map((issue) => issue.source)).toEqual([
      join(project, '__setup__', 'posts.sql'),
    ])
    expect(report?.issues[0].feature).toBe('fk-referential-action')
    expect(report?.sources).toHaveLength(1)
  })
})

describe('assertDdlCompatibility', () => {
  it('throws one actionable refusal naming the provider, package, file and construct', async () => {
    const project = await projectWithSetupSql([
      { packageName: COMMENT, sqlFile: 'comments.sql', sql: FK_CASCADE_SQL },
      { packageName: ADDRESS, sqlFile: 'missing.sql', sql: SUPPORTED_SQL },
    ])
    const packages = [
      fixturePackage(DUCKDB, { label: 'DuckDB', sqlCapabilities: DUCKDB_CAPABILITIES }),
      fixturePackage(COMMENT, {
        tables: [{ name: 'comments', sqlFile: 'src/__setup__/comments.sql' }],
      }),
      fixturePackage(ADDRESS, {
        tables: [{ name: 'addresses', sqlFile: 'src/__setup__/addresses.sql' }],
      }),
    ]
    const thrown = await assertDdlCompatibility({
      projectPath: project,
      packageNames: [DUCKDB, COMMENT, ADDRESS],
      versions: versionsFor([DUCKDB, COMMENT, ADDRESS]),
      packages,
    }).then(
      () => null,
      (error: unknown) => error,
    )
    expect(thrown).toBeInstanceOf(DatabaseDdlCompatibilityError)
    const error = thrown as DatabaseDdlCompatibilityError
    expect(error.code).toBe('unsupported-ddl')
    expect(error.report.database).toBe(DUCKDB)
    expect(error.message).toContain(
      "DuckDB (@molecule/api-database-duckdb) cannot run this project's database setup:",
    )
    expect(error.message).toContain(`${COMMENT}:src/__setup__/comments.sql`)
    expect(error.message).toContain('ON DELETE CASCADE')
    // The unreadable file is reported in the same refusal.
    expect(error.message).toContain(`${ADDRESS}:src/__setup__/addresses.sql`)
    expect(error.message).toMatch(/Cannot read/)
    expect(error.message).toMatch(/Choose a database provider that supports these packages/)
  })

  it('passes a combination the provider declares', async () => {
    const project = await projectWithSetupSql([
      { packageName: COMMENT, sqlFile: 'comments.sql', sql: FK_CASCADE_SQL },
    ])
    await expect(
      assertDdlCompatibility({
        projectPath: project,
        packageNames: [POSTGRES, COMMENT],
        versions: versionsFor([POSTGRES, COMMENT]),
        packages: [
          fixturePackage(POSTGRES, { sqlCapabilities: POSTGRES_CAPABILITIES }),
          fixturePackage(COMMENT, {
            tables: [{ name: 'comments', sqlFile: 'src/__setup__/comments.sql' }],
          }),
        ],
      }),
    ).resolves.toBeUndefined()
  })

  it('is decided by the declaration, not by the provider name', async () => {
    // Same SQL, same database package, different declaration: a bond that gains
    // faithful support stops being refused — the contract is load-bearing.
    const project = await projectWithSetupSql([
      { packageName: COMMENT, sqlFile: 'comments.sql', sql: FK_CASCADE_SQL },
    ])
    await expect(
      assertDdlCompatibility({
        projectPath: project,
        packageNames: [DUCKDB, COMMENT],
        versions: versionsFor([DUCKDB, COMMENT]),
        packages: [
          fixturePackage(DUCKDB, { sqlCapabilities: POSTGRES_CAPABILITIES }),
          fixturePackage(COMMENT, {
            tables: [{ name: 'comments', sqlFile: 'src/__setup__/comments.sql' }],
          }),
        ],
      }),
    ).resolves.toBeUndefined()
  })

  it('refuses a selection whose SQL is neither installed, on disk, nor bundled', async () => {
    // There is genuinely no input to judge or copy (a registry entry that never
    // went through `sync-registry --scan-tables`, on a host with no copy). The
    // refusal happens before any write; there is no "cannot tell yet" mode.
    const packages = [
      fixturePackage(DUCKDB, { sqlCapabilities: DUCKDB_CAPABILITIES }),
      fixturePackage(COMMENT, {
        tables: [{ name: 'comments', sqlFile: 'src/__setup__/comments.sql' }],
        path: '/nonexistent/molecule/checkout',
      }),
    ]
    const thrown = await assertDdlCompatibility({
      projectPath: '/nonexistent-project',
      packageNames: [DUCKDB, COMMENT],
      versions: versionsFor([DUCKDB, COMMENT]),
      packages,
    }).then(
      () => null,
      (error: unknown) => error,
    )
    expect(thrown).toBeInstanceOf(DatabaseDdlCompatibilityError)
    expect((thrown as Error).message).toMatch(/bundles no setup SQL/)
  })

  it('judges a package that is not installed from the registry’s bundled SQL', async () => {
    // `mlcl add --inject` runs before the install that would make the package
    // readable. The registry carries the package's exact published SQL, so the
    // verdict is available BEFORE the pin is written — no deferred verdict.
    const options = {
      projectPath: '/nonexistent-project',
      packageNames: [DUCKDB, COMMENT],
      versions: versionsFor([DUCKDB, COMMENT]),
      packages: [
        fixturePackage(DUCKDB, { label: 'DuckDB', sqlCapabilities: DUCKDB_CAPABILITIES }),
        fixturePackage(COMMENT, {
          tables: [{ name: 'comments', sqlFile: 'src/__setup__/comments.sql' }],
          path: '/nonexistent/molecule/checkout',
          setupSql: { 'src/__setup__/comments.sql': FK_CASCADE_SQL },
          setupSqlVersion: VERSION,
        }),
      ],
    }
    const report = await preflightSqlCompatibility(options)
    expect(report?.sources.map((source) => source.origin)).toEqual(['bundled'])
    expect(report?.issues.map((issue) => issue.detail)).toEqual(['ON DELETE CASCADE'])
    await expect(assertDdlCompatibility(options)).rejects.toBeInstanceOf(
      DatabaseDdlCompatibilityError,
    )
  })
})

describe('classifies the whole registry setup library', () => {
  it('refuses exactly the packages whose SQL needs a referential action on DuckDB', async () => {
    const registry = loadRegistry()
    const withTables = registry.filter((pkg) => pkg.tables.length > 0)
    // Standalone mlcl checkout (no molecule sibling): the SQL is not on disk to
    // read, and the workspace CI run covers this. Same policy as toolchain.test.
    if (!withTables.every((pkg) => existsSync(pkg.path))) return

    const duckdb = fixturePackage(DUCKDB, { label: 'DuckDB', sqlCapabilities: DUCKDB_CAPABILITIES })
    const packages = [...registry.filter((pkg) => pkg.name !== DUCKDB), duckdb]
    const report = await preflightSqlCompatibility({
      projectPath: '/nonexistent-install-tree',
      packageNames: [...withTables.map((pkg) => pkg.name), DUCKDB],
      versions: Object.fromEntries(
        withTables.map((pkg) => [pkg.name, getMoleculeVersion(pkg.name)]),
      ),
      packages,
    })
    const refusedFiles = [
      ...new Set(
        (report?.issues ?? []).map(
          (issue) =>
            `${issue.source?.split(':')[0]}/${basename(issue.source?.split(':')[1] ?? '')}`,
        ),
      ),
    ].sort()
    const refusedPackages = [
      ...new Set((report?.issues ?? []).map((issue) => issue.source?.split(':')[0] ?? '')),
    ].sort()

    // 21 packages, 26 files — the FK-bearing subset. The partial-index-only
    // packages (`api-resource-address`, `api-resource-payment-method`) and
    // `api-leaderboard` are NOT here: the DuckDB bond translates those indexes.
    // Re-run scripts/candidates/duckdb-resource-contract/evidence/classify.json
    // before changing this list.
    expect(refusedPackages).toEqual([
      '@molecule/api-realtime-rooms',
      '@molecule/api-resource-ai-conversation',
      '@molecule/api-resource-article',
      '@molecule/api-resource-cart',
      '@molecule/api-resource-comment',
      '@molecule/api-resource-course',
      '@molecule/api-resource-feature-flag',
      '@molecule/api-resource-forum-thread',
      '@molecule/api-resource-medication',
      '@molecule/api-resource-meeting',
      '@molecule/api-resource-message',
      '@molecule/api-resource-order',
      '@molecule/api-resource-product',
      '@molecule/api-resource-project',
      '@molecule/api-resource-property',
      '@molecule/api-resource-review',
      '@molecule/api-resource-status-page',
      '@molecule/api-resource-tag',
      '@molecule/api-resource-thread',
      '@molecule/api-resource-wiki-page',
      '@molecule/api-workflow-database',
    ])
    expect(refusedFiles).toEqual([
      '@molecule/api-realtime-rooms/realtime_rooms.sql',
      '@molecule/api-resource-ai-conversation/conversations.sql',
      '@molecule/api-resource-article/articles.sql',
      '@molecule/api-resource-article/articles_position.sql',
      '@molecule/api-resource-cart/carts.sql',
      '@molecule/api-resource-comment/comment_numbers.sql',
      '@molecule/api-resource-comment/comments.sql',
      '@molecule/api-resource-course/courses.sql',
      '@molecule/api-resource-feature-flag/feature_flags.sql',
      '@molecule/api-resource-forum-thread/forum_threads.sql',
      '@molecule/api-resource-medication/medications.sql',
      '@molecule/api-resource-meeting/meetings.sql',
      '@molecule/api-resource-message/messages.sql',
      '@molecule/api-resource-order/orders.sql',
      '@molecule/api-resource-order/orders_position.sql',
      '@molecule/api-resource-product/products.sql',
      '@molecule/api-resource-project/projects.sql',
      '@molecule/api-resource-property/properties.sql',
      '@molecule/api-resource-review/reviews.sql',
      '@molecule/api-resource-status-page/checks.sql',
      '@molecule/api-resource-status-page/incidents.sql',
      '@molecule/api-resource-status-page/uptimeWindows.sql',
      '@molecule/api-resource-tag/tags.sql',
      '@molecule/api-resource-thread/threads.sql',
      '@molecule/api-resource-wiki-page/wiki_pages.sql',
      '@molecule/api-workflow-database/workflow.sql',
    ])
    // And every refusal is the semantic one, not a missing declaration: the
    // fixture supplies the same capability map the registry will carry.
    expect(new Set((report?.issues ?? []).map((issue) => issue.kind))).toEqual(
      new Set(['unsupported']),
    )
  })

  it('accepts the partial-index-only packages the DuckDB bond translates', async () => {
    const registry = loadRegistry()
    const partialOnly = ['@molecule/api-resource-address', '@molecule/api-resource-payment-method']
    const packages = registry.filter((pkg) => partialOnly.includes(pkg.name))
    if (!packages.every((pkg) => existsSync(pkg.path))) return
    const duckdb = fixturePackage(DUCKDB, { label: 'DuckDB', sqlCapabilities: DUCKDB_CAPABILITIES })
    const report = await preflightSqlCompatibility({
      projectPath: '/nonexistent-install-tree',
      packageNames: [...partialOnly, DUCKDB],
      versions: Object.fromEntries(partialOnly.map((name) => [name, getMoleculeVersion(name)])),
      packages: [...registry.filter((pkg) => pkg.name !== DUCKDB), duckdb],
    })
    expect(report?.issues).toEqual([])
    expect(report?.missing).toEqual([])
  })

  it('refuses the same selections on MotherDuck, which runs the same engine', async () => {
    const registry = loadRegistry()
    const comment = registry.find((pkg) => pkg.name === COMMENT)
    if (!comment || !existsSync(comment.path)) return
    const motherduck = fixturePackage(MOTHERDUCK, {
      label: 'MotherDuck',
      sqlCapabilities: DUCKDB_CAPABILITIES,
    })
    const report = await preflightSqlCompatibility({
      projectPath: '/nonexistent-install-tree',
      packageNames: [COMMENT, MOTHERDUCK],
      versions: { [COMMENT]: getMoleculeVersion(COMMENT) },
      packages: [comment, motherduck],
    })
    expect(report?.issues.map((issue) => issue.source)).toEqual([
      `${COMMENT}:src/__setup__/comment_numbers.sql`,
      `${COMMENT}:src/__setup__/comments.sql`,
    ])
  })
})
