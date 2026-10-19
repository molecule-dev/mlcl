/**
 * One migration per SQL FILE, not per table entry.
 *
 * A package's `tables` metadata names a multi-table file once per table:
 * `@molecule/api-resource-article` declares `articles` AND `article_tags` both
 * from `src/__setup__/articles.sql`, and `@molecule/api-resource-tag` declares
 * `tags` AND `resource_tags` both from `tags.sql`. Copying the file once per
 * entry scaffolded two byte-identical migrations per schema file, and after a
 * `git checkout` restore both copies were present: each was the other's only
 * creator, so the platform's note told the model to delete BOTH and obeying it
 * left the app with no `articles` (X0 xr-molecule-flash-l03, 2026-10-19).
 *
 * The same package also ships `articles_position.sql`, which repeats
 * `article_tags`' CREATE (a no-op once `articles.sql` has run) and adds a column.
 * Keyed by table name, the dependency pass dropped that entry and the dedupe pass
 * dropped its migration, so a scaffold never delivered the upgrade.
 *
 * @module
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { dedupePlannedMigrations, planInjection, tablesCreatedBySql } from '../injector.js'

const PKG_NAME = '@molecule/api-resource-article-fixture'

const ARTICLES_SQL = `CREATE TABLE IF NOT EXISTS "articles" (
  "id" UUID PRIMARY KEY,
  "slug" VARCHAR(255) NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS "idx_articles_slug" ON "articles" ("slug");

CREATE TABLE IF NOT EXISTS "article_tags" (
  "id" UUID PRIMARY KEY,
  "articleId" UUID NOT NULL REFERENCES "articles"("id") ON DELETE CASCADE,
  "tag" VARCHAR(100) NOT NULL
);
`

const POSITION_SQL = `-- The CREATE repeats articles.sql's "article_tags" (a no-op there).
CREATE TABLE IF NOT EXISTS "article_tags" (
  "id" UUID PRIMARY KEY,
  "position" INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE "article_tags" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;
`

const WIDGETS_SQL = `CREATE TABLE IF NOT EXISTS "widgets" (
  "id" UUID PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS "widget_parts" (
  "id" UUID PRIMARY KEY,
  "widgetId" UUID NOT NULL REFERENCES "widgets"("id")
);
`

describe('one migration per package SQL file', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mlcl-migration-per-file-'))
    const pkgDir = join(dir, 'node_modules', '@molecule', 'api-resource-article-fixture')
    mkdirSync(join(pkgDir, 'src', '__setup__'), { recursive: true })
    writeFileSync(
      join(pkgDir, 'package.json'),
      JSON.stringify({
        name: PKG_NAME,
        version: '1.0.0',
        molecule: {
          type: 'resource',
          category: 'test',
          label: 'Article fixture',
          // The l03 registry shape: two tables from one file, then an upgrade file
          // that repeats one of them.
          tables: [
            { name: 'articles', sqlFile: 'src/__setup__/articles.sql' },
            { name: 'article_tags', sqlFile: 'src/__setup__/articles.sql' },
            { name: 'article_tags', sqlFile: 'src/__setup__/articles_position.sql' },
          ],
        },
      }),
    )
    writeFileSync(join(pkgDir, 'src', '__setup__', 'articles.sql'), ARTICLES_SQL)
    writeFileSync(join(pkgDir, 'src', '__setup__', 'articles_position.sql'), POSITION_SQL)
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('writes ONE migration for the multi-table file, named after its first table', async () => {
    const plan = await planInjection(PKG_NAME, dir)

    expect(plan.migrationFailures ?? []).toEqual([])
    expect(plan.migrations).toHaveLength(2)
    const [articles, position] = plan.migrations
    expect(articles?.name).toMatch(/_create_articles_table\.sql$/)
    expect(articles?.tableName).toBe('articles')
    expect(articles?.tables).toEqual(['articles', 'article_tags'])
    expect(articles?.content).toContain('CREATE TABLE IF NOT EXISTS "articles"')
    expect(articles?.content).toContain('CREATE TABLE IF NOT EXISTS "article_tags"')

    // The upgrade file is a second, distinct migration — not a third copy of
    // `articles.sql`, and not dropped because it also names `article_tags`.
    expect(position?.name).toMatch(/_create_article_tags_table\.sql$/)
    expect(position?.tables).toEqual(['article_tags'])
    expect(position?.content).toContain('ADD COLUMN IF NOT EXISTS "position"')
    expect(position?.content).not.toBe(articles?.content)

    // Dependency order: the file that creates `articles` comes first, and the
    // per-file timestamps keep them ordered on disk.
    expect(articles?.name.localeCompare(position?.name)).toBeLessThan(0)
  })

  it('keeps both files of one package through the cross-package dedupe', async () => {
    const plan = await planInjection(PKG_NAME, dir)
    dedupePlannedMigrations([plan])

    expect(plan.migrations).toHaveLength(2)
    expect(plan.conflicts.filter((c) => c.resolution === 'skip')).toEqual([])
  })

  it('recognizes a re-run through ANY table the file creates, not only its name', async () => {
    // An older scaffold named the same file after the table it also creates.
    mkdirSync(join(dir, 'migrations'), { recursive: true })
    const older = '1792182879000_create_article_tags_table.sql'
    writeFileSync(join(dir, 'migrations', older), 'CREATE TABLE IF NOT EXISTS "article_tags" ();\n')

    const plan = await planInjection(PKG_NAME, dir)

    expect(plan.migrations).toEqual([])
    expect(plan.conflicts.map((c) => c.path)).toContain(join(dir, 'migrations', older))
  })

  it('collapses the entries a published package gets from its SQL scan', async () => {
    // A package that declares no `tables` metadata (every published @molecule
    // package: the registry copy is not in its package.json) gets one entry per
    // CREATE TABLE from `scanForTables` — the same duplicate shape.
    const scanned = '@molecule/api-resource-scanned'
    const pkgDir = join(dir, 'node_modules', '@molecule', 'api-resource-scanned')
    mkdirSync(join(pkgDir, 'src', '__setup__'), { recursive: true })
    writeFileSync(
      join(pkgDir, 'package.json'),
      JSON.stringify({
        name: scanned,
        version: '1.0.0',
        molecule: { type: 'resource', category: 'test', label: 'Scanned resource' },
      }),
    )
    writeFileSync(join(pkgDir, 'src', '__setup__', 'widgets.sql'), WIDGETS_SQL)

    const plan = await planInjection(scanned, dir)

    expect(plan.migrations).toHaveLength(1)
    expect(plan.migrations[0]?.name).toMatch(/_create_widgets_table\.sql$/)
    expect(plan.migrations[0]?.tables).toEqual(['widgets', 'widget_parts'])
  })
})

describe('tablesCreatedBySql', () => {
  it('lists each created table once, ignoring comments', () => {
    expect(tablesCreatedBySql(ARTICLES_SQL)).toEqual(['articles', 'article_tags'])
    expect(
      tablesCreatedBySql(
        '-- CREATE TABLE ignored (id int);\nCREATE TABLE IF NOT EXISTS public."widgets" (id int);',
      ),
    ).toEqual(['widgets'])
  })

  it('is empty for SQL that creates no table', () => {
    expect(tablesCreatedBySql('ALTER TABLE "articles" ADD COLUMN "x" int;')).toEqual([])
  })
})
