/**
 * Line-independent leak scan over the frozen migration runners.
 *
 * frozen-migrate-runners.test.ts flags a runner only when `console.` and
 * `${DATABASE_URL` share ONE line, so a console call whose template literal
 * sits on its own line (the natural way to wrap one) — or a leak built first
 * into an intermediate string — ships green while that test's doc promises
 * the fleet is "leak-free as it sits in the repo". This file re-scans the
 * same fleet on the value-flow shapes themselves, regardless of line breaks:
 *
 * - the raw URL is never interpolated — every `${…}` interpolation that
 *   references it must be exactly the sanctioned `redactDatabaseUrl(…)` call
 *   (a plain `${DATABASE_URL}`, a `.toString()`/`String(...)` wrap, a
 *   `'x' + DATABASE_URL` concatenation or an arbitrary helper wrap inside the
 *   interpolation all build the same leaky string), never passed through a
 *   stringify call (`String(DATABASE_URL)`), and never concatenated
 *   (`+ DATABASE_URL`) anywhere — building a leaky string is caught even when
 *   the console call that prints it stays clean. The interpolation scan runs
 *   on the raw source because the string/comment blanker below drops a
 *   template literal's interior — interpolations included — so a leak built
 *   inside one is invisible to every blanked-code rule;
 * - every `console.*(...)` call — however its arguments wrap across lines —
 *   may reference the URL only through `redactDatabaseUrl(...)` (string
 *   literals and comments are blanked first, so prose like "DATABASE_URL is
 *   not set" is not a reference, and neither is the sanctioned redacted
 *   hint);
 * - any runner that resolves a DATABASE_URL at all must ship the redaction
 *   helper and route the connect-failure hint through it — the same pinned
 *   call site the rendered-runner test asserts for the .tpl, held against the
 *   frozen fleet.
 *
 * @module
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const TEMPLATES_DIR = join(import.meta.dirname, '..', '..', '..', 'templates', 'apps')

/**
 * Blank out string-literal AND comment CONTENTS (delimiters kept) so only
 * code structure remains: parens inside strings can no longer desync a
 * call-boundary scan, an apostrophe in a comment's prose ("isn't") can no
 * longer open a phantom string that swallows real code, and prose that merely
 * names DATABASE_URL can no longer read as a reference. Template-literal
 * interpolations are blanked with the literal — a leaky `${DATABASE_URL}`
 * inside one is the raw scan's job (rule 1), not this one's.
 */
function blankStringsAndComments(source: string): string {
  let out = ''
  let quote: string | null = null
  let inLineComment = false
  let inBlockComment = false
  for (let i = 0; i < source.length; i++) {
    const ch = source.charAt(i)
    const next = source.charAt(i + 1)
    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false
        out += ch
      }
      continue
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false
        i++
      }
      continue
    }
    if (quote) {
      if (ch === '\\') {
        i++ // skip the escaped character (a quote, a backslash, anything)
        continue
      }
      if (ch === quote) quote = null
      continue
    }
    if (ch === '/' && next === '/') {
      inLineComment = true
      i++
      continue
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true
      i++
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch
      out += ch
      continue
    }
    out += ch
  }
  return out
}

/** Every `console.<method>( … )` call's source, arguments' strings blanked. */
function consoleCalls(source: string): string[] {
  const calls: string[] = []
  for (const start of source.matchAll(
    /\bconsole\s*\.\s*(?:log|warn|error|info|debug|trace)\s*\(/g,
  )) {
    const open = (start.index ?? 0) + start[0].length - 1
    let depth = 0
    for (let i = open; i < source.length; i++) {
      const ch = source.charAt(i)
      if (ch === '(') depth++
      if (ch === ')') {
        depth--
        if (depth === 0) {
          calls.push(source.slice(start.index ?? 0, i + 1))
          break
        }
      }
    }
  }
  return calls
}

/** The app names whose source violates one of the value-flow rules. */
function leakingRunners(runners: Array<[string, string]>): {
  leaking: string[]
  withRawUrl: number
  consoleSites: number
} {
  const leaking: string[] = []
  let withRawUrl = 0
  let consoleSites = 0
  for (const [app, source] of runners) {
    if (/const DATABASE_URL\b/.test(source)) withRawUrl++
    // Rule 1 — the raw value never enters a template literal: EVERY `${…}`
    // interpolation that references DATABASE_URL must be exactly the
    // sanctioned redactor call. This runs on the RAW source because
    // blankStringsAndComments drops a template literal's whole interior
    // (interpolations included), hiding it from the blanked-code rules below —
    // a leak built inside one (`${'x' + DATABASE_URL}`, a
    // `${formatUrl(DATABASE_URL)}` wrap) must still be caught. The exact-match
    // sanction keeps the redacted hint clean; every other content — plain,
    // member, String()-wrapped, concatenated, helper-wrapped — is the same
    // leaky string the rule exists to kill.
    for (const interpolation of source.matchAll(/\$\{([^}]*)\}/g)) {
      const inner = interpolation[1]
      if (
        /\bDATABASE_URL\b/.test(inner) &&
        !/^\s*redactDatabaseUrl\s*\(\s*DATABASE_URL\s*\)\s*$/.test(inner)
      ) {
        leaking.push(app)
      }
    }
    const code = blankStringsAndComments(source).replace(/\s+/g, ' ')
    if (
      /\bString\s*\(\s*DATABASE_URL\b\s*\)/.test(code) ||
      /\+\s*DATABASE_URL\b/.test(code) ||
      /\bDATABASE_URL\b\s*\+/.test(code)
    )
      leaking.push(app)
    // Rule 2 — inside a console call (however its arguments wrap), every
    // DATABASE_URL reference must flow through the redactor (strings and
    // comments are blanked, so prose naming the variable is not a reference).
    for (const call of consoleCalls(code)) {
      consoleSites++
      for (const match of call.matchAll(/\bDATABASE_URL\b/g)) {
        const at = match.index ?? 0
        const before = call.slice(Math.max(0, at - 20), at)
        if (!/redactDatabaseUrl\(\s*$/.test(before)) leaking.push(app)
      }
    }
  }
  return { leaking, withRawUrl, consoleSites }
}

describe('frozen migration runners — value-flow leak scan', () => {
  it('never interpolates, concatenates or console-logs the raw DATABASE_URL — on any line', async () => {
    const apps = (await readdir(TEMPLATES_DIR)).sort()
    const runners: Array<[string, string]> = []
    for (const app of apps) {
      const path = join(TEMPLATES_DIR, app, 'api', 'src', 'scripts', 'migrate.ts')
      try {
        runners.push([app, await readFile(path, 'utf-8')])
      } catch (_error) {
        // readFile throws when the template ships no runner — database-less
        // templates are out of scope.
      }
    }
    // The scan must actually cover the fleet, or the assertion is vacuous.
    expect(runners.length).toBeGreaterThanOrEqual(150)

    const { leaking, withRawUrl, consoleSites } = leakingRunners(runners)
    // Non-vacuousness: the fleet does carry runners that resolve a URL and
    // console sites to scan — if either drops to zero, the rules above are
    // matching nothing.
    expect(withRawUrl).toBeGreaterThanOrEqual(1)
    expect(consoleSites).toBeGreaterThanOrEqual(1)
    expect(leaking).toEqual([])
  })

  it('every runner that resolves DATABASE_URL ships the redaction helper and routes the hint through it', async () => {
    const apps = (await readdir(TEMPLATES_DIR)).sort()
    const checked: string[] = []
    for (const app of apps) {
      const path = join(TEMPLATES_DIR, app, 'api', 'src', 'scripts', 'migrate.ts')
      let source: string
      try {
        source = await readFile(path, 'utf-8')
      } catch (_error) {
        continue
      }
      if (!/const DATABASE_URL\b/.test(source)) continue
      checked.push(app)
      expect(source).toContain('function redactDatabaseUrl')
      expect(source).toContain('redactDatabaseUrl(DATABASE_URL)')
    }
    // Non-vacuousness: at least one frozen copy is the rendered shape today;
    // the rest are the delegate shape, which resolves no URL at all.
    expect(checked.length).toBeGreaterThanOrEqual(1)
  })

  it('the runner TEMPLATES the custom scaffold renders are leak-free under the same value-flow rules', async () => {
    // migrate-runner.test.ts's rendered-runner check uses the same-line filter
    // this file exists because of — and the fleet scan above reads only the
    // frozen copies. The `templates/api/*.tpl` sources are the runners every
    // custom `mlcl create` renders, so a wrapped template literal or an
    // intermediate-string leak introduced THERE would ship green into every
    // scaffolded project. Scan them with the same value-flow rules.
    const templatesDir = join(import.meta.dirname, '..', '..', '..', 'templates', 'api')
    const scanned: Array<[string, string]> = [
      ['migrate.ts.tpl', await readFile(join(templatesDir, 'migrate.ts.tpl'), 'utf-8')],
      [
        'migrate-outofband.ts.tpl',
        await readFile(join(templatesDir, 'migrate-outofband.ts.tpl'), 'utf-8'),
      ],
    ]
    const { leaking, withRawUrl, consoleSites } = leakingRunners(scanned)
    // Non-vacuousness: the Postgres template resolves a URL and carries
    // console sites, so the rules above are matching real surface.
    expect(withRawUrl).toBeGreaterThanOrEqual(1)
    expect(consoleSites).toBeGreaterThanOrEqual(1)
    expect(leaking).toEqual([])
    // …and the Postgres template ships the redaction helper and routes the
    // connect-failure hint through it (the sanctioned call site rule 1
    // excepts), the same pin the rendered-runner test asserts.
    const postgres = scanned.find(([name]) => name === 'migrate.ts.tpl')!
    expect(postgres[1]).toContain('function redactDatabaseUrl')
    expect(postgres[1]).toContain('redactDatabaseUrl(DATABASE_URL)')
  })

  it('the scan catches the shapes the same-line filter missed', () => {
    // The two leak shapes frozen-migrate-runners.test.ts's line filter ships
    // green on (its `${DATABASE_URL` and `console.` must share a line):
    const multiLine = [
      'const DATABASE_URL = resolveDatabaseUrl()',
      'console.error(',
      '  `  Check DATABASE_URL in .env: ${DATABASE_URL}`,',
      ')',
    ].join('\n')
    const indirect = [
      'const DATABASE_URL = resolveDatabaseUrl()',
      'const hint = `connection: ${DATABASE_URL}`',
      "console.error('hint: ' + 'DATABASE_URL is not set')",
    ].join('\n')
    // The value-flow shapes past the plain `${DATABASE_URL}`: an interpolation
    // that only STARTS with the identifier, and a String() wrap — both build
    // the same leaky intermediate string the rule exists to kill.
    const memberInterpolation = [
      'const DATABASE_URL = resolveDatabaseUrl()',
      'const hint = `connection: ${DATABASE_URL.toString()}`',
      "console.error('hint: ' + 'built elsewhere')",
    ].join('\n')
    const stringWrapped = [
      'const DATABASE_URL = resolveDatabaseUrl()',
      "const hint = 'connection: ' + String(DATABASE_URL)",
      "console.error('hint: ' + 'built elsewhere')",
    ].join('\n')
    // …and the shapes only the raw interpolation rule can see: the blanker
    // drops a template literal's whole interior, so an interpolation whose
    // content merely CONTAINS the identifier — a concatenation or an
    // arbitrary-helper wrap, neither of which BEGINS with it — shipped green
    // on every other rule while building the same leaky string.
    const concatInInterpolation = [
      'const DATABASE_URL = resolveDatabaseUrl()',
      'const hint = `connection: ${"jdbc:" + DATABASE_URL}`',
      "console.error('hint: ' + 'built elsewhere')",
    ].join('\n')
    const wrappedInInterpolation = [
      'const DATABASE_URL = resolveDatabaseUrl()',
      'const hint = `connection: ${formatUrl(DATABASE_URL)}`',
      "console.error('hint: ' + 'built elsewhere')",
    ].join('\n')
    // …and the sanctioned shapes it must NOT flag: the redacted hint
    // (interpolating the REDACTED value across lines, or passing it as a bare
    // argument) and prose that merely names the variable.
    const redacted = [
      'const DATABASE_URL = resolveDatabaseUrl()',
      'console.error(',
      '  `  Check DATABASE_URL in .env: ${redactDatabaseUrl(DATABASE_URL)}`,',
      ')',
      'console.error(redactDatabaseUrl(DATABASE_URL))',
      "console.error('DATABASE_URL is not set')",
    ].join('\n')
    const asRunner = (source: string): Array<[string, string]> => [['fixture', source]]
    expect(leakingRunners(asRunner(multiLine)).leaking).toEqual(['fixture'])
    expect(leakingRunners(asRunner(indirect)).leaking).toEqual(['fixture'])
    expect(leakingRunners(asRunner(memberInterpolation)).leaking).toEqual(['fixture'])
    expect(leakingRunners(asRunner(stringWrapped)).leaking).toEqual(['fixture'])
    expect(leakingRunners(asRunner(concatInInterpolation)).leaking).toEqual(['fixture'])
    expect(leakingRunners(asRunner(wrappedInInterpolation)).leaking).toEqual(['fixture'])
    expect(leakingRunners(asRunner(redacted)).leaking).toEqual([])
  })
})
