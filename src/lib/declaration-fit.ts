/**
 * Fitting a long TypeScript declaration into a README's declaration budget
 * while keeping every member listed.
 *
 * A member's JSDoc is usually most of a long declaration's text. Cutting the
 * declaration at the budget drops whole members — their names, optionality and
 * types — while the comments above them survive. So comments are shortened
 * first ({@link compactDeclarationComments}); a declaration still too long is
 * cut at a member boundary and the members left out are named
 * ({@link cutAtMemberBoundary}).
 *
 * @module
 */

import { ts } from 'ts-morph'

/**
 * How {@link compactDeclarationComments} rewrites comments:
 * - `summary` — each JSDoc block becomes one line holding its first sentence
 *   (and its `@deprecated` note, when it has one); other comments are kept.
 * - `drop` — every comment is removed, with the line it stood on.
 */
export type CommentCompaction = 'summary' | 'drop'

/** Longest summary kept from one JSDoc block, in characters. */
const MAX_SUMMARY_CHARS = 160

/**
 * The first sentence of a prose run: up to a `.`, `!` or `?` that is followed
 * by the start of another sentence or by the end. `e.g.`, `i.e.`, `etc.`,
 * `vs.` and `cf.` do not end a sentence.
 */
const FIRST_SENTENCE = /^(.+?(?<!\be\.g|\bi\.e|\betc|\bvs|\bcf)[.!?])(?=\s+[A-Z`'"([]|\s*$)/

/**
 * The comment ranges of `text`, found with TypeScript's own scanner. Template
 * literal types are re-scanned the way the parser does, so a `//` inside one
 * (`` `https://${string}` ``) is never read as a comment.
 *
 * @param text - TypeScript source.
 * @returns The `[start, end)` range and kind of every comment, in order.
 */
function commentRanges(text: string): { start: number; end: number; jsdoc: boolean }[] {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, text)
  const ranges: { start: number; end: number; jsdoc: boolean }[] = []
  // Brace depth, and the depths at which an open template substitution (`${`) waits for its `}`.
  let depth = 0
  const templates: number[] = []
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    if (kind === ts.SyntaxKind.CloseBraceToken && templates.at(-1) === depth) {
      kind = scanner.reScanTemplateToken(false)
      if (kind === ts.SyntaxKind.TemplateTail) templates.pop()
      continue
    }
    if (kind === ts.SyntaxKind.TemplateHead) templates.push(depth)
    else if (kind === ts.SyntaxKind.OpenBraceToken) depth++
    else if (kind === ts.SyntaxKind.CloseBraceToken) depth--
    else if (
      kind === ts.SyntaxKind.MultiLineCommentTrivia ||
      kind === ts.SyntaxKind.SingleLineCommentTrivia
    ) {
      const start = scanner.getTokenStart()
      ranges.push({
        start,
        end: scanner.getTokenEnd(),
        jsdoc: text.startsWith('/**', start) && text[start + 3] !== '/',
      })
    }
  }
  return ranges
}

/**
 * One line standing in for a JSDoc block: its first sentence, plus its
 * `@deprecated` note when it has one.
 *
 * @param comment - The whole `/** … *\/` comment.
 * @returns The one-line comment, or `null` when the block says nothing worth keeping.
 */
function summarizeJsDoc(comment: string): string | null {
  const lines = comment
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*?\s?/, '').trimEnd())
  const tagAt = lines.findIndex((line) => line.startsWith('@'))
  const prose = (tagAt < 0 ? lines : lines.slice(0, tagAt)).join(' ').replace(/\s+/g, ' ').trim()
  const sentence = FIRST_SENTENCE.exec(prose)?.[1] ?? prose
  let summary =
    sentence.length > MAX_SUMMARY_CHARS
      ? `${sentence.slice(0, MAX_SUMMARY_CHARS - 1).trimEnd()}…`
      : sentence
  const deprecated = lines.findIndex((line) => /^@deprecated\b/.test(line))
  if (deprecated >= 0) {
    const nextTag = lines.findIndex((line, i) => i > deprecated && line.startsWith('@'))
    const note = lines
      .slice(deprecated, nextTag < 0 ? lines.length : nextTag)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    summary = summary ? `${summary} ${note}` : note
  }
  // `*/` inside the kept text would close the new comment early.
  summary = summary.replace(/\*\//g, '* /')
  return summary ? `/** ${summary} */` : null
}

/**
 * The same declaration with shorter comments.
 *
 * The result is checked against the original with TypeScript's parser: both
 * must print the same code once comments are removed. When they do not — a
 * construct this rewrite does not understand — the function refuses rather than
 * render a declaration that says something different.
 *
 * @param text - A declaration's source text (an interface, type alias, enum or class).
 * @param mode - How to rewrite the comments; see {@link CommentCompaction}.
 * @returns The rewritten declaration, or `null` when the rewrite was refused.
 */
export function compactDeclarationComments(text: string, mode: CommentCompaction): string | null {
  let out = ''
  let last = 0
  for (const range of commentRanges(text)) {
    const comment = text.slice(range.start, range.end)
    const replacement =
      mode === 'summary' ? (range.jsdoc ? summarizeJsDoc(comment) : comment) : null
    if (replacement !== null) {
      out += text.slice(last, range.start) + replacement
      last = range.end
      continue
    }
    // Removing the comment: take the line with it when nothing else is on that line.
    const lineStart = text.lastIndexOf('\n', range.start - 1) + 1
    const lineEnd = text.indexOf('\n', range.end)
    const before = text.slice(lineStart, range.start)
    const after = text.slice(range.end, lineEnd < 0 ? text.length : lineEnd)
    if (!before.trim() && !after.trim() && lineStart >= last) {
      out += text.slice(last, lineStart)
      last = lineEnd < 0 ? text.length : lineEnd + 1
    } else {
      out += text.slice(last, range.start).replace(/[ \t]+$/, '')
      last = range.end
    }
  }
  out += text.slice(last)
  return sameCode(text, out) ? out.trimEnd() : null
}

/**
 * A declaration cut after its last member that fits, with the members it
 * leaves out.
 *
 * @param text - A declaration's source text.
 * @param limit - Maximum characters to keep.
 * @returns The kept text (through the end of its last whole member) and the
 *   names of the members after it, overloads once each; `null` when the
 *   declaration is not an interface, class or object type whose members can be
 *   cut between, or when not even its first member fits.
 */
export function cutAtMemberBoundary(
  text: string,
  limit: number,
): { text: string; omitted: string[] } | null {
  const file = ts.createSourceFile(
    'declaration.ts',
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const statement = file.statements[0]
  if (!statement) return null
  const members: readonly ts.Node[] | undefined =
    ts.isInterfaceDeclaration(statement) || ts.isClassDeclaration(statement)
      ? statement.members
      : ts.isTypeAliasDeclaration(statement) && ts.isTypeLiteralNode(statement.type)
        ? statement.type.members
        : undefined
  if (!members?.length) return null
  let kept = -1
  while (kept + 1 < members.length && members[kept + 1].getEnd() <= limit) kept++
  if (kept < 0) return null
  const omitted: string[] = []
  for (const member of members.slice(kept + 1)) {
    const name = memberLabel(member, file)
    if (!omitted.includes(name)) omitted.push(name)
  }
  return { text: text.slice(0, members[kept].getEnd()), omitted }
}

/**
 * How a member is named in a list of left-out members: its name, or the kind
 * of signature it is when it has none.
 *
 * @param member - An interface, class or type-literal member.
 * @param file - The source file the member was parsed from.
 * @returns The label.
 */
function memberLabel(member: ts.Node, file: ts.SourceFile): string {
  const name = (member as { name?: ts.Node }).name
  if (name) return name.getText(file)
  if (ts.isIndexSignatureDeclaration(member)) return '[index signature]'
  if (ts.isCallSignatureDeclaration(member)) return '(call signature)'
  if (ts.isConstructSignatureDeclaration(member) || ts.isConstructorDeclaration(member))
    return 'constructor'
  return '(member)'
}

/**
 * Whether two declarations are the same code once comments are removed, as
 * TypeScript's parser and printer see them.
 *
 * @param a - The original declaration.
 * @param b - The rewritten declaration.
 * @returns `true` when the printed code is identical.
 */
function sameCode(a: string, b: string): boolean {
  const printer = ts.createPrinter({ removeComments: true })
  const print = (source: string): string =>
    printer.printFile(
      ts.createSourceFile(
        'declaration.ts',
        source,
        ts.ScriptTarget.Latest,
        false,
        ts.ScriptKind.TS,
      ),
    )
  return print(a) === print(b)
}
