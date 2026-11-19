/**
 * Source code formatting utilities for generated files.
 *
 * @module
 */

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { access, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'

import * as prettier from 'prettier'
import { ts } from 'ts-morph'

/**
 * The import groups of the scaffold's `simple-import-sort` lint rule
 * (`templates/shared/eslint.config.js.tpl`): `node:` builtins, other packages, `@molecule/*`,
 * then relative paths, each group separated by a blank line.
 */
export const SCAFFOLD_IMPORT_GROUPS: readonly (readonly string[])[] = [
  ['^node:'],
  ['^[^.]'],
  ['^@molecule/'],
  ['^\\.'],
]

const importOrder = new Intl.Collator('en', { sensitivity: 'base', numeric: true })

/**
 * `simple-import-sort`'s comparison: case-insensitive and numeric, then by code unit.
 *
 * @param a - The first string.
 * @param b - The second string.
 * @returns A negative number, zero or a positive number, as for `Array.prototype.sort`.
 */
function compareText(a: string, b: string): number {
  return importOrder.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0)
}

const PATH_PUNCTUATION: Record<string, string> = { '.': '_', '/': '-', _: '.', '-': '/' }

/**
 * The rule's sort key for a module path: `.` and `..` read as `./` and `../`, a parent
 * directory sorts before its files, and `.` and `/` sort before other punctuation, so
 * `react/jsx-runtime` precedes `react-dom` and `../../x` precedes `../x`.
 *
 * @param path - The module path.
 * @returns The key compared in place of the path.
 */
function pathKey(path: string): string {
  return path
    .replace(/^[./]*\.$/, '$&/')
    .replace(/^[./]*\/$/, '$&,')
    .replace(/[./_-]/g, (char) => PATH_PUNCTUATION[char] ?? char)
}

/** A comment in the trivia between two statements. */
interface Comment {
  start: number
  end: number
  line: boolean
}

/** One import statement of a chunk, printed with the comments that move with it. */
interface ImportItem {
  code: string
  start: number
  end: number
  path: string
  kind: 'type' | 'value'
  /** side-effect 0, namespace 1, default 2, named only 3 (the rule's order for one path). */
  style: number
  index: number
  /** The printed item ends with a line comment. */
  endsWithLineComment: boolean
}

/**
 * The comments in `text[from, to)`, which holds only whitespace and comments.
 *
 * @param text - The source.
 * @param from - The start of the trivia.
 * @param to - The end of the trivia.
 * @param stopAtCode - Stop at the first character that is neither whitespace nor a comment.
 * @returns Each comment's range.
 */
function commentsIn(text: string, from: number, to: number, stopAtCode = false): Comment[] {
  const comments: Comment[] = []
  let at = from
  if (at === 0 && text.startsWith('#!')) at = Math.max(text.indexOf('\n'), 0)
  while (at < to) {
    if (text.startsWith('//', at)) {
      const newline = text.indexOf('\n', at)
      const end = Math.min(newline < 0 ? to : newline, to)
      comments.push({ start: at, end: text[end - 1] === '\r' ? end - 1 : end, line: true })
      at = end
    } else if (text.startsWith('/*', at)) {
      const close = text.indexOf('*/', at + 2)
      const end = close < 0 ? to : Math.min(close + 2, to)
      comments.push({ start: at, end, line: false })
      at = end
    } else if (stopAtCode && !/\s/.test(text[at] ?? '')) {
      break
    } else {
      at++
    }
  }
  return comments
}

/**
 * The rule's whitespace between an import and a comment that moves with it: a run of blank
 * lines becomes one line break.
 *
 * @param whitespace - The whitespace between them.
 * @returns The whitespace without blank lines.
 */
function withoutBlankLines(whitespace: string): string {
  const items = whitespace.split(/(\r?\n)/)
  return (items.length >= 5 ? [...items.slice(0, 2), ...items.slice(-1)] : items).join('')
}

/**
 * The text of an import with its named imports in the rule's order: by imported name, then
 * local name, a `type` import before a value import of the same name. A sorted list is left
 * as written; a list to reorder is rewritten in the formatter's layout (one line, or one
 * import per line when the braces span lines), each comment moving with the import it
 * precedes.
 *
 * @param text - The source.
 * @param node - The import statement.
 * @param sourceFile - Its parsed file.
 * @param end - Where the statement's printed text ends.
 * @returns The statement's text.
 */
function printImport(
  text: string,
  node: ts.ImportDeclaration,
  sourceFile: ts.SourceFile,
  end: number,
): string {
  const start = node.getStart(sourceFile)
  const named = node.importClause?.namedBindings
  if (!named || !ts.isNamedImports(named) || named.elements.length < 2) {
    return text.slice(start, end)
  }
  const elements = [...named.elements]
  const nameOf = (name: ts.ModuleExportName): string => name.text
  const sorted = elements
    .map((element, index) => ({ element, index }))
    .sort(
      (a, b) =>
        compareText(
          nameOf(a.element.propertyName ?? a.element.name),
          nameOf(b.element.propertyName ?? b.element.name),
        ) ||
        compareText(a.element.name.text, b.element.name.text) ||
        Number(b.element.isTypeOnly) - Number(a.element.isTypeOnly) ||
        a.index - b.index,
    )
    .map(({ element }) => element)
  if (sorted.every((element, index) => element === elements[index])) return text.slice(start, end)

  const open = named.getStart(sourceFile)
  const close = named.end - 1
  const inner = text.slice(open + 1, close)
  // Each import carries the comments written before it; one written after the last import
  // stays at the end of the list.
  const withComments = (element: ts.ImportSpecifier): string =>
    text
      .slice(element.pos, element.end)
      .replace(/^[\s,]+/, '')
      .trim()
  const last = elements[elements.length - 1]
  const tail = last
    ? text
        .slice(last.end, close)
        .replace(/^\s*,?/, '')
        .trim()
    : ''
  let list: string
  if (/\r?\n/.test(inner)) {
    const indent = /\n([ \t]*)\S/.exec(inner)?.[1] ?? '  '
    const closing = /\n([ \t]*)$/.exec(inner)?.[1] ?? ''
    const lines = sorted.map((element) =>
      withComments(element)
        .split('\n')
        .map((line) => `${indent}${line.trim()}`)
        .join('\n'),
    )
    list = `\n${lines.join(',\n')},${tail ? `\n${indent}${tail}` : ''}\n${closing}`
  } else {
    list = ` ${sorted.map(withComments).join(', ')}${tail ? ` ${tail}` : ''} `
  }
  return text.slice(start, open + 1) + list + text.slice(close, end)
}

/**
 * The style the rule orders imports of one path by.
 *
 * @param node - The import statement.
 * @returns side-effect 0, namespace 1, default 2, named only 3.
 */
function importStyle(node: ts.ImportDeclaration): number {
  const clause = node.importClause
  if (!clause) return 0
  if (clause.name) return 2
  return clause.namedBindings && ts.isNamespaceImport(clause.namedBindings) ? 1 : 3
}

/**
 * Sorts one chunk of consecutive import statements as the scaffold's `simple-import-sort`
 * rule does, and returns the edit.
 *
 * @param text - The source.
 * @param chunk - The import statements.
 * @param sourceFile - Their parsed file.
 * @param groups - The rule's groups.
 * @returns The range the chunk's imports occupy and its sorted text.
 */
function sortChunk(
  text: string,
  chunk: ts.ImportDeclaration[],
  sourceFile: ts.SourceFile,
  groups: readonly (readonly RegExp[])[],
): { start: number; end: number; sorted: string } {
  const lineOf = (pos: number): number => sourceFile.getLineAndCharacterOfPosition(pos).line
  const lastNode = chunk[chunk.length - 1]
  // A semicolon-free file can start the next statement with `;` on the line after the
  // last import; that semicolon belongs to the statement, not the import.
  const ends = chunk.map((node) =>
    node === lastNode &&
    text[node.end - 1] === ';' &&
    lineOf(node.end - 1) !== lineOf(node.moduleSpecifier.end)
      ? node.moduleSpecifier.end
      : node.end,
  )
  // Where the trivia after an import ends: the next import, or the first code after the chunk.
  const nextStart = (index: number): number => {
    const following = chunk[index + 1]
    if (following) return following.getStart(sourceFile)
    const end = ends[index] ?? text.length
    const comments = commentsIn(text, end, text.length, true)
    let at = comments[comments.length - 1]?.end ?? end
    while (at < text.length && /\s/.test(text[at] ?? '')) at++
    return at
  }
  const items: ImportItem[] = chunk.map((node, index) => {
    const nodeStart = node.getStart(sourceFile)
    const end = ends[index] ?? node.end
    const previousLine = index === 0 ? lineOf(nodeStart) - 1 : lineOf(ends[index - 1] ?? 0)
    const before = commentsIn(
      text,
      index === 0 ? node.pos : (ends[index - 1] ?? 0),
      nodeStart,
    ).filter(
      (comment) =>
        lineOf(comment.start) <= lineOf(nodeStart) &&
        lineOf(comment.end) > previousLine &&
        (index > 0 || lineOf(comment.start) > previousLine),
    )
    const after = commentsIn(text, end, nextStart(index)).filter(
      (comment) => lineOf(comment.end) === lineOf(end) && comment.start >= end,
    )
    const first = before[0]?.start ?? nodeStart
    const lastComment = after[after.length - 1]
    const last = lastComment?.end ?? end
    let previous = first
    while (previous > 0 && /[ \t\r\n]/.test(text[previous - 1] ?? '')) previous--
    const leading = text.slice(previous, first).split(/\r?\n/)
    const indentation =
      previous === 0 || leading.length > 1 ? (leading[leading.length - 1] ?? '') : ''
    let next = last
    while (next < text.length && /[ \t\r\n]/.test(text[next] ?? '')) next++
    const trailing = text.slice(last, next).split(/\r?\n/)[0] ?? ''
    const code =
      indentation +
      before
        .map(
          (comment, i) =>
            text.slice(comment.start, comment.end) +
            withoutBlankLines(text.slice(comment.end, before[i + 1]?.start ?? nodeStart)),
        )
        .join('') +
      printImport(text, node, sourceFile, end) +
      after
        .map(
          (comment, i) =>
            withoutBlankLines(text.slice(after[i - 1]?.end ?? end, comment.start)) +
            text.slice(comment.start, comment.end),
        )
        .join('') +
      trailing
    return {
      code,
      start: first - indentation.length,
      end: last + trailing.length,
      path: ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : '',
      kind: node.importClause?.isTypeOnly ? 'type' : 'value',
      style: importStyle(node),
      index,
      endsWithLineComment: lastComment?.line === true,
    }
  })

  // Each import joins the group whose pattern matches the most of its key: a side-effect
  // import's path is prefixed with NUL and a type import's suffixed, as the rule does.
  const grouped = groups.map((group) => group.map((): ImportItem[] => []))
  const rest: ImportItem[] = []
  for (const item of items) {
    const key =
      item.style === 0 ? `\0${item.path}` : item.kind === 'type' ? `${item.path}\0` : item.path
    let best = rest
    let longest = -1
    for (const [g, group] of groups.entries()) {
      for (const [r, regex] of group.entries()) {
        const match = regex.exec(key)
        const target = grouped[g]?.[r]
        if (match && target && match[0].length > longest) {
          longest = match[0].length
          best = target
        }
      }
    }
    best.push(item)
  }
  const byRule = (a: ImportItem, b: ImportItem): number =>
    a.style === 0 && b.style === 0
      ? a.index - b.index
      : a.style === 0
        ? -1
        : b.style === 0
          ? 1
          : compareText(pathKey(a.path), pathKey(b.path)) ||
            compareText(a.path, b.path) ||
            compareText(a.kind, b.kind) ||
            a.style - b.style ||
            a.index - b.index
  const newline = /\r\n/.test(text) ? '\r\n' : '\n'
  const sortedGroups = [...grouped, [rest]]
    .map((group) => group.filter((items) => items.length > 0))
    .filter((group) => group.length > 0)
    .map((group) => group.map((groupItems) => [...groupItems].sort(byRule)))
  let sorted = sortedGroups
    .map((group) =>
      group.map((groupItems) => groupItems.map((item) => item.code).join(newline)).join(newline),
    )
    .join(newline + newline)

  const lastSorted = sortedGroups.flat(2).at(-1)
  const lastOriginal = items[items.length - 1]
  if (lastSorted?.endsWithLineComment && lastOriginal) {
    // A line comment now ending the block would swallow code that follows on its line.
    const following = text.slice(lastOriginal.end).split(/\r?\n/)[0] ?? ''
    if (following.trim() !== '') sorted += newline
  }
  return { start: items[0]?.start ?? 0, end: lastOriginal?.end ?? 0, sorted }
}

/**
 * Sort a TS/JS file's imports exactly as the scaffold's `simple-import-sort` rule does
 * ({@link SCAFFOLD_IMPORT_GROUPS}), so generated files lint clean: every run of consecutive
 * imports is grouped and ordered, side-effect imports keep their order at the head of the
 * package group, named imports are ordered inside their braces, and comments move with the
 * import they belong to.
 *
 * @param content - The file's source.
 * @param fileName - The path the content is written to: a `.tsx`/`.jsx` name parses JSX.
 * @returns The source with sorted imports.
 */
export function sortImportStatements(content: string, fileName: string): string {
  const kind = /\.[jt]sx$/.test(fileName) ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true, kind)
  const groups = SCAFFOLD_IMPORT_GROUPS.map((group) =>
    group.map((source) => new RegExp(source, 'u')),
  )
  const chunks: ts.ImportDeclaration[][] = []
  const collect = (statements: readonly ts.Statement[]): void => {
    let chunk: ts.ImportDeclaration[] = []
    for (const statement of statements) {
      if (ts.isImportDeclaration(statement)) {
        chunk.push(statement)
        continue
      }
      if (chunk.length > 0) chunks.push(chunk)
      chunk = []
      if (ts.isModuleDeclaration(statement) && statement.body && ts.isModuleBlock(statement.body)) {
        collect(statement.body.statements)
      }
    }
    if (chunk.length > 0) chunks.push(chunk)
  }
  collect(sourceFile.statements)
  let result = content
  for (const chunk of chunks.reverse()) {
    const { start, end, sorted } = sortChunk(content, chunk, sourceFile, groups)
    result = result.slice(0, start) + sorted + result.slice(end)
  }
  return result
}

/**
 * Prettier config shared by all generated projects. Used only for a file no config applies to:
 * every generated package writes this same config as its `.prettierrc`, and that file wins.
 */
const PRETTIER_CONFIG: prettier.Options = {
  singleQuote: true,
  semi: false,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  arrowParens: 'always',
  endOfLine: 'lf',
}

/**
 * Format generated source containing arbitrary contract values with its target's rules.
 * Parser failures remain errors so a broken emission cannot appear formatter-clean.
 * @param content - The generated source.
 * @param filePath - Its eventual absolute destination.
 * @returns Source formatted with the destination's Prettier configuration.
 */
export async function formatGeneratedSource(content: string, filePath: string): Promise<string> {
  const config =
    (await prettier.resolveConfig(filePath, { editorconfig: true, useCache: false })) ??
    PRETTIER_CONFIG
  // A generator may format before creating the destination directory. Resolve packages from
  // its nearest existing ancestor, where Node would begin finding installed plugins anyway.
  let directory = dirname(resolve(filePath))
  while (!existsSync(directory)) directory = dirname(directory)
  const plugins = resolvePackagePlugins(config.plugins, directory, new Map())
  return prettier.format(content, { ...config, plugins, filepath: filePath })
}

/**
 * File extensions that Prettier formats. The same set any later `prettier --write` over the
 * project (an editor, a pre-commit hook, a platform's deploy) formats, so a freshly generated
 * project gives none of them work to do.
 */
const FORMATTABLE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
  '.json',
  '.css',
  '.scss',
  '.less',
  '.html',
  '.vue',
  '.svelte',
  '.md',
  '.mdx',
  '.yaml',
  '.yml',
  '.graphql',
  '.gql',
])

/** Passes before giving up on a file whose formatting does not settle (see below). */
const MAX_FORMAT_PASSES = 4

/** Directories to skip when discovering files. */
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'icons', 'fonts', '__setup__'])

/**
 * The directory a `prettier` run over this file starts in: the nearest one, from the file's own
 * directory up to the project root, that holds a `package.json` (a package's own scripts, an
 * editor and a per-package formatter run all start there). Its `.gitignore` and `.prettierignore`
 * decide whether the file is formatted at all, exactly as the Prettier CLI reads them.
 */
async function formatterRoot(filePath: string, projectPath: string): Promise<string> {
  const root = resolve(projectPath)
  for (let dir = dirname(resolve(filePath)); ; dir = dirname(dir)) {
    if (await exists(join(dir, 'package.json'))) return dir
    if (dir === root || dir === dirname(dir)) return root
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch (_error) {
    // Absent (or unreadable): the caller keeps walking up to the next directory.
    return false
  }
}

/**
 * Format all generated files in a project directory using Prettier's JS API — mlcl's own
 * Prettier, so nothing has to be installed in the project first.
 *
 * Recursively discovers formattable files (the extensions above), skipping node_modules, dist,
 * and asset directories. Each file is formatted the way `prettier --write` run from its package
 * formats it: with the config that applies at the file's path (its `.prettierrc`, an
 * `.editorconfig`), falling back to {@link PRETTIER_CONFIG} only when none does, and not at all
 * when that package's `.gitignore` or `.prettierignore` excludes it. A file is written only when
 * Prettier changes it, and is formatted to a fixed point: Prettier is not idempotent for every
 * input (a fenced code block in markdown can lose a blank line on the second pass), and a file
 * one pass leaves behind is still rewritten by the next `prettier --write`.
 *
 * Pass `only` when the project existed before the command ran (`mlcl inject`, `mlcl swap`):
 * the files the command wrote are formatted and the project's own files are left as they are.
 *
 * @param projectPath - Absolute path to the project root (e.g., `molecule-dev/api`).
 * @param only - Absolute paths of the files to format; omitted, every formattable file is.
 * @returns Number of files that were reformatted.
 */
export async function formatGeneratedFiles(
  projectPath: string,
  only?: readonly string[],
): Promise<number> {
  return (await formatPass(projectPath, true, only)).length
}

/**
 * The files {@link formatGeneratedFiles} would rewrite, without writing any: what a
 * `prettier --write` over the project would change. A scaffold that needs no formatting returns
 * an empty list.
 *
 * @param projectPath - Absolute path to the project root.
 * @returns Paths relative to `projectPath`, sorted.
 * @throws When a file or its formatter configuration cannot be checked.
 */
export async function unformattedGeneratedFiles(projectPath: string): Promise<string[]> {
  return (await formatPass(projectPath, false)).map((path) => relative(projectPath, path)).sort()
}

async function formatPass(
  projectPath: string,
  write: boolean,
  only?: readonly string[],
): Promise<string[]> {
  const files = only
    ? [...new Set(only)].filter(
        (file) =>
          FORMATTABLE_EXTENSIONS.has(extname(file)) &&
          !relative(projectPath, file)
            .split(/[\\/]/)
            .some((segment) => SKIP_DIRS.has(segment)) &&
          existsSync(file),
      )
    : await discoverFiles(projectPath)
  const changed: string[] = []
  const pluginPaths = new Map<string, string>()

  for (const filePath of files) {
    const content = await readFile(filePath, 'utf-8')
    const ext = extname(filePath)
    try {
      const cwd = await formatterRoot(filePath, projectPath)
      const info = await prettier.getFileInfo(filePath, {
        ignorePath: [join(cwd, '.gitignore'), join(cwd, '.prettierignore')],
        resolveConfig: false,
      })
      if (info.ignored) continue
      const config = await prettier.resolveConfig(filePath, { editorconfig: true })
      const plugins = resolvePackagePlugins(config?.plugins, cwd, pluginPaths)
      if (!info.inferredParser && !config?.parser && !plugins?.length) continue
      const options = { ...(config ?? PRETTIER_CONFIG), plugins, filepath: filePath }
      let result = content
      for (let pass = 0; pass < MAX_FORMAT_PASSES; pass++) {
        const next = await prettier.format(result, options)
        if (next === result) break
        result = next
      }
      if (result !== content) {
        if (write) await writeFile(filePath, result)
        changed.push(filePath)
      }
    } catch (error) {
      const rel = relative(projectPath, filePath)
      // A check must not turn a parser/configuration failure into a false clean result.
      if (!write) throw new Error(`prettier: could not check ${rel}`, { cause: error })
      // Writes retain the existing best-effort behavior for malformed files.
      console.warn(`  prettier: skipped ${rel} (${ext} parse error)`, error)
    }
  }

  return changed
}

/**
 * Use Node's import resolver, including import-only exports, from the package's own cwd.
 *
 * A plugin the package's `.prettierrc` names but has not installed yet (`mlcl create`
 * formats before `npm install`) resolves from mlcl's own dependencies instead, so a fresh
 * Svelte app's components are formatted on the first pass rather than skipped. A plugin
 * neither has is an error naming it.
 */
function resolvePackagePlugins(
  plugins: prettier.Options['plugins'],
  cwd: string,
  cache: Map<string, string>,
): prettier.Options['plugins'] {
  const key = (plugin: string): string => JSON.stringify([cwd, plugin])
  const missing = [
    ...new Set(plugins?.filter((plugin): plugin is string => typeof plugin === 'string')),
  ].filter((plugin) => !cache.has(key(plugin)))
  if (missing.length) {
    // Prettier imports plugins with ESM conditions and resolves them from process.cwd(). A
    // bounded child uses that standard resolver without changing the CLI's global cwd or
    // reimplementing package exports. Resolve once per plugin/package for this formatting pass.
    const paths = JSON.parse(
      execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          // A package that has not installed the plugin answers null for it.
          'process.stdout.write(JSON.stringify(JSON.parse(process.argv[1]).map(name => { try { return import.meta.resolve(name) } catch (_error) { return null } })))',
          '--',
          JSON.stringify(missing),
        ],
        { cwd, encoding: 'utf8', timeout: 30_000 },
      ),
    ) as (string | null)[]
    missing.forEach((plugin, index) =>
      cache.set(key(plugin), paths[index] ?? ownPlugin(plugin, cwd)),
    )
  }
  return plugins?.map((plugin) => (typeof plugin === 'string' ? cache.get(key(plugin))! : plugin))
}

/**
 * Resolve a prettier plugin from mlcl's own dependencies.
 *
 * @param plugin - The plugin's package name.
 * @param cwd - The package that names it, for the error.
 * @returns The plugin's module URL.
 */
function ownPlugin(plugin: string, cwd: string): string {
  try {
    return import.meta.resolve(plugin)
  } catch (error) {
    throw new Error(
      `prettier plugin ${plugin} (named in ${cwd}'s .prettierrc) is installed neither there nor with mlcl`,
      { cause: error },
    )
  }
}

/**
 * Prettier-format a generated markdown document, using the config that applies
 * at the path it will be WRITTEN to — not mlcl's own. `README.md` lands in the
 * molecule repo and `CATALOG.md` under `templates/`, so resolving from the
 * target keeps generated docs consistent with the repo that hosts them.
 *
 * Deliberately ignores `.prettierignore`: a generated file must match the
 * formatter whether or not the repo currently checks that extension, so
 * re-enabling the check can never turn ~900 generated docs red at once. That is
 * exactly how every README.md came to be unformatted — `*.md` was ignored, so
 * nothing ever told the generator it was off-standard.
 *
 * Formats to a FIXED POINT rather than once. Prettier's markdown formatting is
 * not idempotent when a fenced block holds code it also formats: a `tsx` example
 * whose statement needs a leading ASI semicolon (`;<Component`) loses a blank
 * line on the SECOND pass, so a single pass leaves a file that `prettier --check`
 * still rejects. Seven README.md files hit this. Two passes settle every known
 * case; the cap bounds a hypothetical oscillation instead of looping forever.
 *
 * On a formatting failure the UNFORMATTED markdown is returned rather than
 * thrown: losing a doc over a formatting hiccup is far worse than an unformatted
 * one, and the format gate will surface it either way.
 *
 * @param md - The generated markdown.
 * @param filePath - Absolute path the markdown will be written to.
 * @returns The formatted markdown, or the input if Prettier could not parse it.
 */
export async function formatGeneratedMarkdown(md: string, filePath: string): Promise<string> {
  const MAX_PASSES = 4
  try {
    const config = await prettier.resolveConfig(filePath)
    const options = { ...config, filepath: filePath, parser: 'markdown' as const }
    let current = md
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      const next = await prettier.format(current, options)
      if (next === current) return current
      current = next
    }
    console.warn(
      `  prettier: ${filePath} did not reach a stable format in ${MAX_PASSES} passes; ` +
        `writing the last result`,
    )
    return current
  } catch (error) {
    console.warn(`  prettier: skipped ${filePath} (markdown parse error)`, error)
    return md
  }
}

/** Recursively discover formattable files, skipping excluded directories. */
async function discoverFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        files.push(...(await discoverFiles(join(dir, entry.name))))
      }
    } else if (entry.isFile() && FORMATTABLE_EXTENSIONS.has(extname(entry.name))) {
      files.push(join(dir, entry.name))
    }
  }

  return files
}
