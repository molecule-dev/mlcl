/**
 * One migration per table across a whole inject run.
 *
 * Every plan is built before any of them is executed, so the planner's duplicate
 * check — which reads the target project's `migrations/` DIRECTORY — sees an empty
 * folder for all of them. Two packages that ship the same table therefore each
 * passed it and each planned a file: X0 flash-m93 (2026-10-16) scaffolded twelve
 * migrations for a Conduit app, of which `follows` and `reactions` were declared
 * twice, byte-identical each time (`@molecule/api-resource-dedupe-alpha` ships the DDL
 * its own queries read beside `-follow` and `-reaction`, which own those tables).
 * The reviewer's model saw the pairs, ran `rm -f` on BOTH `follows` files, and the
 * app was left with no `follows` table at all.
 *
 * `dedupePlannedMigrations` drops the second file for a table — as a `skip`
 * conflict when the two texts agree, as a FAILED injection (`migrationFailures`)
 * when two packages disagree about one table's shape.
 *
 * @module
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { dedupePlannedMigrations, planInjection } from '../injector.js'

const FOLLOWS_SQL = `CREATE TABLE IF NOT EXISTS "follows" (
  "id" uuid PRIMARY KEY,
  "followerId" uuid NOT NULL,
  "followingId" uuid NOT NULL
);
`

/** A resource package in the temp project's node_modules, declaring one table. */
function writePackage(dir: string, name: string, table: string, sql: string): void {
  const pkgDir = join(dir, 'node_modules', ...name.split('/'))
  mkdirSync(join(pkgDir, 'src', '__setup__'), { recursive: true })
  writeFileSync(
    join(pkgDir, 'package.json'),
    JSON.stringify({
      name,
      version: '1.0.0',
      molecule: {
        type: 'resource',
        category: 'test',
        label: name,
        tables: [{ name: table, sqlFile: `src/__setup__/${table}.sql` }],
      },
    }),
  )
  writeFileSync(join(pkgDir, 'src', '__setup__', `${table}.sql`), sql)
}

describe('dedupePlannedMigrations', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mlcl-migration-dedupe-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('plans ONE migration when two packages ship the same table and SQL', async () => {
    writePackage(dir, '@molecule/api-resource-dedupe-alpha', 'follows', FOLLOWS_SQL)
    writePackage(dir, '@molecule/api-resource-dedupe-beta', 'follows', FOLLOWS_SQL)

    const plans = [
      await planInjection('@molecule/api-resource-dedupe-alpha', dir),
      await planInjection('@molecule/api-resource-dedupe-beta', dir),
    ]
    dedupePlannedMigrations(plans)

    const planned = plans.flatMap((p) => p.migrations)
    expect(planned).toHaveLength(1)
    expect(planned[0]?.tableName).toBe('follows')
    // The first plan in the run keeps the file; the second reports the skip.
    expect(plans[0]?.migrations).toHaveLength(1)
    expect(plans[1]?.migrations).toEqual([])
    expect(plans[1]?.conflicts).toHaveLength(1)
    expect(plans[1]?.conflicts[0]?.resolution).toBe('skip')
    expect(plans[1]?.conflicts[0]?.message).toContain('follows')
    expect(plans[1]?.conflicts[0]?.message).toContain('@molecule/api-resource-dedupe-alpha')
    // A skipped duplicate is NOT a failure: the table has its migration.
    expect(plans[1]?.migrationFailures ?? []).toEqual([])
  })

  it('FAILS the injection when two packages disagree about one table', async () => {
    writePackage(dir, '@molecule/api-resource-dedupe-alpha', 'follows', FOLLOWS_SQL)
    writePackage(
      dir,
      '@molecule/api-resource-dedupe-beta',
      'follows',
      `CREATE TABLE IF NOT EXISTS "follows" ("id" integer PRIMARY KEY, "kind" text);\n`,
    )

    const plans = [
      await planInjection('@molecule/api-resource-dedupe-alpha', dir),
      await planInjection('@molecule/api-resource-dedupe-beta', dir),
    ]
    dedupePlannedMigrations(plans)

    // Neither file may be written: `IF NOT EXISTS` would make the second a no-op
    // and leave the package whose queries expect its columns short of them.
    expect(plans.flatMap((p) => p.migrations)).toHaveLength(1)
    expect(plans[1]?.migrationFailures).toHaveLength(1)
    const failure = plans[1]?.migrationFailures?.[0] ?? ''
    expect(failure).toContain('follows')
    expect(failure).toContain('@molecule/api-resource-dedupe-alpha')
    expect(failure).toContain('@molecule/api-resource-dedupe-beta')
  })

  it('leaves migrations for different tables alone', async () => {
    writePackage(
      dir,
      '@molecule/api-resource-dedupe-alpha',
      'articles',
      'CREATE TABLE articles (id int);\n',
    )
    writePackage(dir, '@molecule/api-resource-dedupe-beta', 'follows', FOLLOWS_SQL)

    const plans = [
      await planInjection('@molecule/api-resource-dedupe-alpha', dir),
      await planInjection('@molecule/api-resource-dedupe-beta', dir),
    ]
    dedupePlannedMigrations(plans)

    expect(
      plans
        .flatMap((p) => p.migrations)
        .map((m) => m.tableName)
        .sort(),
    ).toEqual(['articles', 'follows'])
    expect(plans.flatMap((p) => p.migrationFailures ?? [])).toEqual([])
  })

  it('keeps the existing migration on disk as the authority for a re-run', async () => {
    writePackage(dir, '@molecule/api-resource-dedupe-beta', 'follows', FOLLOWS_SQL)
    mkdirSync(join(dir, 'migrations'), { recursive: true })
    writeFileSync(join(dir, 'migrations', '1792182879056_create_follows_table.sql'), FOLLOWS_SQL)

    const plans = [await planInjection('@molecule/api-resource-dedupe-beta', dir)]
    dedupePlannedMigrations(plans)

    // The planner's own check already skipped it — the dedupe must not
    // reintroduce a second file or turn the skip into a failure.
    expect(plans[0]?.migrations).toEqual([])
    expect(plans[0]?.conflicts).toHaveLength(1)
    expect(plans[0]?.migrationFailures ?? []).toEqual([])
  })
})
