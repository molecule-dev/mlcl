/**
 * The injector's migration writer is bound to the exact version the project
 * pins.
 *
 * `__setup__/` and the preflight both resolve bytes through the version-bound
 * setup-SQL resolver. The migration planner was the third writer and took the
 * NEAREST walk-up copy whatever its version, so a `--skip-install` scaffold
 * beside an older fleet install wrote that release's migrations — replayed
 * BEFORE `__setup__/`, where an old `CREATE TABLE IF NOT EXISTS` turned the
 * pinned release's own setup SQL into a no-op (r7 acceptance review, N1).
 *
 * Refusing the stale copy is not enough: a `--skip-install` scaffold has no
 * copy of the pinned release on disk at all, and the pinned SQL is exactly what
 * the registry bundles for it. The planner therefore reads its bytes from
 * `resolveSetupSqlSources` at the intended pin — a copy that declares it, else
 * the bundle tagged with it — and only the package METADATA may come from
 * another release's copy, with the pin kept at the intended version.
 *
 * @module
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { planInjection } from '../injector.js'
import type { InferredPackage } from '../schema.js'

const PKG = '@molecule/api-resource-versioned-fixture'
const SQL_FILE = 'src/__setup__/addresses.sql'
const PINNED = '1.0.4'
const LEGACY = '-- LEGACY 1.0.0 schema\nCREATE TABLE addresses_legacy ("id" UUID PRIMARY KEY);\n'
const PINNED_SQL = 'CREATE TABLE IF NOT EXISTS "addresses" (\n  "id" UUID PRIMARY KEY\n);\n'

/**
 * A registry entry for the fixture package, in the shape `loadRegistry`
 * produces: `molecule` is the raw entry and the bundle + its version ride on it.
 *
 * @param bundle - `setupSql` bytes keyed by package-relative file, or null.
 * @param bundleVersion - The version those bytes belong to, or null.
 * @returns The entry `planInjection` resolves against.
 */
function fixtureRegistry(
  bundle: Record<string, string> | null,
  bundleVersion: string | null,
): InferredPackage[] {
  const tables = [{ name: 'addresses', sqlFile: SQL_FILE }]
  return [
    {
      name: PKG,
      version: '0.0.0',
      description: 'versioned fixture',
      dependencies: {},
      peerDependencies: {},
      type: 'resource',
      routes: [],
      tables,
      exports: [],
      molecule: {
        type: 'resource',
        category: 'test',
        label: 'Versioned fixture',
        tables,
        ...(bundle && bundleVersion ? { setupSql: bundle, setupSqlVersion: bundleVersion } : {}),
      } as unknown as InferredPackage['molecule'],
      // No molecule source tree in the fixture: the bundle is the only copy of
      // the pinned release.
      path: join(tmpdir(), 'mlcl-injector-versioned-fixture-absent'),
    },
  ]
}

/**
 * Write a package root whose own package.json declares `version`. With `sql`
 * it declares a table from `SQL_FILE`; without, it contributes no SQL at all.
 *
 * @param root - The package directory to create.
 * @param version - The version its manifest declares.
 * @param sql - The bytes of its declared setup file, or null for no SQL.
 */
function writePackage(root: string, version: string, sql: string | null): void {
  mkdirSync(join(root, 'src'), { recursive: true })
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      name: PKG,
      version,
      molecule: {
        type: sql === null ? 'utility' : 'resource',
        category: 'test',
        label: 'Versioned fixture',
        ...(sql === null ? {} : { tables: [{ name: 'addresses', sqlFile: SQL_FILE }] }),
      },
    }),
  )
  if (sql !== null) {
    mkdirSync(join(root, 'src', '__setup__'), { recursive: true })
    writeFileSync(join(root, SQL_FILE), sql)
  }
}

/**
 * Write a project manifest that pins `PKG` at `version`.
 *
 * @param dir - The project directory.
 * @param version - The dependency pin to declare.
 */
function writeProject(dir: string, version: string): void {
  mkdirSync(join(dir, 'src'), { recursive: true })
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'demo-api', version: '1.0.0', dependencies: { [PKG]: version } }),
  )
}

describe('the injector writes the pinned release SQL', () => {
  let base: string
  let project: string

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'mlcl-injector-versioned-'))
    project = join(base, 'proj')
    writeProject(project, PINNED)
  })

  afterEach(() => {
    rmSync(base, { recursive: true, force: true })
  })

  it('plans the pinned release from the registry bundle when only another version is installed', async () => {
    writePackage(join(base, 'node_modules', PKG), '1.0.0', LEGACY)

    const plan = await planInjection(PKG, project, undefined, {
      versions: { [PKG]: PINNED },
      packages: fixtureRegistry({ [SQL_FILE]: PINNED_SQL }, PINNED),
    })

    expect(plan.conflicts).toEqual([])
    expect(plan.migrationFailures ?? []).toEqual([])
    expect(plan.migrations).toHaveLength(1)
    expect(plan.migrations[0]?.content).toContain('CREATE TABLE IF NOT EXISTS "addresses"')
    expect(plan.migrations[0]?.content).not.toContain('addresses_legacy')
    // The stale copy's version never replaces the requested pin.
    expect(plan.dependencies).toEqual([{ name: PKG, version: PINNED, type: 'dependency' }])
  })

  it('refuses to write a migration when no copy or bundle is the pinned version', async () => {
    writePackage(join(base, 'node_modules', PKG), '1.0.0', LEGACY)

    const plan = await planInjection(PKG, project, undefined, {
      versions: { [PKG]: PINNED },
      packages: fixtureRegistry({ [SQL_FILE]: LEGACY }, '1.0.3'),
    })

    expect(plan.migrations).toEqual([])
    const failures = (plan.migrationFailures ?? []).join('\n')
    expect(failures).toContain('1.0.4')
    expect(failures).toContain('1.0.3')
  })

  it('uses a matching copy further up instead of the wrong one nearest the project', async () => {
    const marker = '\n-- MATCHING 1.0.4 COPY\n'
    writePackage(join(base, 'node_modules', PKG), PINNED, `${PINNED_SQL}${marker}`)
    writePackage(join(project, 'node_modules', PKG), '1.0.0', LEGACY)

    const plan = await planInjection(PKG, project, undefined, {
      versions: { [PKG]: PINNED },
      packages: fixtureRegistry({ [SQL_FILE]: PINNED_SQL }, PINNED),
    })

    expect(plan.conflicts).toEqual([])
    expect(plan.dependencies.map((dependency) => dependency.version)).toEqual([PINNED])
    expect(plan.migrations).toHaveLength(1)
    // The copy on disk at the pin, not the bundle (no marker) and not the stale copy.
    expect(plan.migrations[0]?.content).toContain('MATCHING 1.0.4 COPY')
    expect(plan.migrations[0]?.content).not.toContain('addresses_legacy')
  })

  it('plans from a matching copy when the pin is the copy on disk', async () => {
    writePackage(join(base, 'node_modules', PKG), PINNED, PINNED_SQL)

    const plan = await planInjection(PKG, project, undefined, {
      versions: { [PKG]: PINNED },
      packages: fixtureRegistry({ [SQL_FILE]: PINNED_SQL }, PINNED),
    })

    expect(plan.migrations).toHaveLength(1)
    expect(plan.migrations[0]?.content).toContain('CREATE TABLE IF NOT EXISTS "addresses"')
  })

  it('binds a RANGE to the copy it selects instead of refusing every range (R11-6)', async () => {
    writePackage(join(base, 'node_modules', PKG), '1.0.0', LEGACY)

    const plan = await planInjection(PKG, project, undefined, { versions: { [PKG]: '^1.0.0' } })

    // A satisfied range is not "unknown": the 1.0.0 copy is the version the app
    // runs, so its schema is the right one (r10 review, K10).
    expect(plan.conflicts).toEqual([])
    expect(plan.migrations).toHaveLength(1)
    expect(plan.migrations[0]?.content).toContain('addresses_legacy')
  })

  it('refuses a range that nothing on disk satisfies, naming what was found (R11-6)', async () => {
    writePackage(join(base, 'node_modules', PKG), '1.0.0', LEGACY)

    const plan = await planInjection(PKG, project, undefined, {
      versions: { [PKG]: '^2.0.0' },
      packages: fixtureRegistry({ [SQL_FILE]: LEGACY }, '1.0.0'),
    })

    expect(plan.moleculePackage).toBeNull()
    expect(plan.migrations).toEqual([])
    const message = plan.conflicts[0]?.message ?? ''
    expect(message).toContain('version range that nothing available satisfies')
    expect(message).toContain('installed: 1.0.0')
  })

  it('writes NO migration for a non-registry package whose only copy is another release (R11-5)', async () => {
    // The pinned version is 1.0.4, the copy on disk is 1.0.0, and there is no
    // registry entry to bundle the pinned release's bytes. Reading the copy
    // anyway wrote 1.0.0's schema beside 1.0.4's code — and re-running after
    // installing 1.0.4 did not repair it, because the migration already existed.
    writePackage(join(base, 'node_modules', PKG), '1.0.0', LEGACY)

    const plan = await planInjection(PKG, project, undefined, {
      versions: { [PKG]: PINNED },
      packages: [],
    })

    expect(plan.migrations).toEqual([])
    const failures = (plan.migrationFailures ?? []).join('\n')
    expect(failures).toContain(PINNED)
    expect(failures).toContain('1.0.0')
    expect(failures).toContain(PKG)
  })

  it('writes the migration from a non-registry package when the copy IS the pinned release', async () => {
    writePackage(join(base, 'node_modules', PKG), PINNED, PINNED_SQL)

    const plan = await planInjection(PKG, project, undefined, {
      versions: { [PKG]: PINNED },
      packages: [],
    })

    expect(plan.migrationFailures ?? []).toEqual([])
    expect(plan.migrations).toHaveLength(1)
    expect(plan.migrations[0]?.content).toContain('CREATE TABLE IF NOT EXISTS "addresses"')
  })

  it('keeps the nearest copy when nothing is pinned (existing behaviour)', async () => {
    writePackage(join(base, 'node_modules', PKG), '1.0.0', LEGACY)

    const plan = await planInjection(PKG, project)

    expect(plan.migrations).toHaveLength(1)
    expect(plan.migrations[0]?.content).toContain('addresses_legacy')
  })

  it('reads a package that contributes no SQL at another version, but keeps the intended pin', async () => {
    writePackage(join(base, 'node_modules', PKG), '1.0.0', null)

    const plan = await planInjection(PKG, project, undefined, {
      versions: { [PKG]: PINNED },
      packages: [
        {
          name: PKG,
          version: '0.0.0',
          description: 'versioned fixture',
          dependencies: {},
          peerDependencies: {},
          type: 'utility',
          routes: [],
          tables: [],
          exports: [],
          molecule: {
            type: 'utility',
            category: 'test',
            label: 'Versioned fixture',
          } as unknown as InferredPackage['molecule'],
          path: join(tmpdir(), 'mlcl-injector-versioned-fixture-absent'),
        },
      ],
    })

    expect(plan.conflicts).toEqual([])
    expect(plan.migrations).toEqual([])
    expect(plan.dependencies).toEqual([{ name: PKG, version: PINNED, type: 'dependency' }])
  })

  it('preserves an explicit local file: dependency', async () => {
    const local = writeLocalPackage()
    writeProject(project, `file:${local}`)

    const plan = await planInjection(PKG, project)
    expect(plan.conflicts).toEqual([])
    expect(plan.migrations).toHaveLength(1)
    expect(plan.migrations[0]?.content).toContain('CREATE TABLE IF NOT EXISTS "addresses"')
  })

  /**
   * A local package next to the project, the way a monorepo/file: dependency
   * points at one.
   *
   * @returns Its directory.
   */
  function writeLocalPackage(): string {
    const local = join(base, 'local-package')
    writePackage(local, '2.0.0', PINNED_SQL)
    return local
  }
})

const ORDER_PKG = '@molecule/api-resource-order-fixture'
const ORDER_FILES = {
  numbers: 'src/__setup__/comment_numbers.sql',
  comments: 'src/__setup__/comments.sql',
} as const
const ORDER_PINNED = '1.2.2'
const ORDER_BUNDLE = {
  [ORDER_FILES.comments]: 'CREATE TABLE IF NOT EXISTS "comments" (\n  "id" UUID PRIMARY KEY\n);\n',
  [ORDER_FILES.numbers]:
    'CREATE TABLE IF NOT EXISTS "comment_numbers" (\n  "commentId" UUID NOT NULL UNIQUE REFERENCES "comments"("id") ON DELETE CASCADE\n);\n',
}

/**
 * A registry entry whose `tables` metadata names BOTH files — what the registry
 * says the PINNED release ships.
 *
 * @returns The entry `planInjection` resolves against.
 */
function orderRegistry(): InferredPackage[] {
  const tables = [
    { name: 'comment_numbers', sqlFile: ORDER_FILES.numbers },
    { name: 'comments', sqlFile: ORDER_FILES.comments },
  ]
  return [
    {
      name: ORDER_PKG,
      version: '0.0.0',
      description: 'order fixture',
      dependencies: {},
      peerDependencies: {},
      type: 'resource',
      routes: [],
      tables,
      exports: [],
      molecule: {
        type: 'resource',
        category: 'test',
        label: 'Order fixture',
        tables,
        setupSql: ORDER_BUNDLE,
        setupSqlVersion: ORDER_PINNED,
      } as unknown as InferredPackage['molecule'],
      path: join(tmpdir(), 'mlcl-injector-order-fixture-absent'),
    },
  ]
}

describe('the migration ORDER comes from the bytes the writer will write', () => {
  let base: string
  let project: string

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'mlcl-injector-order-'))
    project = join(base, 'proj')
    mkdirSync(join(project, 'src'), { recursive: true })
    writeFileSync(
      join(project, 'package.json'),
      JSON.stringify({
        name: 'demo-api',
        version: '1.0.0',
        dependencies: { [ORDER_PKG]: ORDER_PINNED },
      }),
    )
  })

  afterEach(() => {
    rmSync(base, { recursive: true, force: true })
  })

  /**
   * Write a copy of the fixture package at `version` that declares both tables
   * but ships only the files the caller lists — a stale ancestor, exactly the
   * shape where the metadata and the copy on disk disagree (r10 review, F1).
   *
   * @param version - The version its manifest declares.
   * @param files - The `src/__setup__/*.sql` bytes it actually ships.
   * @param extra - Extra manifest fields (dependencies, peerDependencies).
   */
  function writeStaleCopy(
    version: string,
    files: Record<string, string>,
    extra: Record<string, unknown> = {},
  ): string {
    const root = join(base, 'node_modules', ORDER_PKG)
    mkdirSync(join(root, 'src', '__setup__'), { recursive: true })
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({
        name: ORDER_PKG,
        version,
        molecule: {
          type: 'resource',
          category: 'test',
          label: 'Order fixture',
          tables: [
            { name: 'comment_numbers', sqlFile: ORDER_FILES.numbers },
            { name: 'comments', sqlFile: ORDER_FILES.comments },
          ],
        },
        ...extra,
      }),
    )
    for (const [rel, body] of Object.entries(files)) {
      mkdirSync(join(root, rel, '..'), { recursive: true })
      writeFileSync(join(root, rel), body)
    }
    return root
  }

  it('emits the referencing file AFTER the table it references under a stale ancestor (F1)', async () => {
    // The ancestor predates `comment_numbers.sql` — it ships `comments.sql` only.
    writeStaleCopy('1.0.5', {
      [ORDER_FILES.comments]:
        '-- LEGACY 1.0.5\nCREATE TABLE IF NOT EXISTS "comments" ("id" UUID);\n',
    })

    const plan = await planInjection(ORDER_PKG, project, undefined, {
      versions: { [ORDER_PKG]: ORDER_PINNED },
      packages: orderRegistry(),
    })

    expect(plan.migrationFailures ?? []).toEqual([])
    expect(plan.migrations.map((migration) => migration.tableName)).toEqual([
      'comments',
      'comment_numbers',
    ])
    // Both files are the PINNED release's bytes, not the stale copy's.
    expect(plan.migrations[0]?.content).toContain(
      'CREATE TABLE IF NOT EXISTS "comments" (\n  "id" UUID PRIMARY KEY\n);',
    )
    expect(plan.migrations[1]?.content).toContain('REFERENCES "comments"("id")')
    expect(plan.migrations.map((migration) => migration.content).join('\n')).not.toContain('LEGACY')
  })

  it('still orders correctly from a matching ancestor (control)', async () => {
    writeStaleCopy(ORDER_PINNED, ORDER_BUNDLE)

    const plan = await planInjection(ORDER_PKG, project, undefined, {
      versions: { [ORDER_PKG]: ORDER_PINNED },
      packages: orderRegistry(),
    })

    expect(plan.migrations.map((migration) => migration.tableName)).toEqual([
      'comments',
      'comment_numbers',
    ])
  })

  it('reads the disk copy when nothing is pinned (existing behaviour)', async () => {
    writeStaleCopy('1.0.5', {
      [ORDER_FILES.comments]: 'CREATE TABLE IF NOT EXISTS "comments" ("id" UUID);\n',
    })

    const plan = await planInjection(ORDER_PKG, project)

    // Metadata order, and only the file the copy ships — the un-versioned path
    // is unchanged.
    expect(plan.migrations.map((migration) => migration.tableName)).toEqual(['comments'])
  })
})

const SKEW_PKG = '@molecule/api-resource-skew-fixture'
const SKEW_PINNED = '2.0.0'
const STALE_DEP = 'left-pad'
const STALE_PEER = 'probe-peer-lib'
const CORE_PEER = '@molecule/api-database'

/**
 * A registry entry for the skew fixture, optionally carrying the registry's
 * molecule-peer list at the pin.
 *
 * @param moleculePeers - The `@molecule/*` peers the registry records.
 * @returns The entry `planInjection` resolves against.
 */
function skewRegistry(moleculePeers: string[] = []): InferredPackage[] {
  const tables = [{ name: 'things', sqlFile: SQL_FILE }]
  return [
    {
      name: SKEW_PKG,
      version: '0.0.0',
      description: 'skew fixture',
      dependencies: {},
      peerDependencies: {},
      type: 'resource',
      routes: [],
      tables,
      exports: [],
      molecule: {
        type: 'resource',
        category: 'test',
        label: 'Skew fixture',
        tables,
        moleculePeers,
        setupSql: { [SQL_FILE]: PINNED_SQL },
        setupSqlVersion: SKEW_PINNED,
      } as unknown as InferredPackage['molecule'],
      path: join(tmpdir(), 'mlcl-injector-skew-fixture-absent'),
    },
  ]
}

describe('version-skewed dependency metadata is never written', () => {
  let base: string
  let project: string

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'mlcl-injector-skew-'))
    project = join(base, 'proj')
    mkdirSync(join(project, 'src'), { recursive: true })
    writeFileSync(
      join(project, 'package.json'),
      JSON.stringify({
        name: 'demo-api',
        version: '1.0.0',
        dependencies: { [SKEW_PKG]: SKEW_PINNED },
      }),
    )
  })

  afterEach(() => {
    rmSync(base, { recursive: true, force: true })
  })

  /**
   * Write a copy of the skew fixture at `version`.
   *
   * @param version - The version its manifest declares.
   * @param extra - Extra manifest fields (dependencies, peerDependencies).
   */
  function writeCopy(version: string, extra: Record<string, unknown> = {}): void {
    const root = join(base, 'node_modules', SKEW_PKG)
    mkdirSync(join(root, 'src', '__setup__'), { recursive: true })
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({
        name: SKEW_PKG,
        version,
        molecule: {
          type: 'resource',
          category: 'test',
          label: 'Skew fixture',
          tables: [{ name: 'things', sqlFile: SQL_FILE }],
        },
        ...extra,
      }),
    )
    writeFileSync(join(root, SQL_FILE), '-- LEGACY\nCREATE TABLE things_legacy ("id" UUID);\n')
  }

  it('writes only the main pin for a stale copy — no third-party dep or peer (F11)', async () => {
    writeCopy('1.0.0', {
      dependencies: { [STALE_DEP]: '1.0.0' },
      peerDependencies: { [STALE_PEER]: '^0.1.0' },
    })

    const plan = await planInjection(SKEW_PKG, project, undefined, {
      versions: { [SKEW_PKG]: SKEW_PINNED },
      packages: skewRegistry(),
    })

    expect(plan.dependencies).toEqual([
      { name: SKEW_PKG, version: SKEW_PINNED, type: 'dependency' },
    ])
    expect(plan.warnings?.join('\n')).toContain('pinned at 2.0.0')
    expect(plan.warnings?.join('\n')).toContain('1.0.0')
    expect(plan.warnings?.join('\n')).toContain('npm install')
  })

  it('keeps the core/bond peers the registry records at the pin (F11)', async () => {
    writeCopy('1.0.0', {
      dependencies: { [STALE_DEP]: '1.0.0' },
      peerDependencies: { [STALE_PEER]: '^0.1.0' },
    })

    const plan = await planInjection(SKEW_PKG, project, undefined, {
      versions: { [SKEW_PKG]: SKEW_PINNED },
      packages: skewRegistry([CORE_PEER]),
    })

    const peers = plan.dependencies.filter((dependency) => dependency.type === 'peerDependency')
    expect(peers.map((peer) => peer.name)).toEqual([CORE_PEER])
    expect(plan.dependencies.some((dependency) => dependency.name === STALE_DEP)).toBe(false)
    expect(plan.dependencies.some((dependency) => dependency.name === STALE_PEER)).toBe(false)
  })

  it('keeps the copy’s own dependencies and peers when it IS the pinned version (control)', async () => {
    writeCopy(SKEW_PINNED, {
      dependencies: { [STALE_DEP]: '2.0.0' },
      peerDependencies: { [STALE_PEER]: '^0.2.0' },
    })

    const plan = await planInjection(SKEW_PKG, project, undefined, {
      versions: { [SKEW_PKG]: SKEW_PINNED },
      packages: skewRegistry([CORE_PEER]),
    })

    expect(plan.dependencies).toEqual(
      expect.arrayContaining([
        { name: SKEW_PKG, version: SKEW_PINNED, type: 'dependency' },
        { name: STALE_DEP, version: '2.0.0', type: 'dependency' },
        { name: STALE_PEER, version: '^0.2.0', type: 'peerDependency' },
      ]),
    )
    expect(plan.warnings ?? []).toEqual([])
  })

  it('leaves an un-pinned (file:/range) project alone (control)', async () => {
    writeCopy('1.0.0', {
      dependencies: { [STALE_DEP]: '1.0.0' },
      peerDependencies: { [STALE_PEER]: '^0.1.0' },
    })

    const plan = await planInjection(SKEW_PKG, project)

    expect(plan.dependencies).toEqual(
      expect.arrayContaining([
        { name: SKEW_PKG, version: '1.0.0', type: 'dependency' },
        { name: STALE_DEP, version: '1.0.0', type: 'dependency' },
        { name: STALE_PEER, version: '^0.1.0', type: 'peerDependency' },
      ]),
    )
    expect(plan.warnings ?? []).toEqual([])
  })
})
