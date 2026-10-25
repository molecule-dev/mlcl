/**
 * `scanSqlCapabilities` — the registry scanner's derivation of a database
 * bond's SQL capability map from ITS OWN `src/capabilities.ts`.
 *
 * Why this exists: the preflight prints each provider's `note` verbatim in a
 * refusal and `registry.json` ships publicly, so a hand-maintained copy of the
 * map (or of its prose) drifts from the bond that publishes the contract. The
 * scan reads source — it never imports the module, because evaluating a bond's
 * capability file could pull engine code into a registry scan that must stay
 * dependency-free — and it understands the two shapes the seven providers use:
 * an object literal with `+`-concatenated notes, and an import alias re-exporting
 * another provider's constant (MotherDuck → DuckDB).
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import { loadRegistry } from '../registry.js'
import { scanSqlCapabilities } from '../scanner.js'

const roots: string[] = []
const scratch = (): string => {
  const root = mkdtempSync(join(tmpdir(), 'mlcl-sql-caps-scan-'))
  roots.push(root)
  return root
}
const writeCapabilities = (root: string, packageName: string, source: string): string => {
  const src = join(root, packageName, 'src')
  mkdirSync(src, { recursive: true })
  writeFileSync(join(src, 'capabilities.ts'), source)
  return src
}

afterAll(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const LITERAL = `/**
 * A declaration.
 *
 * @module
 */

import type { SqlCapabilities } from '@molecule/api-database'

export const sqlCapabilities: SqlCapabilities = {
  'fk-referential-action': {
    support: 'unsupported',
    note:
      'DuckDB rejects the action at parse time ' + 'and has no triggers, so it cannot be reproduced.',
  },
  'partial-index': { support: 'translated', note: 'Applied as a full index.' },
  'unique-partial-index': { support: 'translated', note: 'Applied as a CASE expression index.' },
}
`

describe('scanSqlCapabilities', () => {
  it('reads an object literal, joining a concatenated note', () => {
    const root = scratch()
    const src = writeCapabilities(root, 'duckdb', LITERAL)
    expect(scanSqlCapabilities(src)).toEqual({
      'fk-referential-action': {
        support: 'unsupported',
        note: 'DuckDB rejects the action at parse time and has no triggers, so it cannot be reproduced.',
      },
      'partial-index': { support: 'translated', note: 'Applied as a full index.' },
      'unique-partial-index': {
        support: 'translated',
        note: 'Applied as a CASE expression index.',
      },
    })
  })

  it('follows an import alias to the sibling package’s source', () => {
    const root = scratch()
    const duckdb = writeCapabilities(root, 'duckdb', LITERAL)
    const motherduck = writeCapabilities(
      root,
      'motherduck',
      `import { sqlCapabilities as duckdbSqlCapabilities } from '@molecule/api-database-duckdb/capabilities.js'

export const sqlCapabilities = duckdbSqlCapabilities
`,
    )
    const resolved = scanSqlCapabilities(motherduck, (moduleName) =>
      moduleName === '@molecule/api-database-duckdb' ? duckdb : null,
    )
    expect(resolved?.['fk-referential-action']?.support).toBe('unsupported')
  })

  it('returns null when a package declares no capability map', () => {
    const root = scratch()
    const src = writeCapabilities(root, 'plain', `export const provider = {}\n`)
    expect(scanSqlCapabilities(src)).toBeNull()
  })

  it('rejects a support value outside the contract instead of recording it', () => {
    const root = scratch()
    const src = writeCapabilities(
      root,
      'bogus',
      `export const sqlCapabilities = { 'partial-index': { support: 'maybe' } }\n`,
    )
    expect(scanSqlCapabilities(src)).toBeNull()
  })

  it('the registry matches every database provider’s own source', () => {
    // The drift guard: `sync-registry --check` fails on the same comparison. A
    // standalone mlcl checkout has no molecule sibling, so the scan is skipped
    // there (the registry entries are still validated by their schema).
    const registry = loadRegistry()
    const providers = registry.filter(
      (pkg) => pkg.molecule?.category === 'database' && pkg.molecule?.type === 'provider',
    )
    expect(providers.length).toBe(7)
    if (!providers.every((pkg) => existsSync(join(pkg.path, 'src', 'capabilities.ts')))) {
      expect(providers.every((pkg) => pkg.molecule?.sqlCapabilities)).toBe(true)
      return
    }
    for (const pkg of providers) {
      const scanned = scanSqlCapabilities(join(pkg.path, 'src'), (moduleName) => {
        const target = registry.find((entry) => entry.name === moduleName)
        return target ? join(target.path, 'src') : null
      })
      expect({ provider: pkg.name, capabilities: scanned }).toEqual({
        provider: pkg.name,
        capabilities: pkg.molecule?.sqlCapabilities,
      })
    }
  })
})
