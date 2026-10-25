/**
 * Analyse the SQL a scaffold will apply and decide whether the selected
 * database provider can honour it — the compiler-side half of the SQL
 * compatibility contract.
 *
 * Every `@molecule/api-resource-*` package publishes Postgres-dialect setup SQL
 * (`src/__setup__/*.sql`, replayed by the generated runner's `__setup__` step),
 * and so do several feature/utility/provider packages. Non-Postgres bonds
 * translate syntax as they apply it, but some constructs carry SEMANTICS a
 * provider cannot reproduce. DuckDB rejects an `ON DELETE`/`ON UPDATE`
 * referential action (`CASCADE`, `SET NULL`, `SET DEFAULT`) outright, and MySQL
 * has no partial indexes — applying a UNIQUE one as a full index enforces
 * uniqueness on every row. Refusing those combinations BEFORE writing an app is
 * compilation work, so it lives here, in the one tool every harness drives
 * through its CLI and MCP surfaces.
 *
 * The TYPES are the shared contract (`@molecule/api-database/sql-compatibility.js`):
 * the feature vocabulary, one provider's declared capability map, a requirement
 * and the discriminated diagnostic. This module imports them as types only — a
 * core package contains contracts, never a scanner — and implements the
 * engine-independent analysis. Provider differences never appear here as a name
 * map: they arrive as the selected provider's {@link SqlCapabilities}, generated
 * from the provider's own source into `registry.json`.
 *
 * @module
 */

import type {
  SqlCapabilities,
  SqlCompatibilityIssue,
  SqlCompatibilityOptions,
  SqlFeature,
  SqlRequirement,
} from '@molecule/api-database/sql-compatibility.js'

/**
 * Every feature this contract version understands, in a stable order.
 *
 * A provider's capability map is expected to cover all of them; a feature a
 * provider leaves out is treated as missing metadata (see
 * {@link checkSqlCompatibility}), never as supported.
 */
export const SQL_FEATURES = [
  'fk-referential-action',
  'partial-index',
  'unique-partial-index',
] as const satisfies readonly SqlFeature[]

/** One SQL statement located in a migration file. */
export interface SqlStatement {
  /** Statement text, including its trailing semicolon when it has one. */
  text: string
  /** 0-based offset of the statement's first character in the source. */
  start: number
  /** 0-based offset just past the statement's last character. */
  end: number
}

/** A `CREATE INDEX` statement split into the parts a translator rewrites. */
export interface ParsedCreateIndex {
  /** Whether the statement declares a UNIQUE index. */
  unique: boolean
  /** Statement text through the opening parenthesis, with any `USING <method>` removed. */
  prefix: string
  /** The original column-list text between the outer parentheses. */
  columns: string
  /** The original text after the closing parenthesis (contains the `WHERE` clause when partial). */
  afterClose: string
  /** The predicate after `WHERE`, or `null` for a non-partial index. */
  predicate: string | null
  /** The original text after the predicate (normally `;`), or `null` for a non-partial index. */
  afterPredicate: string | null
  /** Any index options between the closing parenthesis and `WHERE` (`WITH`, `INCLUDE`), trimmed. */
  optionsBeforeWhere: string
}

/** A dollar-quote opener: `$$` or `$tag$`. */
const DOLLAR_QUOTE = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/

/** `CREATE [UNIQUE] INDEX [IF NOT EXISTS] <name> ON <table>` up to the next token. */
const CREATE_INDEX_HEAD =
  /^\s*CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"(?:[^"]|"")*"|[A-Za-z_][\w$-]*)\s+ON\s+(?:"(?:[^"]|"")*"|[A-Za-z_][\w$.-]*)\s*/i

/** `USING <method>` — an index access method, which DuckDB has no equivalent for. */
const USING_METHOD = /^USING\s+([A-Za-z_][A-Za-z0-9_]*)\s*/i

/** An unsupported foreign-key referential action. */
const FK_REFERENTIAL_ACTION = /\bON\s+(DELETE|UPDATE)\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT)\b/gi

/**
 * Split a migration file into statements, keeping each statement's exact text
 * and offsets.
 *
 * A semicolon ends a statement only outside a single-quoted string, a
 * double-quoted identifier, a dollar-quoted body, a line comment and a block
 * comment — so a predicate or comment containing `;` never splits a statement
 * the engine would run whole. The returned text includes the trailing
 * semicolon; concatenating every `text` reproduces the input byte for byte.
 *
 * @param sql - The migration file's SQL.
 * @returns The statements in source order.
 */
export const splitSqlStatements = (sql: string): SqlStatement[] => {
  const statements: SqlStatement[] = []
  let start = 0
  let index = 0
  const length = sql.length
  while (index < length) {
    const char = sql[index]
    if (char === '-' && sql[index + 1] === '-') {
      const newline = sql.indexOf('\n', index)
      index = newline < 0 ? length : newline
      continue
    }
    if (char === '/' && sql[index + 1] === '*') {
      const close = sql.indexOf('*/', index + 2)
      index = close < 0 ? length : close + 2
      continue
    }
    if (char === "'") {
      index++
      while (index < length) {
        if (sql[index] === '\\') {
          index += 2
          continue
        }
        if (sql[index] === "'" && sql[index + 1] === "'") {
          index += 2
          continue
        }
        if (sql[index] === "'") {
          index++
          break
        }
        index++
      }
      continue
    }
    if (char === '"') {
      index++
      while (index < length) {
        if (sql[index] === '"' && sql[index + 1] === '"') {
          index += 2
          continue
        }
        if (sql[index] === '"') {
          index++
          break
        }
        index++
      }
      continue
    }
    if (char === '$') {
      const opener = DOLLAR_QUOTE.exec(sql.slice(index))
      if (opener) {
        const tag = opener[0]
        const close = sql.indexOf(tag, index + tag.length)
        index = close < 0 ? length : close + tag.length
        continue
      }
    }
    if (char === ';') {
      index++
      statements.push({ text: sql.slice(start, index), start, end: index })
      start = index
      continue
    }
    index++
  }
  if (start < length) {
    statements.push({ text: sql.slice(start, length), start, end: length })
  }
  return statements
}

/**
 * Replace comment and string-literal CONTENT with spaces, keeping every offset
 * (and every double-quoted identifier) in place.
 *
 * Keyword and parenthesis scanning then cannot be fooled by text inside a
 * comment or a literal, while a slice taken from the mask still addresses the
 * same characters in the original.
 *
 * @param text - The SQL text to mask.
 * @returns A same-length string safe for structural scanning.
 */
const maskSql = (text: string): string => {
  let masked = ''
  let index = 0
  const length = text.length
  while (index < length) {
    const char = text[index]
    if (char === '-' && text[index + 1] === '-') {
      while (index < length && text[index] !== '\n') {
        masked += ' '
        index++
      }
      continue
    }
    if (char === '/' && text[index + 1] === '*') {
      const close = text.indexOf('*/', index + 2)
      const end = close < 0 ? length : close + 2
      masked += ' '.repeat(end - index)
      index = end
      continue
    }
    if (char === "'") {
      masked += ' '
      index++
      while (index < length) {
        if (text[index] === '\\') {
          masked += '  '
          index += 2
          continue
        }
        if (text[index] === "'" && text[index + 1] === "'") {
          masked += '  '
          index += 2
          continue
        }
        if (text[index] === "'") {
          masked += ' '
          index++
          break
        }
        masked += ' '
        index++
      }
      continue
    }
    if (char === '$') {
      const opener = DOLLAR_QUOTE.exec(text.slice(index))
      if (opener) {
        const tag = opener[0]
        const close = text.indexOf(tag, index + tag.length)
        const end = close < 0 ? length : close + tag.length
        masked += ' '.repeat(end - index)
        index = end
        continue
      }
    }
    masked += char
    index++
  }
  return masked
}

/**
 * Index of the parenthesis matching the one at `openAt`, or -1 when unbalanced.
 *
 * @param masked - Masked SQL, same length as the original.
 * @param openAt - Offset of an opening parenthesis.
 * @returns Offset of its match, or -1.
 */
const matchingParen = (masked: string, openAt: number): number => {
  let depth = 0
  for (let index = openAt; index < masked.length; index++) {
    if (masked[index] === '(') depth++
    else if (masked[index] === ')') {
      depth--
      if (depth === 0) return index
    }
  }
  return -1
}

/**
 * Split a column list at its top-level commas.
 *
 * A comma inside a function call (`lower(a, b)`) or a string literal does not
 * split — the same masking the statement splitter uses keeps offsets aligned.
 *
 * @param columns - Text between a `CREATE INDEX` statement's outer parentheses.
 * @returns Each column/expression text, trimmed.
 */
export const splitSqlColumns = (columns: string): string[] => {
  const masked = maskSql(columns)
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < masked.length; index++) {
    const char = masked[index]
    if (char === '(') depth++
    else if (char === ')') depth--
    else if (char === ',' && depth === 0) {
      parts.push(columns.slice(start, index).trim())
      start = index + 1
    }
  }
  parts.push(columns.slice(start).trim())
  return parts.filter((part) => part.length > 0)
}

/**
 * Parse a `CREATE [UNIQUE] INDEX` statement into the parts a translator rewrites.
 *
 * Returns `null` for any other statement. The returned slices are taken from
 * the ORIGINAL text, so a translator can rebuild the statement without losing
 * the author's casing or quoting.
 *
 * @param statement - One statement from {@link splitSqlStatements}.
 * @returns The parsed index, or `null` when the statement is not a `CREATE INDEX`.
 */
export const parseCreateIndexStatement = (statement: string): ParsedCreateIndex | null => {
  const masked = maskSql(statement)
  const head = CREATE_INDEX_HEAD.exec(masked)
  if (!head) return null
  let cursor = head[0].length
  const using = USING_METHOD.exec(masked.slice(cursor))
  const usingEnd = using ? cursor + using[0].length : cursor
  cursor = usingEnd
  if (masked[cursor] !== '(') return null
  const closeAt = matchingParen(masked, cursor)
  if (closeAt < 0) return null

  const beforeParen = using ? statement.slice(0, head[0].length) : statement.slice(0, cursor)
  const prefix = `${beforeParen}(`
  const columns = statement.slice(cursor + 1, closeAt)
  const afterClose = statement.slice(closeAt + 1)
  const maskedAfterClose = masked.slice(closeAt + 1)
  const whereMatch = /\bWHERE\b/i.exec(maskedAfterClose)
  if (!whereMatch) {
    return {
      unique: Boolean(head[1]),
      prefix,
      columns,
      afterClose,
      predicate: null,
      afterPredicate: null,
      optionsBeforeWhere: '',
    }
  }
  const predicateStart = closeAt + 1 + whereMatch.index + whereMatch[0].length
  const trailingSemicolon = /;\s*$/.exec(statement)
  const predicateEnd = trailingSemicolon ? trailingSemicolon.index : statement.length
  return {
    unique: Boolean(head[1]),
    prefix,
    columns,
    afterClose,
    predicate: statement.slice(predicateStart, predicateEnd).trim(),
    afterPredicate: statement.slice(predicateEnd),
    optionsBeforeWhere: statement.slice(closeAt + 1, predicateStart - whereMatch[0].length).trim(),
  }
}

/**
 * Every semantically significant construct the SQL requires.
 *
 * Comments and string literals are ignored; a construct inside them is not a
 * requirement. Foreign-key actions are reported one per clause with the action
 * normalized (`ON DELETE CASCADE`), and a partial index is reported once with
 * its predicate as the detail.
 *
 * @param sql - A migration file's SQL.
 * @param source - Where the SQL came from, copied onto every requirement.
 * @returns The requirements in source order.
 */
export const analyzeSqlRequirements = (sql: string, source?: string): SqlRequirement[] => {
  const requirements: SqlRequirement[] = []
  for (const statement of splitSqlStatements(sql)) {
    const masked = maskSql(statement.text)
    const action = new RegExp(FK_REFERENTIAL_ACTION.source, 'gi')
    let match: RegExpExecArray | null
    while ((match = action.exec(masked))) {
      const event = match[1] ?? ''
      const what = (match[2] ?? '').replace(/\s+/g, ' ').toUpperCase()
      requirements.push({
        feature: 'fk-referential-action',
        detail: `ON ${event.toUpperCase()} ${what}`,
        statement: statement.text.trim(),
        source,
      })
    }
    const index = parseCreateIndexStatement(statement.text)
    if (index?.predicate) {
      requirements.push({
        feature: index.unique ? 'unique-partial-index' : 'partial-index',
        detail: `WHERE ${index.predicate.replace(/\s+/g, ' ')}`,
        statement: statement.text.trim(),
        source,
      })
    }
  }
  return requirements
}

/**
 * Report every requirement a provider cannot honour.
 *
 * A feature the provider's map does not declare is reported as
 * `missing-capability` — absence is never read as support, because that is how
 * a provider silently loses a constraint. Duplicate constructs (three cascading
 * foreign keys in one `CREATE TABLE`) produce ONE issue each.
 *
 * @param requirements - Requirements from {@link analyzeSqlRequirements}.
 * @param capabilities - The selected provider's declaration, when it has one.
 * @param options - Provider name and source used in each issue's message.
 * @returns The issues, in requirement order; an empty array means compatible.
 */
export const checkSqlCompatibility = (
  requirements: readonly SqlRequirement[],
  capabilities: SqlCapabilities | undefined,
  options: SqlCompatibilityOptions = {},
): SqlCompatibilityIssue[] => {
  const provider = options.provider ?? 'The selected database'
  const issues: SqlCompatibilityIssue[] = []
  const seen = new Set<string>()
  for (const requirement of requirements) {
    const source = requirement.source ?? options.source
    const key = `${requirement.feature}\u0000${requirement.detail}\u0000${source ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    const capability = capabilities?.[requirement.feature]
    const location = source ? ` in ${source}` : ''
    if (!capability) {
      issues.push({
        kind: 'missing-capability',
        feature: requirement.feature,
        detail: requirement.detail,
        statement: requirement.statement,
        source,
        message:
          `${provider} declares no SQL capability for "${requirement.feature}", which ` +
          `${requirement.detail} requires${location}. The provider's registry entry must ` +
          'state how it handles this construct before an app using it can be generated.',
      })
      continue
    }
    if (capability.support === 'unsupported') {
      issues.push({
        kind: 'unsupported',
        feature: requirement.feature,
        detail: requirement.detail,
        statement: requirement.statement,
        source,
        message:
          `${provider} cannot apply ${requirement.detail}${location}` +
          `${capability.note ? ` — ${capability.note}` : '.'}`,
      })
    }
  }
  return issues
}
