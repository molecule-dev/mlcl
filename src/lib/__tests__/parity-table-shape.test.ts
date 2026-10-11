/**
 * docs/PARITY.md is both a rendered document and a PARSED one:
 * `scripts/check-parity-coverage.mjs` splits every `|`-line on `|` and reads
 * column 4 (cells[3]) as the row's decision. A literal `|` inside a cell —
 * `sandbox start | stop | restart`, unescaped — adds cells to that row, shifts
 * the decision out of cells[3], and the gate then SILENTLY DROPS the row: its
 * routes stay covered only by luck of other rows' fragments. Three rows were
 * broken exactly that way (Start/stop/restart, Snapshots, CI workflow), the
 * sandbox row's `parity` decision unreadable by the gate.
 *
 * So the table must stay SHAPED: every row of a table carries the same number
 * of cells as its header (a literal pipe is written `\|`), and every data row's
 * decision cell names one of the four decisions the manifest documents — the
 * same test the coverage gate applies before it accepts a row.
 *
 * @module
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const PARITY_PATH = join(import.meta.dirname, '..', '..', '..', 'docs', 'PARITY.md')

/** The decisions a row may declare — the same set the coverage gate accepts. */
const DECISION = /parity|local-equivalent|ide-only|gap/

interface ParityTable {
  /** One-based line number of the header row, for the failure message. */
  headerLine: number
  header: string[]
  rows: Array<{ line: number; cells: string[] }>
}

/**
 * Split a table row into cells the way GFM does: a cell boundary is a `|` that
 * is NOT escaped as `\|` (an escaped pipe is literal content — the very escape
 * this gate exists to enforce).
 */
function splitCells(line: string): string[] {
  return line.split(/(?<!\\)\|/)
}

function readTables(): ParityTable[] {
  const lines = readFileSync(PARITY_PATH, 'utf-8').split('\n')
  const tables: ParityTable[] = []
  let current: ParityTable | null = null
  lines.forEach((line, index) => {
    if (!line.startsWith('|')) {
      current = null
      return
    }
    const cells = splitCells(line)
    if (current === null) {
      current = { headerLine: index + 1, header: cells, rows: [] }
      tables.push(current)
      return
    }
    current.rows.push({ line: index + 1, cells })
  })
  return tables
}

describe('docs/PARITY.md table shape', () => {
  const tables = readTables()

  it('has tables to check', () => {
    expect(tables.length).toBeGreaterThan(0)
  })

  it('keeps every row as wide as its table header (literal pipes are escaped \\|)', () => {
    for (const table of tables) {
      for (const row of table.rows) {
        // The `| --- |` separator row is part of the table's own shape; every
        // other row must split into exactly as many cells as the header.
        const isSeparator = row.cells.every((cell) => /^-*$/.test(cell.trim()))
        if (isSeparator) continue
        expect(
          row.cells.length,
          `docs/PARITY.md line ${row.line} has ${row.cells.length} cells but its ` +
            `header (line ${table.headerLine}) has ${table.header.length} — a literal ` +
            '`|` inside a cell must be written `\\|`, or the coverage gate reads the ' +
            'wrong column and silently drops the row',
        ).toBe(table.header.length)
      }
    }
  })

  it('declares a decision on every data row, in the column the gate parses', () => {
    for (const table of tables) {
      for (const row of table.rows) {
        const isSeparator = row.cells.every((cell) => /^-*$/.test(cell.trim()))
        if (isSeparator) continue
        // cells[0] is the empty string before the first pipe; cells[3] is the
        // Decision column the coverage gate reads (scripts/check-parity-coverage.mjs).
        expect(
          row.cells[3] ?? '',
          `docs/PARITY.md line ${row.line} does not name a decision in column 4 — ` +
            'the coverage gate cannot count this row',
        ).toMatch(DECISION)
      }
    }
  })
})
