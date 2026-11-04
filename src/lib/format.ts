/**
 * Source code formatting utilities for generated files.
 *
 * @module
 */

import { access, readdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, extname, join, relative, resolve } from 'node:path'

import * as prettier from 'prettier'

/** A single import statement — may span multiple lines. */
interface ImportBlock {
  /** All source lines that make up this import (preserves formatting). */
  lines: string[]
  /** The module path from the `from '...'` clause, used for sorting. */
  modulePath: string
}

/**
 * Extract the module path from an import statement.
 * Handles both `import { x } from 'path'` and side-effect `import 'path'`.
 */
function extractModulePath(text: string): string {
  const fromMatch = text.match(/from\s+['"]([^'"]+)['"]/)
  if (fromMatch) return fromMatch[1]
  const sideEffectMatch = text.match(/import\s+['"]([^'"]+)['"]/)
  if (sideEffectMatch) return sideEffectMatch[1]
  return text
}

/**
 * Sort key for a single named specifier.  Strips leading `type ` so that
 * `type Foo` sorts next to `Foo` (alphabetically by name).
 */
function specifierSortKey(s: string): string {
  return s.replace(/^type\s+/, '').toLowerCase()
}

/**
 * Sort named specifiers inside a single-line import's braces.
 *
 * `import { c, a, type B } from 'x'` → `import { a, type B, c } from 'x'`
 */
function sortSingleLineSpecifiers(line: string): string {
  // Match: everything before '{', the specifier list, everything after '}'
  const match = line.match(/^(import\s+(?:type\s+)?)\{([^}]+)\}(.*)$/)
  if (!match) return line

  const [, prefix, specifiers, suffix] = match
  const items = specifiers
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (items.length <= 1) return line

  items.sort((a, b) => specifierSortKey(a).localeCompare(specifierSortKey(b)))
  return `${prefix}{ ${items.join(', ')} }${suffix}`
}

/**
 * Sort named specifiers inside a multi-line import block.
 *
 * Sorts the interior lines (between `import {` and `} from '...'`) alphabetically.
 */
function sortMultiLineSpecifiers(blockLines: string[]): string[] {
  if (blockLines.length <= 2) return blockLines

  // First line: `import {` or `import type {`
  // Last line: `} from '...'`
  // Interior lines: `  specifier,`
  const first = blockLines[0]
  const last = blockLines[blockLines.length - 1]
  const interior = blockLines.slice(1, -1)

  // Extract specifier names from interior lines
  const specifiers = interior.map((line) => {
    const trimmed = line.trim().replace(/,$/, '')
    return { original: trimmed, sortKey: specifierSortKey(trimmed) }
  })

  specifiers.sort((a, b) => a.sortKey.localeCompare(b.sortKey))

  // Detect indentation from first interior line
  const indentMatch = interior[0]?.match(/^(\s+)/)
  const indent = indentMatch ? indentMatch[1] : '  '

  const sortedInterior = specifiers.map((s) => `${indent}${s.original},`)
  return [first, ...sortedInterior, last]
}

/**
 * Check if an import is a side-effect import (no bindings).
 * e.g. `import './polyfills'` or `import 'reflect-metadata'`
 */
function isSideEffectImport(line: string): boolean {
  return /^import\s+['"]/.test(line.trim())
}

/**
 * Sort import statements at the top of a TS/JS file.
 *
 * Handles both single-line (`import { foo } from 'bar'`) and multi-line
 * imports (`import {\n  foo,\n  bar,\n} from 'baz'`).
 *
 * Groups (separated by blank lines, sorted by module path within each):
 *   0. Side-effect imports (`import './polyfills'`) — always first
 *   1. `node:` prefixed imports
 *   2. External package imports
 *   3. `@molecule/` scoped imports
 *   4. Relative (`./` or `../`) imports
 *
 * Within each import, named specifiers inside `{ }` are sorted alphabetically.
 *
 * Matches the `simple-import-sort` ESLint plugin group configuration used in
 * generated projects: `[['^node:'], ['^[^.]'], ['^@molecule/'], ['^\\.']`
 */
export function sortImportStatements(content: string): string {
  const lines = content.split('\n')

  // Parse the contiguous import block at the top of the file into ImportBlocks.
  const importBlocks: ImportBlock[] = []
  let firstImportLine = -1
  let lastImportLine = -1
  let i = 0

  while (i < lines.length) {
    const trimmed = lines[i].trim()

    // Start of an import statement
    if (trimmed.startsWith('import ') || trimmed.startsWith('import{')) {
      if (firstImportLine === -1) firstImportLine = i

      // Check if this is a complete single-line import (has `from` on same line)
      // or a side-effect import (e.g. `import './polyfills'`)
      if (/from\s+['"]/.test(trimmed) || /^import\s+['"]/.test(trimmed)) {
        // Single-line import — sort specifiers within braces
        const sorted = sortSingleLineSpecifiers(lines[i])
        importBlocks.push({
          lines: [sorted],
          modulePath: extractModulePath(sorted),
        })
        lastImportLine = i
        i++
      } else {
        // Multi-line import — consume until we find the `from '...'` line
        const blockLines = [lines[i]]
        let j = i + 1
        while (j < lines.length) {
          blockLines.push(lines[j])
          if (/from\s+['"]/.test(lines[j])) {
            break
          }
          j++
        }
        // Sort specifiers within the multi-line block
        const sortedBlock = sortMultiLineSpecifiers(blockLines)
        importBlocks.push({
          lines: sortedBlock,
          modulePath: extractModulePath(sortedBlock.join('\n')),
        })
        lastImportLine = j
        i = j + 1
      }
    } else if (
      firstImportLine !== -1 &&
      trimmed !== '' &&
      !trimmed.startsWith('//') &&
      !trimmed.startsWith('/*') &&
      !trimmed.startsWith('*') &&
      !trimmed.startsWith('*/') &&
      !trimmed.startsWith('/// ')
    ) {
      // Non-import, non-blank, non-comment line after imports started — end of import block
      break
    } else {
      // Blank line, comment, or pre-import content — skip
      i++
    }
  }

  if (importBlocks.length === 0) return content

  // Even with a single import, specifiers may have been re-sorted above.
  // Rebuild if there's only one block.
  if (importBlocks.length === 1) {
    return [
      ...lines.slice(0, firstImportLine),
      ...importBlocks[0].lines,
      ...lines.slice(lastImportLine + 1),
    ].join('\n')
  }

  // Categorize by module path
  const sideEffectImports: ImportBlock[] = []
  const nodeImports: ImportBlock[] = []
  const externalImports: ImportBlock[] = []
  const moleculeImports: ImportBlock[] = []
  const relativeImports: ImportBlock[] = []

  for (const block of importBlocks) {
    // Side-effect imports (no bindings) go first, regardless of path
    if (isSideEffectImport(block.lines[0])) {
      sideEffectImports.push(block)
    } else if (block.modulePath.startsWith('node:')) {
      nodeImports.push(block)
    } else if (block.modulePath.startsWith('./') || block.modulePath.startsWith('../')) {
      relativeImports.push(block)
    } else if (block.modulePath.startsWith('@molecule/')) {
      moleculeImports.push(block)
    } else {
      externalImports.push(block)
    }
  }

  // Sort each group by module path (side-effect imports keep original order)
  const byPath = (a: ImportBlock, b: ImportBlock): number =>
    a.modulePath.localeCompare(b.modulePath)
  nodeImports.sort(byPath)
  externalImports.sort(byPath)
  moleculeImports.sort(byPath)
  relativeImports.sort(byPath)

  // Build sorted block with blank lines between non-empty groups.
  // Side-effect imports go first without a blank line separator (matching
  // simple-import-sort's default behavior when no \u0000 group is configured).
  const groups = [nodeImports, externalImports, moleculeImports, relativeImports].filter(
    (g) => g.length > 0,
  )
  const sorted: string[] = []
  // Side-effect imports first, no trailing blank line
  for (const block of sideEffectImports) {
    sorted.push(...block.lines)
  }
  for (let g = 0; g < groups.length; g++) {
    if (g > 0) sorted.push('')
    for (const block of groups[g]) {
      sorted.push(...block.lines)
    }
  }

  return [...lines.slice(0, firstImportLine), ...sorted, ...lines.slice(lastImportLine + 1)].join(
    '\n',
  )
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
 * @param projectPath - Absolute path to the project root (e.g., `molecule-dev/api`).
 * @returns Number of files that were reformatted.
 */
export async function formatGeneratedFiles(projectPath: string): Promise<number> {
  return (await formatPass(projectPath, true)).length
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

async function formatPass(projectPath: string, write: boolean): Promise<string[]> {
  const files = await discoverFiles(projectPath)
  const changed: string[] = []

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
      // Prettier's API resolves bare plugin names from process.cwd(), which is mlcl's
      // directory. Resolve them with Node from the same package as its CLI invocation.
      const requireFromPackage = createRequire(join(cwd, 'package.json'))
      const plugins = config?.plugins?.map((plugin) =>
        typeof plugin === 'string' && !plugin.startsWith('file:')
          ? requireFromPackage.resolve(plugin)
          : plugin,
      )
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
