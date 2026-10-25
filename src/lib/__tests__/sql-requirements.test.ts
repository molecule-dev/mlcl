/**
 * The SQL requirement analysis this CLI runs before generating a project: what a
 * migration requires, and what a provider must declare before the generator can
 * certify the pair.
 *
 * The types it produces are the shared core contract
 * (`@molecule/api-database/sql-compatibility.js`); the lexing, analysis and
 * comparison live here because deciding whether a selection can compile is
 * compilation work (molecule AGENTS.md Rule 4: a core is contracts only).
 */
import { describe, expect, it } from 'vitest'

import type { SqlCapabilities } from '@molecule/api-database/sql-compatibility.js'

import {
  analyzeSqlRequirements,
  checkSqlCompatibility,
  parseCreateIndexStatement,
  splitSqlColumns,
  splitSqlStatements,
  SQL_FEATURES,
} from '../sql-requirements.js'

const CAPABILITIES: SqlCapabilities = {
  'fk-referential-action': { support: 'unsupported', note: 'DuckDB cannot reproduce it.' },
  'partial-index': { support: 'translated', note: 'Applied as a full index.' },
  'unique-partial-index': { support: 'translated', note: 'Applied as a CASE expression index.' },
}

describe('SQL_FEATURES', () => {
  it('is in the contract’s stable order', () => {
    expect([...SQL_FEATURES]).toEqual([
      'fk-referential-action',
      'partial-index',
      'unique-partial-index',
    ])
  })
})

describe('splitSqlStatements', () => {
  it('keeps the exact text and offsets, semicolon included', () => {
    const sql = 'CREATE TABLE a (x INT);\nCREATE TABLE b (y INT);\n'
    const statements = splitSqlStatements(sql)
    expect(statements.map((s) => s.text)).toEqual([
      'CREATE TABLE a (x INT);',
      '\nCREATE TABLE b (y INT);',
      '\n',
    ])
    expect(statements.map((s) => sql.slice(s.start, s.end)).join('')).toBe(sql)
  })

  it('does not split on semicolons inside strings, identifiers or comments', () => {
    const sql =
      "INSERT INTO t VALUES ('a;b'); -- c;d\n" +
      'CREATE TABLE "odd;name" (x INT); /* e;f */ SELECT 1;'
    expect(splitSqlStatements(sql).filter((s) => s.text.trim().length)).toHaveLength(3)
  })

  it('treats a dollar-quoted body as one unit', () => {
    const sql = 'CREATE FUNCTION f() RETURNS INT AS $$ SELECT 1; $$ LANGUAGE sql; SELECT 2;'
    const statements = splitSqlStatements(sql)
    expect(statements.filter((s) => s.text.trim().length)).toHaveLength(2)
  })
})

describe('parseCreateIndexStatement', () => {
  it('parses a plain partial index and exposes the predicate', () => {
    const parsed = parseCreateIndexStatement(
      'CREATE INDEX IF NOT EXISTS "idx" ON "addresses" ("userId") WHERE "isDefaultShipping" = TRUE;',
    )
    expect(parsed?.unique).toBe(false)
    expect(parsed?.predicate).toBe('"isDefaultShipping" = TRUE')
    expect(parsed?.afterPredicate).toBe(';')
  })

  it('parses a UNIQUE partial index and removes USING from the prefix', () => {
    const parsed = parseCreateIndexStatement(
      'CREATE UNIQUE INDEX "idx" ON "t" USING btree ("userId") WHERE "isDefault" = true;',
    )
    expect(parsed?.unique).toBe(true)
    expect(parsed?.predicate).toBe('"isDefault" = true')
    expect(parsed?.prefix).toBe('CREATE UNIQUE INDEX "idx" ON "t" (')
    expect(parsed?.columns).toBe('"userId"')
  })

  it('returns null for a non-index statement and for an index with no WHERE', () => {
    expect(parseCreateIndexStatement('CREATE TABLE t (x INT);')).toBeNull()
    expect(parseCreateIndexStatement('CREATE INDEX ix ON t (x);')?.predicate).toBeNull()
  })
})

describe('splitSqlColumns', () => {
  it('splits at top-level commas only', () => {
    expect(splitSqlColumns('"a", lower("b"), "c"')).toEqual(['"a"', 'lower("b")', '"c"'])
  })
})

describe('analyzeSqlRequirements', () => {
  it('reports each referential action with the action normalized', () => {
    const requirements = analyzeSqlRequirements(
      'CREATE TABLE b (a UUID REFERENCES a(id) ON DELETE CASCADE, c UUID REFERENCES a(id) ON UPDATE set null);',
      'child.sql',
    )
    expect(requirements).toEqual([
      {
        feature: 'fk-referential-action',
        detail: 'ON DELETE CASCADE',
        statement:
          'CREATE TABLE b (a UUID REFERENCES a(id) ON DELETE CASCADE, c UUID REFERENCES a(id) ON UPDATE set null);',
        source: 'child.sql',
      },
      {
        feature: 'fk-referential-action',
        detail: 'ON UPDATE SET NULL',
        statement:
          'CREATE TABLE b (a UUID REFERENCES a(id) ON DELETE CASCADE, c UUID REFERENCES a(id) ON UPDATE set null);',
        source: 'child.sql',
      },
    ])
  })

  it('does not flag NO ACTION/RESTRICT, string literals or comments', () => {
    const sql = [
      'CREATE TABLE b (a UUID REFERENCES a(id) ON DELETE NO ACTION);',
      "INSERT INTO notes VALUES ('ON DELETE CASCADE');",
      '-- ON DELETE CASCADE',
    ].join('\n')
    expect(analyzeSqlRequirements(sql)).toEqual([])
  })

  it('classifies plain and UNIQUE partial indexes', () => {
    const requirements = analyzeSqlRequirements(
      'CREATE INDEX ix ON t ("userId") WHERE "isDefaultShipping" = TRUE;\n' +
        'CREATE UNIQUE INDEX uix ON t ("userId") WHERE "isDefault" = true;',
    )
    expect(requirements.map((r) => [r.feature, r.detail])).toEqual([
      ['partial-index', 'WHERE "isDefaultShipping" = TRUE'],
      ['unique-partial-index', 'WHERE "isDefault" = true'],
    ])
  })
})

describe('checkSqlCompatibility', () => {
  it('returns nothing when every requirement is native or translated', () => {
    const requirements = analyzeSqlRequirements(
      'CREATE UNIQUE INDEX ix ON t ("userId") WHERE "isDefault" = true;',
    )
    expect(checkSqlCompatibility(requirements, CAPABILITIES, { provider: 'DuckDB' })).toEqual([])
  })

  it('reports an unsupported construct with the provider note', () => {
    const requirements = analyzeSqlRequirements(
      'CREATE TABLE b (a UUID REFERENCES a(id) ON DELETE CASCADE);',
      'comments.sql',
    )
    const issue = checkSqlCompatibility(requirements, CAPABILITIES, { provider: 'DuckDB' })[0]
    expect(issue?.kind).toBe('unsupported')
    expect(issue?.feature).toBe('fk-referential-action')
    expect(issue?.message).toContain('DuckDB cannot apply ON DELETE CASCADE in comments.sql')
    expect(issue?.message).toContain('DuckDB cannot reproduce it.')
  })

  it('fails closed when the provider declares no capability for a used feature', () => {
    const requirements = analyzeSqlRequirements(
      'CREATE TABLE b (a UUID REFERENCES a(id) ON DELETE CASCADE);',
    )
    const issue = checkSqlCompatibility(requirements, {}, { provider: 'SomeDB' })[0]
    expect(issue?.kind).toBe('missing-capability')
    expect(issue?.message).toContain(
      'SomeDB declares no SQL capability for "fk-referential-action"',
    )
  })

  it('collapses duplicate constructs in one statement to one issue', () => {
    const requirements = analyzeSqlRequirements(
      'CREATE TABLE b (a UUID REFERENCES a(id) ON DELETE CASCADE, c UUID REFERENCES a(id) ON DELETE CASCADE);',
    )
    expect(checkSqlCompatibility(requirements, CAPABILITIES)).toHaveLength(1)
  })
})
