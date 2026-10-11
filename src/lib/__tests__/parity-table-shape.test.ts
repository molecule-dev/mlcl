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
 * same test the coverage gate applies before it accepts a row. The gate's own
 * split is the raw `line.split('|')` (it does not honor `\|`), so a third
 * assertion below reads the row the way the GATE does: an escaped pipe that is
 * content to GFM is a cell boundary to the gate, and an escape left of the
 * Decision column silently drops the row from the gate's coverage.
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
  rows: Array<{ line: number; cells: string[]; raw: string }>
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
    current.rows.push({ line: index + 1, cells, raw: line })
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

  it('still names a decision under the GATE’S own split — which does not honor \\|', () => {
    // The two assertions above split cells the way GFM does (an escaped `\|`
    // is content), but scripts/check-parity-coverage.mjs splits on EVERY `|`
    // with no escape handling: a row whose escape sits LEFT of the Decision
    // column passed both of them while the gate's raw split shifted
    // `cells[3]`, the row failed the gate's decision filter, and it was
    // silently dropped — the exact drop this file exists to prevent, invisible
    // to a parser the gate does not use. This pins the parse the gate
    // ACTUALLY applies, so a row the gate would drop fails here.
    const lines = readFileSync(PARITY_PATH, 'utf-8').split('\n')
    let checked = 0
    for (const table of tables) {
      for (const row of table.rows) {
        const isSeparator = row.cells.every((cell) => /^-*$/.test(cell.trim()))
        if (isSeparator) continue
        checked++
        // The gate's own parse: every `|` is a boundary, escaped or not.
        const cells = row.raw.split('|').map((cell) => cell.trim())
        expect(
          cells[3] ?? '',
          `docs/PARITY.md line ${row.line} carries no decision in the column the ` +
            'coverage gate reads with its raw `|` split — the gate silently drops ' +
            'the row (check-parity-coverage.mjs reads cells[3] of a plain ' +
            "line.split('|')). A literal `|` must stay RIGHT of the Decision " +
            'column (or the gate taught to honor `\\|`) — see the escaped CLI ' +
            'examples already in this table for the shape that works',
        ).toMatch(DECISION)
      }
    }
    // Non-vacuousness: the fleet's table has data rows for this to walk, and
    // the escaped-pipe rows the doc already ships are what make the two parsers
    // genuinely differ — an escape-free table would pass both parsers without
    // this check ever having been at stake.
    expect(checked).toBeGreaterThan(0)
    expect(
      lines.some((line) => line.includes('\\|')),
      'the fixture must still exercise the two parsers’ one difference (an escaped pipe)',
    ).toBe(true)
  })
})
