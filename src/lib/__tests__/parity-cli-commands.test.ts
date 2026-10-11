// @vitest-environment node
/**
 * docs/PARITY.md's CLI column names the command a reader should run, and its
 * MCP column names the tool an agent should call. Both are claims about the
 * code, and nothing checked them: the companion gate
 * (`scripts/check-parity-coverage.mjs`) only matches ROUTES against rows, so a
 * cell naming a command that does not exist — `deploy workflow github | gitlab`
 * (the real commands are `workflow-github` / `workflow-gitlab`), `db backup
 * list/create/restore` (the real commands are `db backup-list`, `db backup`,
 * `db restore <backupId>`) — reads as covered parity while the invocation the
 * reader copies fails with "command not found". The same blindness hid a
 * documented invocation the CLI cannot parse (`team invite <email> --role` — the
 * email is the required `--email` FLAG, and that command declares neither args
 * nor `strict = false`).
 *
 * So each cell is checked against the code it describes:
 *
 * - Every command phrase resolves to a real oclif command id, derived from the
 *   `src/commands/**` tree the way oclif derives it (directory path joined by
 *   spaces; `index.ts` is the directory itself). The `/`-and-`|` shorthand the
 *   table uses (`token create/list/revoke`, `sandbox start | stop | restart`)
 *   is expanded, carrying the leading words forward as the command prefix.
 * - Every `--flag` a span names appears in that span's command source, and a
 *   positional placeholder (`<x>` / `[x]` that does not belong to a flag)
 *   requires the command to accept positionals at all (`static override args`,
 *   or `strict = false` like `sandbox exec`).
 * - Every tool name an MCP cell names is registered by `mcp/src/server.ts`, and
 *   no registered tool has been dropped from the manifest.
 *
 * What this gate does NOT do (and cannot): judge that a row names the RIGHT
 * existing command for its capability (`db info` vs `db tables`), or that a row
 * which HAS an MCP tool says so. Those stay review decisions; the assertions
 * here only refuse cells that are provably not about the code.
 *
 * @module
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const MLCL = join(import.meta.dirname, '..', '..', '..')
const PARITY_PATH = join(MLCL, 'docs', 'PARITY.md')
const COMMANDS_DIR = join(MLCL, 'src', 'commands')
const MCP_SERVER = join(MLCL, 'mcp', 'src', 'server.ts')

interface Row {
  line: number
  cells: string[]
}

interface Table {
  headerLine: number
  header: string[]
  rows: Row[]
}

/** Split a row the way GFM does — `\|` is content, every other `|` a boundary. */
function splitCells(line: string): string[] {
  return line.split(/(?<!\\)\|/)
}

/** Every table in the manifest, with its header (trimmed) and data rows. */
function readTables(): Table[] {
  const tables: Table[] = []
  let current: Table | null = null
  readFileSync(PARITY_PATH, 'utf-8')
    .split('\n')
    .forEach((line, index) => {
      if (!line.startsWith('|')) {
        current = null
        return
      }
      const cells = splitCells(line)
      if (current === null) {
        current = { headerLine: index + 1, header: cells.map((cell) => cell.trim()), rows: [] }
        tables.push(current)
        return
      }
      if (cells.every((cell) => /^-*$/.test(cell.trim()))) return
      current.rows.push({ line: index + 1, cells })
    })
  return tables
}

/**
 * Every oclif command id in this repo, derived the way oclif derives it from
 * the command tree: `deploy/workflow-github.ts` → `deploy workflow-github`,
 * `logs/index.ts` → `logs`, `env/get.ts` → `env get`.
 *
 * A command's declared `aliases` count too — three of them are the TOP-LEVEL
 * names the manifest uses (`auth/login.ts` carries `aliases = ['login']`, and
 * `mlcl login` is the documented invocation), so an alias-blind id set would
 * report the manifest's own commands as missing.
 */
function commandIds(): Set<string> {
  const ids = new Set<string>()
  const addAliases = (source: string): void => {
    const declared = source.match(/static(?:\s+override)?\s+aliases\s*=\s*\[([^\]]*)\]/)
    for (const alias of declared?.[1]?.matchAll(/'([^']+)'/g) ?? []) ids.add(alias[1] ?? '')
  }
  const walk = (dir: string, prefix: string[]): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(join(dir, entry.name), [...prefix, entry.name])
        continue
      }
      if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) continue
      const base = entry.name.slice(0, -'.ts'.length)
      const words = base === 'index' ? prefix : [...prefix, base]
      if (words.length > 0) ids.add(words.join(' '))
      addAliases(readFileSync(join(dir, entry.name), 'utf-8'))
    }
  }
  walk(COMMANDS_DIR, [])
  return ids
}

/** The tool names `mcp/src/server.ts` registers (its own `registerTool` calls). */
function mcpToolNames(): Set<string> {
  const source = readFileSync(MCP_SERVER, 'utf-8')
  return new Set([...source.matchAll(/registerTool\(\s*'([a-z0-9_]+)'/g)].map((m) => m[1]))
}

/** The `` `…` `` spans of a cell — the code it shows. */
function codeSpans(cell: string): string[] {
  return [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1])
}

interface Token {
  text: string
  /** A flag token (`--x`, `[-x]`, the bare `--`) — never a command word. */
  flag: boolean
  /** A placeholder (`<x>`, `[x]`) — a value, not a command word. */
  placeholder: boolean
  /** An ALL_CAPS env-var name (`MOLECULE_TOKEN`) — not a command word. */
  envVar: boolean
}

const isFlagText = (text: string): boolean => /^\[?-/.test(text)

function tokenize(segment: string): Token[] {
  return segment
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => ({
      text,
      flag: isFlagText(text),
      placeholder: /^[[<].*[\]>]$/.test(text) && !isFlagText(text),
      envVar: /^[A-Z][A-Z0-9_]*$/.test(text),
    }))
}

const words = (tokens: Token[]): string[] =>
  tokens.filter((t) => !t.flag && !t.placeholder && !t.envVar).map((t) => t.text)

interface SpanClaim {
  /** Command ids this span names, e.g. `deploy workflow-github`. */
  commands: string[]
  /** Flag names this span names, without their dashes. */
  flags: string[]
  /** The commands this span shows a POSITIONAL placeholder on (`<x>` / `[x]`). */
  positionalOn: string[]
}

/**
 * The commands one backticked span names, expanding the table's shorthand.
 *
 * The first `|`/`/`-separated segment carries the leading words (`token
 * create/list/revoke` → `token create`, `token list`, `token revoke`); a later
 * segment inherits all but its last word as the prefix, so one command id per
 * segment comes out. Flags stay attributed to the span that shows them, because
 * a cell can show a flag beside a different command's prose (`env check`'s
 * `--fix` sits in its own span) — but a POSITIONAL placeholder is attributed to
 * its own segment's command, so `db backup-list | db backup | db restore
 * <backupId>` demands args only of `db restore`.
 */
function spanClaim(span: string): SpanClaim {
  const commands = new Set<string>()
  const flags = new Set<string>()
  const positionalOn = new Set<string>()
  const segments = span
    .replace(/\\\|/g, ' | ')
    .split(/[|/]/)
    .map((segment) => segment.trim())
    .filter(Boolean)
  const tokensPerSegment = segments.map(tokenize)
  const head = words(tokensPerSegment[0] ?? [])
  if (head.length > 0) commands.add(head.join(' '))
  const prefix = head.slice(0, -1)
  const commandPerSegment = tokensPerSegment.map((tokens, index) => {
    if (index === 0) return head.join(' ')
    const tail = words(tokens)
    return tail.length > 0 ? [...prefix, ...tail].join(' ') : ''
  })
  for (const [index, tokens] of tokensPerSegment.entries()) {
    for (const [position, token] of tokens.entries()) {
      if (token.flag) {
        // `--flag`, `[-f]` and the bracketed long form `[--flag]` all name the
        // same flag: strip the brackets and every leading dash.
        const name = token.text.replace(/^\[+/, '').replace(/^-+/, '').replace(/\]+$/, '')
        if (name) flags.add(name)
        continue
      }
      if (token.placeholder) {
        // A placeholder right after a flag is that flag's VALUE
        // (`--project <id>`); anywhere else it is a positional argument.
        const previous = tokens[position - 1]?.text ?? ''
        const command = commandPerSegment[index] ?? ''
        if (!isFlagText(previous) && command) positionalOn.add(command)
      }
    }
  }
  return { commands: [...commands], flags: [...flags], positionalOn: [...positionalOn] }
}

/** The source file an oclif command id resolves to, or undefined. */
function commandSource(id: string): string | undefined {
  const parts = id.split(' ')
  for (const candidate of [
    join(COMMANDS_DIR, ...parts) + '.ts',
    join(COMMANDS_DIR, ...parts, 'index.ts'),
  ]) {
    try {
      return readFileSync(candidate, 'utf-8')
    } catch (_error) {
      // Not this shape — try the next.
    }
  }
  return undefined
}

describe('docs/PARITY.md names real CLI commands', () => {
  const tables = readTables()
  const ids = commandIds()

  it('has CLI cells to check', () => {
    expect(tables.some((table) => table.header.includes('CLI'))).toBe(true)
    expect(ids.size, 'the command tree must yield command ids').toBeGreaterThan(50)
  })

  it('names only commands that exist, expanded from the table shorthand', () => {
    let checked = 0
    for (const table of tables) {
      const cliIndex = table.header.indexOf('CLI')
      if (cliIndex === -1) continue
      for (const row of table.rows) {
        for (const span of codeSpans(row.cells[cliIndex] ?? '')) {
          for (const command of spanClaim(span).commands) {
            checked++
            const top = command.split(' ')[0] ?? ''
            expect(
              ids.has(command),
              `docs/PARITY.md line ${row.line} names "mlcl ${command}", which is not a command — ` +
                `this repo has: ${[...ids].filter((id) => id.startsWith(top)).join(', ')}`,
            ).toBe(true)
          }
        }
      }
    }
    // Non-vacuous: an empty or unparsed CLI column would satisfy nothing above.
    expect(checked, 'the CLI column must yield commands to check').toBeGreaterThan(30)
  })

  it('names flags the command declares, and uses placeholders the command accepts', () => {
    let checked = 0
    for (const table of tables) {
      const cliIndex = table.header.indexOf('CLI')
      if (cliIndex === -1) continue
      for (const row of table.rows) {
        for (const span of codeSpans(row.cells[cliIndex] ?? '')) {
          const { commands, flags, positionalOn } = spanClaim(span)
          for (const command of commands) {
            const source = commandSource(command)
            if (source === undefined) continue // the existence test above reports it
            checked++
            for (const flag of flags) {
              expect(
                source.includes(flag),
                `docs/PARITY.md line ${row.line} shows "--${flag}" on "mlcl ${command}", ` +
                  'which declares no such flag',
              ).toBe(true)
            }
            if (positionalOn.includes(command)) {
              expect(
                source.includes('static override args') ||
                  source.includes('static override strict'),
                `docs/PARITY.md line ${row.line} shows a positional argument on ` +
                  `"mlcl ${command}", which accepts none — a value shown positionally must be a ` +
                  'flag value (write it as `--flag <value>`)',
              ).toBe(true)
            }
          }
        }
      }
    }
    expect(checked, 'the CLI column must yield commands to check').toBeGreaterThan(30)
  })
})

describe('MCP tool descriptions cross-reference tools that exist', () => {
  const tools = mcpToolNames()

  it('names only registered tools in a "See also" clause', () => {
    // The clause is what an agent reads to find the sibling call
    // (`db_info`'s pointed at `db_backup`, a tool this server never
    // registered — the call it advertises fails as an unknown tool).
    //
    // The scan reads only `description:` STRING LITERALS, never the file's
    // comments: a comment saying "see also the module note" must not be read as
    // a cross-reference. Within a clause, a token is checked when it looks like
    // a tool name (an underscore-bearing snake_case word) or is one already —
    // so prose connectors are not mistaken for tools.
    const source = readFileSync(MCP_SERVER, 'utf-8')
    const descriptions = [
      ...source.matchAll(/description:\s*(?:\n\s*)?(['"])((?:\\\\.|(?!\1)[\s\S])*?)\1/g),
    ].map((match) => match[2] ?? '')
    expect(descriptions.length, 'the server must carry tool descriptions').toBeGreaterThan(50)
    const looksLikeTool = (name: string): boolean =>
      tools.has(name) || /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/.test(name)
    let checked = 0
    for (const description of descriptions) {
      for (const clause of description.matchAll(/See also ([^.]+)\./g)) {
        for (const name of (clause[1] ?? '').split(/[\s,/]+/).filter(Boolean)) {
          if (!looksLikeTool(name)) continue
          checked++
          expect(
            tools.has(name),
            `mcp/src/server.ts advertises "See also … ${name}" but registers no such tool`,
          ).toBe(true)
        }
      }
    }
    expect(checked, 'the descriptions must yield cross-references to check').toBeGreaterThan(3)
  })
})

describe('docs/PARITY.md MCP cells name registered tools', () => {
  const tools = mcpToolNames()
  const tables = readTables()

  it('reads tool names from the server', () => {
    expect(tools.size).toBeGreaterThan(50)
  })

  it('never names a tool the server does not register', () => {
    let checked = 0
    for (const table of tables) {
      const mcpIndex = table.header.indexOf('MCP')
      if (mcpIndex === -1) continue
      for (const row of table.rows) {
        for (const span of codeSpans(row.cells[mcpIndex] ?? '')) {
          for (const name of span.split(/[|/,\s]+/).filter(Boolean)) {
            checked++
            expect(
              tools.has(name),
              `docs/PARITY.md line ${row.line} names the MCP tool "${name}", which ` +
                'mcp/src/server.ts does not register',
            ).toBe(true)
          }
        }
      }
    }
    expect(checked, 'the MCP column must yield tool names to check').toBeGreaterThan(30)
  })

  it('does not drop a registered tool from the manifest', () => {
    const manifest = readFileSync(PARITY_PATH, 'utf-8')
    for (const tool of tools) {
      expect(manifest, `docs/PARITY.md never names the MCP tool ${tool}`).toContain(tool)
    }
  })
})
