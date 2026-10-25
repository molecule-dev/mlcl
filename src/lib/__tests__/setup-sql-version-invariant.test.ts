/**
 * P18 N2 — the mlcl-only registry invariant: the setup SQL bundle and the
 * version it belongs to move together.
 *
 * `registry.test.ts` compares the bundled BYTES with a molecule sibling. This
 * guard needs no sibling at all: it compares each entry to the version the
 * registry itself pins, so it also runs in mlcl's plain CI (which checks out only
 * mlcl) and fires at commit time on both known breakages:
 *
 *   - a release that moved `moleculeVersions` but not `setupSqlVersion` (N2);
 *   - a half-applied registry that carries `setupSql` with NO version (E1).
 *
 * The real registry is checked, and the two known-bad states are constructed
 * locally (`structuredClone`) and must produce a problem. No file outside
 * `registry.json` is read, and no molecule checkout is constructed.
 */
import { describe, expect, it } from 'vitest'

import { getMoleculeVersion, getRawRegistry } from '../registry.js'
import type { Registry } from '../schema.js'
import { setupSqlVersionProblems } from '../setup-sql-version.js'

/** Names whose entry carries a setup SQL bundle in the registry under test. */
const bundled = (registry: Registry): string[] =>
  Object.entries(registry.packages ?? {})
    .filter(([, entry]) => entry.setupSql !== undefined)
    .map(([name]) => name)

/** The pin a registry names for one package (the reader `getMoleculeVersion` implements). */
const pinReader =
  (registry: Registry) =>
  (name: string): string =>
    registry.moleculeVersions?.overrides?.[name] ?? registry.moleculeVersions?.default ?? ''

describe('every setupSql entry is tagged with the version its pin names', () => {
  it('holds on the committed registry, and the guard is not vacuous', () => {
    const registry = getRawRegistry()
    const names = bundled(registry)
    // A registry with no bundles would make the check below prove nothing. After
    // the setup-SQL delta lands there are 55; the guard must see them.
    expect(names.length).toBeGreaterThan(0)
    const problems = setupSqlVersionProblems(registry, getMoleculeVersion)
    expect(problems.map((problem) => problem.message)).toEqual([])
  })

  it('asks the pin reader only about entries that carry a bundle', () => {
    const registry = getRawRegistry()
    const asked: string[] = []
    setupSqlVersionProblems(registry, (name) => {
      asked.push(name)
      return pinReader(registry)(name)
    })
    expect(asked.every((name) => registry.packages[name].setupSql !== undefined)).toBe(true)
  })

  it('fails a pins-only move: moleculeVersions advanced, setupSqlVersion did not', () => {
    const registry = structuredClone(getRawRegistry())
    const [name] = bundled(registry)
    const pins = registry.moleculeVersions ?? { default: '', overrides: {} }
    pins.overrides[name] = '99.0.1'
    registry.moleculeVersions = pins

    const problems = setupSqlVersionProblems(registry, pinReader(registry))
    const problem = problems.find((candidate) => candidate.name === name)
    expect(problem?.message).toBe(
      `${name} carries setupSqlVersion ${registry.packages[name].setupSqlVersion} but the ` +
        'registry pins 99.0.1 — run `mlcl sync-registry --scan-tables` in the same change ' +
        'as the pin move',
    )
  })

  it('fails a missing version: setupSql with no setupSqlVersion (the E1 shape)', () => {
    const registry = structuredClone(getRawRegistry())
    const [name] = bundled(registry)
    delete registry.packages[name].setupSqlVersion
    expect(
      setupSqlVersionProblems(registry, pinReader(registry)).map((problem) => problem.message),
    ).toContain(`${name} carries setupSql without setupSqlVersion`)
  })

  it('fails a version left behind by a half-removed bundle', () => {
    const registry = structuredClone(getRawRegistry())
    const [name] = Object.entries(registry.packages ?? {})
      .filter(([, entry]) => entry.setupSql === undefined)
      .map(([entryName]) => entryName)
    registry.packages[name].setupSqlVersion = '1.0.0'
    expect(
      setupSqlVersionProblems(registry, pinReader(registry)).map((problem) => problem.message),
    ).toContain(`${name} carries setupSqlVersion without setupSql`)
  })
})
