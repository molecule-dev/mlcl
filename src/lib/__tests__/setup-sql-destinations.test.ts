/**
 * ONE destination rule for both writers of `__setup__/`.
 *
 * The scaffold copier and the inject command's setup writer name a destination
 * by BASENAME, so two declarations can target one file. Identical bytes are the
 * same file written twice (kept once); different bytes are a silent overwrite
 * (refused before any write). `planSetupSqlDestinations` is shared by both, so
 * the rule cannot hold for one writer and not the other (r7 review, L1).
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import type { SetupSqlSource } from '../setup-sql.js'
import {
  describeSetupSqlDestinationConflict,
  describeSetupSqlExistingFileConflict,
  planSetupSqlDestinations,
  setupSqlFileContent,
} from '../setup-sql.js'

/**
 * A resolved setup source.
 *
 * @param packageName - The declaring package.
 * @param sqlFile - The package-relative file.
 * @param sql - Its bytes.
 * @returns The source.
 */
function source(packageName: string, sqlFile: string, sql: string): SetupSqlSource {
  return { source: `${packageName}:${sqlFile}`, packageName, sqlFile, sql, origin: 'installed' }
}

describe('planSetupSqlDestinations', () => {
  it('writes identical bytes once, even from different declarations', () => {
    const result = planSetupSqlDestinations([
      source(
        '@molecule/api-resource-article',
        'src/__setup__/follows.sql',
        'CREATE TABLE follows ();',
      ),
      source('@molecule/api-resource-follow', 'setup/follows.sql', 'CREATE TABLE follows ();'),
    ])

    expect(result.conflicts).toEqual([])
    expect(result.destinations).toEqual([
      {
        destination: 'follows.sql',
        packageName: '@molecule/api-resource-article',
        sqlFile: 'src/__setup__/follows.sql',
        sql: 'CREATE TABLE follows ();',
      },
    ])
  })

  it('refuses two declarations of one file with DIFFERENT bytes', () => {
    const result = planSetupSqlDestinations([
      source('@molecule/api-resource-a', 'src/__setup__/x.sql', 'CREATE TABLE a ();'),
      source('@molecule/api-resource-b', 'setup/x.sql', 'CREATE TABLE b ();'),
    ])

    expect(result.destinations).toHaveLength(1)
    expect(result.conflicts).toEqual([
      {
        destination: 'x.sql',
        first: { packageName: '@molecule/api-resource-a', sqlFile: 'src/__setup__/x.sql' },
        second: { packageName: '@molecule/api-resource-b', sqlFile: 'setup/x.sql' },
      },
    ])
    const message = describeSetupSqlDestinationConflict(result.conflicts[0]!)
    expect(message).toContain('@molecule/api-resource-a:src/__setup__/x.sql')
    expect(message).toContain('@molecule/api-resource-b:setup/x.sql')
    expect(message).toContain('DIFFERENT bytes')
  })

  it('keeps distinct file names as distinct destinations', () => {
    const result = planSetupSqlDestinations([
      source('@molecule/api-resource-a', 'src/__setup__/a.sql', 'CREATE TABLE a ();'),
      source('@molecule/api-resource-b', 'src/__setup__/b.sql', 'CREATE TABLE b ();'),
    ])

    expect(result.conflicts).toEqual([])
    expect(result.destinations.map((destination) => destination.destination)).toEqual([
      'a.sql',
      'b.sql',
    ])
  })

  it('applies the same rule inside ONE package declaring the file twice', () => {
    const identical = planSetupSqlDestinations([
      source('@molecule/api-x', 'src/__setup__/x.sql', 'same'),
      source('@molecule/api-x', 'legacy/x.sql', 'same'),
    ])
    expect(identical.conflicts).toEqual([])
    expect(identical.destinations).toHaveLength(1)

    const conflict = planSetupSqlDestinations([
      source('@molecule/api-x', 'src/__setup__/x.sql', 'one'),
      source('@molecule/api-x', 'legacy/x.sql', 'two'),
    ])
    expect(conflict.conflicts).toHaveLength(1)
  })
})

/**
 * The files a previous run left in `__setup__/` are judged by the SAME rule: a
 * second `inject -m` must not erase the first package's schema (r10 review, F6).
 */
describe('planSetupSqlDestinations against the files already on disk', () => {
  const HEADER = '-- This app’s database is SQLite.\n'
  const A = source(
    '@molecule/api-probe-util-a',
    'src/__setup__/shared.sql',
    '-- UTIL-A\nCREATE TABLE a ();\n',
  )
  const B = source(
    '@molecule/api-probe-util-b',
    'setup/shared.sql',
    '-- UTIL-B\nCREATE TABLE b ();\n',
  )

  /**
   * The bytes a write of `declaration` produces.
   *
   * @param declaration - The resolved source.
   * @param header - The dialect header.
   * @returns Its file content.
   */
  function contentOf(declaration: SetupSqlSource, header = HEADER): string {
    return setupSqlFileContent(
      {
        destination: 'shared.sql',
        packageName: declaration.packageName,
        sqlFile: declaration.sqlFile,
        sql: declaration.sql,
      },
      header,
    )
  }

  it('skips bytes that are already on disk (same package, same schema, re-run)', () => {
    const result = planSetupSqlDestinations([A], {
      header: HEADER,
      existing: [{ destination: 'shared.sql', content: contentOf(A) }],
    })
    expect(result.destinations).toEqual([])
    expect(result.unchanged.map((entry) => entry.packageName)).toEqual([A.packageName])
    expect(result.existingConflicts).toEqual([])
  })

  it('adopts a file an older mlcl wrote with the same SQL (header, no owner line)', () => {
    // No owner line, one of mlcl's own headers. The payload is the same schema,
    // so this is an upgrade: the file is rewritten with this run's header and an
    // owner line, which is what makes the NEXT version bump recognizable instead
    // of a "records no mlcl owner" refusal (P18 r11 review, R11-3).
    const result = planSetupSqlDestinations([A], {
      header: HEADER,
      existing: [{ destination: 'shared.sql', content: `${HEADER}${A.sql}` }],
    })
    expect(result.existingConflicts).toEqual([])
    expect(result.destinations).toHaveLength(1)
    expect(result.destinations[0]?.sql).toBe(A.sql)
  })

  it('upgrades a 2.1.13 DuckDB __setup__ file whose header mlcl has since changed', () => {
    // The DuckDB/MotherDuck dialect header's TEXT changed after 2.1.13 (it now
    // names what the migrator rewrites and how the runner refuses a cascade).
    // The SQL below it did not, and a header is a comment: the file is the same
    // schema. Requiring today's header — or an owner line 2.1.13 never wrote —
    // refused every DuckDB project created before the upgrade (R11-3).
    const legacyDuckdbHeader =
      "-- This app's database is DuckDB (`@molecule/api-database-duckdb`), and this file is a migration it runs.\n" +
      '-- Applied as written: Postgres type names, `gen_random_uuid()`, `now()`, `::casts`,\n' +
      '-- `ADD COLUMN IF NOT EXISTS`, `DROP COLUMN IF EXISTS`.\n' +
      '-- Rewritten by the DuckDB migrator as it applies the file: `jsonb` becomes `json`; an\n' +
      "-- index's `USING <method>` is dropped; and a partial index's `WHERE` becomes a plain\n" +
      '-- index on the same columns, or — for a UNIQUE partial index — a UNIQUE index over\n' +
      '-- `CASE WHEN <predicate> THEN <column> END`, so exactly the same rows stay constrained.\n' +
      '-- Not supported: a foreign-key referential action (`ON DELETE`/`ON UPDATE` `CASCADE`,\n' +
      '-- `SET NULL`, `SET DEFAULT`). DuckDB rejects it and cannot reproduce the cascade.\n' +
      '-- The generated runner rejects unsupported SQL and names its file and construct.\n' +
      '-- Never delete a cascade to make a file apply: that silently turns a cascading delete into one that\n' +
      '-- refuses while child rows still exist.\n'
    const result = planSetupSqlDestinations([A], {
      header: HEADER,
      existing: [{ destination: 'shared.sql', content: `${legacyDuckdbHeader}${A.sql}` }],
    })
    expect(result.existingConflicts).toEqual([])
    expect(result.destinations.map((entry) => entry.destination)).toEqual(['shared.sql'])
  })

  it('refreshes the header of an mlcl-owned file whose payload is unchanged', () => {
    // Same SQL, written when the app ran another database: the dialect header is
    // stale, so the file is rewritten (the payload is what replays).
    const result = planSetupSqlDestinations([A], {
      header: HEADER,
      existing: [{ destination: 'shared.sql', content: contentOf(A, '') }],
    })
    expect(result.existingConflicts).toEqual([])
    expect(result.destinations).toHaveLength(1)
  })

  it('adopts a hand-written file whose payload already matches', () => {
    // A hand copy of the same schema, under an older header: the bytes that
    // replay are identical, so writing this run's content changes no schema —
    // it only makes the file recognizable to the next run (R11-3).
    const result = planSetupSqlDestinations([A], {
      header: HEADER,
      existing: [{ destination: 'shared.sql', content: `${HEADER}${A.sql}` }],
    })
    expect(result.existingConflicts).toEqual([])
    expect(result.destinations).toHaveLength(1)
  })

  it('adopts an identical hand-written file (bare SQL, no header)', () => {
    const result = planSetupSqlDestinations([A], {
      header: HEADER,
      existing: [{ destination: 'shared.sql', content: A.sql }],
    })
    expect(result.existingConflicts).toEqual([])
    expect(result.destinations.map((entry) => entry.destination)).toEqual(['shared.sql'])
  })

  it('refuses to revert a hand edit to an mlcl-owned file', () => {
    // The owner line records the sha256 of the SQL mlcl wrote. A body that no
    // longer hashes to it was edited by hand — and rewriting would delete that
    // edit with no warning, which is exactly what an owner line must not make
    // safer to skip (P18 r11 review, R11-4).
    const edited = contentOf(A).replace(
      'CREATE TABLE a ();',
      'CREATE TABLE a ("operator_note" TEXT);',
    )
    const result = planSetupSqlDestinations([A], {
      header: HEADER,
      existing: [{ destination: 'shared.sql', content: edited }],
    })
    expect(result.destinations).toEqual([])
    expect(result.unchanged).toEqual([])
    expect(result.existingConflicts).toHaveLength(1)
    expect(result.existingConflicts[0]).toMatchObject({
      destination: 'shared.sql',
      packageName: A.packageName,
      existingOwner: A.packageName,
      existingOwnerModified: true,
    })
    const message = describeSetupSqlExistingFileConflict(result.existingConflicts[0]!)
    expect(message).toContain('edited by hand')
    expect(message).toContain(`@molecule/api-probe-util-a:${A.sqlFile}`)
  })

  it('lets the SAME package upgrade its own earlier file', () => {
    const upgraded = source(
      '@molecule/api-probe-util-a',
      'src/__setup__/shared.sql',
      '-- UTIL-A v2\n',
    )
    const result = planSetupSqlDestinations([upgraded], {
      header: HEADER,
      existing: [{ destination: 'shared.sql', content: contentOf(A) }],
    })
    expect(result.existingConflicts).toEqual([])
    expect(result.destinations).toHaveLength(1)
    expect(result.destinations[0]?.sql).toContain('UTIL-A v2')
  })

  it('refuses ANOTHER package replacing a different-bytes file, before any write', () => {
    const result = planSetupSqlDestinations([B], {
      header: HEADER,
      existing: [{ destination: 'shared.sql', content: contentOf(A) }],
    })
    expect(result.destinations).toEqual([])
    expect(result.existingConflicts).toEqual([
      {
        destination: 'shared.sql',
        packageName: B.packageName,
        sqlFile: B.sqlFile,
        existingOwner: A.packageName,
        existingSqlFile: A.sqlFile,
      },
    ])
    const message = describeSetupSqlExistingFileConflict(result.existingConflicts[0]!)
    expect(message).toContain(`@molecule/api-probe-util-a:${A.sqlFile}`)
    expect(message).toContain(`@molecule/api-probe-util-b:${B.sqlFile}`)
    expect(message).toContain('DIFFERENT bytes')
  })

  it('refuses overwriting a hand-written file that records no owner', () => {
    const result = planSetupSqlDestinations([B], {
      header: HEADER,
      existing: [{ destination: 'shared.sql', content: '-- handwritten\nCREATE TABLE mine ();\n' }],
    })
    expect(result.destinations).toEqual([])
    expect(result.existingConflicts).toHaveLength(1)
    expect(result.existingConflicts[0]?.existingOwner).toBeNull()
    const message = describeSetupSqlExistingFileConflict(result.existingConflicts[0]!)
    expect(message).toContain('records no mlcl owner')
  })

  it('keeps the within-run rule and the on-disk rule independent', () => {
    const result = planSetupSqlDestinations([A, B], {
      header: HEADER,
      existing: [{ destination: 'other.sql', content: 'CREATE TABLE other ();\n' }],
    })
    // A and B collide with each other; `other.sql` is not a destination at all.
    expect(result.conflicts).toHaveLength(1)
    expect(result.existingConflicts).toEqual([])
    expect(result.destinations.map((entry) => entry.packageName)).toEqual([A.packageName])
  })
})
