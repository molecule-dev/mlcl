/**
 * The pin-aware setup-SQL registry sync (P18 r11 review, R11-1/R11-2).
 *
 * `sync-registry --scan-tables` used to count ANY difference from the sibling
 * checkout as drift, including the one state a held/blocked/off-map package
 * leaves behind: molecule's package version ahead of the registry pin while the
 * registry is still tagged at the pin. `registry.test.ts` skipped that state, so
 * `sync-registry --check` (the release's first gate) refused a publication the
 * tests accepted — and its own fix hint (`sync-registry`) retagged the held
 * package to the UNPINNED version, which both of mlcl's own gates reject.
 *
 * `planSetupSqlEntrySync` is the ONE rule both gates now apply. These tests use
 * real package directories and the real scanner, so the inputs are exactly what
 * the command feeds it.
 *
 * @module
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { scanForTables, scanSetupSqlBundle } from '../scanner.js'
import { readPackageVersion } from '../setup-sql.js'
import {
  planSetupSqlEntrySync,
  type SetupSqlEntryState,
  type SetupSqlSiblingState,
  setupSqlVersionProblems,
} from '../setup-sql-version.js'

const PIN = '1.0.0'
const HELD = '1.0.1'
const SQL_FILE = 'src/__setup__/probe.sql'
const V1_SQL = 'CREATE TABLE IF NOT EXISTS "probe" (\n  "id" UUID PRIMARY KEY\n);\n'
const V2_SQL = `${V1_SQL}CREATE TABLE IF NOT EXISTS "probe_extra" (\n  "id" UUID PRIMARY KEY\n);\n`

/** A registry entry as `registry.json` holds it for the probe package. */
function entryAtPin(): SetupSqlEntryState {
  return {
    tables: [{ name: 'probe', sqlFile: SQL_FILE }],
    setupSql: { [SQL_FILE]: V1_SQL },
    setupSqlVersion: PIN,
  }
}

/** What the command feeds the planner, from a real package directory. */
async function scanSibling(root: string): Promise<SetupSqlSiblingState> {
  return {
    tables: (await scanForTables(root)).map((table) => ({
      name: table.name,
      sqlFile: relative(root, table.sqlFile),
    })),
    bundle: await scanSetupSqlBundle(root),
    version: readPackageVersion(root),
  }
}

/**
 * Write a probe package that declares `version` and ships `sql`.
 *
 * @param root - The package directory.
 * @param version - Its own package.json version.
 * @param sql - Its setup SQL, or null for a package that ships none.
 */
function writeProbe(root: string, version: string, sql: string | null): void {
  mkdirSync(root, { recursive: true })
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ name: '@molecule/api-probe-held', version }),
  )
  if (sql === null) return
  mkdirSync(join(root, 'src', '__setup__'), { recursive: true })
  writeFileSync(join(root, SQL_FILE), sql)
}

describe('planSetupSqlEntrySync', () => {
  let base: string
  let pkg: string

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'mlcl-pin-sync-'))
    pkg = join(base, 'packages', 'api-resource-probe')
  })

  afterEach(() => {
    rmSync(base, { recursive: true, force: true })
  })

  it('reports the pinned state as in sync (the matching positive control)', async () => {
    writeProbe(pkg, PIN, V1_SQL)
    const plan = planSetupSqlEntrySync({
      name: '@molecule/api-probe-held',
      entry: entryAtPin(),
      sibling: await scanSibling(pkg),
      pinned: PIN,
    })
    expect(plan).toEqual({ kind: 'in-sync' })
  })

  it('updates a sibling AT the pin whose bytes changed (real drift still fails the gate)', async () => {
    writeProbe(pkg, PIN, V2_SQL)
    const plan = planSetupSqlEntrySync({
      name: '@molecule/api-probe-held',
      entry: entryAtPin(),
      sibling: await scanSibling(pkg),
      pinned: PIN,
    })
    expect(plan.kind).toBe('update')
    if (plan.kind !== 'update') throw new Error('expected an update')
    expect(plan.setupSqlVersion).toBe(PIN)
    expect(plan.setupSql).toEqual({ [SQL_FILE]: V2_SQL })
    expect(plan.tables.map((table) => table.name)).toEqual(['probe', 'probe_extra'])
  })

  it('holds a sibling ahead of the pin on a version-only bump (R11-1)', async () => {
    writeProbe(pkg, HELD, V1_SQL)
    const plan = planSetupSqlEntrySync({
      name: '@molecule/api-probe-held',
      entry: entryAtPin(),
      sibling: await scanSibling(pkg),
      pinned: PIN,
    })
    // NOT an update: the entry keeps the pinned release's metadata, and the
    // state is named so the operator can see it was not re-scanned.
    expect(plan.kind).toBe('held')
    if (plan.kind !== 'held') throw new Error('expected held')
    expect(plan.detail).toContain('1.0.1')
    expect(plan.detail).toContain(PIN)
  })

  it('holds a sibling ahead of the pin that GAINED setup SQL (R11-2)', async () => {
    writeProbe(pkg, HELD, V2_SQL)
    const pinnedEntry: SetupSqlEntryState = { tables: [] }
    const plan = planSetupSqlEntrySync({
      name: '@molecule/api-probe-held',
      entry: pinnedEntry,
      sibling: await scanSibling(pkg),
      pinned: PIN,
    })
    // The pinned release shipped no SQL. Keeping that (nothing to write) is the
    // only state both gates accept — the old code scanned the sibling in and
    // retagged it, which the invariant then rejected.
    expect(plan.kind).toBe('held')
  })

  it('holds a sibling ahead of the pin that DROPPED its setup SQL, preserving the pinned bundle (R11-2)', async () => {
    writeProbe(pkg, HELD, null)
    const entry = entryAtPin()
    const plan = planSetupSqlEntrySync({
      name: '@molecule/api-probe-held',
      entry,
      sibling: await scanSibling(pkg),
      pinned: PIN,
    })
    // The pinned release still ships this SQL, so a plan that writes the
    // sibling's emptiness would make a scaffold at the pin copy none of it. Held
    // carries no values to write at all.
    expect(plan.kind).toBe('held')
    expect('tables' in plan).toBe(false)
    expect(entry.setupSql).toEqual({ [SQL_FILE]: V1_SQL })
  })

  it('refuses to accept a held entry whose kept tag does not name the pin (R11-1)', async () => {
    writeProbe(pkg, HELD, V2_SQL)
    const plan = planSetupSqlEntrySync({
      name: '@molecule/api-probe-held',
      entry: {
        tables: [{ name: 'probe', sqlFile: SQL_FILE }],
        setupSql: { [SQL_FILE]: V2_SQL },
        setupSqlVersion: HELD,
      },
      sibling: await scanSibling(pkg),
      pinned: PIN,
    })
    expect(plan.kind).toBe('unresolved')
    if (plan.kind !== 'unresolved') throw new Error('expected unresolved')
    expect(plan.detail).toContain('1.0.1')
    expect(plan.detail).toContain(PIN)
  })

  it('refuses a held entry that carries a tag with no bundle, which nothing can complete', async () => {
    writeProbe(pkg, HELD, V2_SQL)
    const plan = planSetupSqlEntrySync({
      name: '@molecule/api-probe-held',
      entry: { tables: [], setupSqlVersion: HELD },
      sibling: await scanSibling(pkg),
      pinned: PIN,
    })
    expect(plan.kind).toBe('unresolved')
  })

  it('ignores the version of a package that has no setup SQL on either side', async () => {
    // A stale checkout is only a setup-SQL problem where there is setup SQL to
    // sync. The composed verifier runs against a recorded molecule base that is
    // behind twelve non-SQL pins; refusing the release for them would make the
    // gate depend on the checkout rather than on the registry.
    for (const [version, expected] of [
      ['0.9.0', { kind: 'in-sync' }],
      [HELD, { kind: 'in-sync' }],
    ] as const) {
      writeProbe(pkg, version, null)
      const plan = planSetupSqlEntrySync({
        name: '@molecule/api-probe-held',
        entry: { tables: [] },
        sibling: await scanSibling(pkg),
        pinned: PIN,
      })
      expect(plan).toEqual(expected)
    }
  })

  it('refuses a checkout BEHIND the pin instead of writing its older bytes', async () => {
    writeProbe(pkg, '0.9.0', V1_SQL)
    const plan = planSetupSqlEntrySync({
      name: '@molecule/api-probe-held',
      entry: { tables: [], setupSql: { [SQL_FILE]: V1_SQL }, setupSqlVersion: '0.9.0' },
      sibling: await scanSibling(pkg),
      pinned: PIN,
    })
    expect(plan.kind).toBe('unresolved')
    if (plan.kind !== 'unresolved') throw new Error('expected unresolved')
    expect(plan.detail).toContain('0.9.0')
    expect(plan.detail).toContain(PIN)
  })

  it('never records a bundle tagged with a version other than the pin', async () => {
    writeProbe(pkg, PIN, V1_SQL)
    const sibling = await scanSibling(pkg)
    // A scan whose bytes belong to another release cannot be written under this pin.
    const plan = planSetupSqlEntrySync({
      name: '@molecule/api-probe-held',
      entry: entryAtPin(),
      sibling: { ...sibling, bundle: sibling.bundle && { ...sibling.bundle, version: '2.0.0' } },
      pinned: PIN,
    })
    expect(plan.kind).toBe('unresolved')
  })

  it('keeps the invariant satisfied in every state the planner calls in-sync or held', async () => {
    // The two gates must agree: a state the sync accepts is a state the
    // setupSqlVersion invariant accepts too (that disagreement was R11-1's cost).
    for (const [siblingVersion, sql, entry] of [
      [PIN, V1_SQL, entryAtPin()],
      [HELD, V1_SQL, entryAtPin()],
      [HELD, V2_SQL, entryAtPin()],
      [HELD, null, entryAtPin()],
      [HELD, V2_SQL, { tables: [] } as SetupSqlEntryState],
    ] as const) {
      writeProbe(pkg, siblingVersion, sql)
      const plan = planSetupSqlEntrySync({
        name: '@molecule/api-probe-held',
        entry,
        sibling: await scanSibling(pkg),
        pinned: PIN,
      })
      expect(plan.kind === 'in-sync' || plan.kind === 'held').toBe(true)
      expect(
        setupSqlVersionProblems(
          { packages: { '@molecule/api-probe-held': entry as never } },
          () => PIN,
        ),
      ).toEqual([])
    }
  })
})
