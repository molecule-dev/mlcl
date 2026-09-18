/**
 * Source code formatting utilities for generated files.
 *
 * @module
 */

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'

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

/** Prettier config shared by all generated projects. */
const PRETTIER_CONFIG: prettier.Options = {
  singleQuote: true,
  semi: false,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  arrowParens: 'always',
  endOfLine: 'lf',
}

/** File extensions that Prettier can format. */
const FORMATTABLE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.json',
  '.css',
  '.html',
  '.vue',
  '.svelte',
])

/** Directories to skip when discovering files. */
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'icons', 'fonts', '__setup__'])

/**
 * Format all generated files in a project directory using Prettier's JS API.
 *
 * Recursively discovers formattable files (.ts, .tsx, .js, .mjs, .json, .css, .html),
 * skipping node_modules, dist, and asset directories. Each file is formatted in-place
 * only if Prettier changes its content.
 *
 * @param projectPath - Absolute path to the project root (e.g., `molecule-dev/api`).
 * @returns Number of files that were reformatted.
 */
export async function formatGeneratedFiles(projectPath: string): Promise<number> {
  const files = await discoverFiles(projectPath)
  let formatted = 0

  for (const filePath of files) {
    const content = await readFile(filePath, 'utf-8')
    const ext = extname(filePath)
    try {
      const result = await prettier.format(content, {
        ...PRETTIER_CONFIG,
        filepath: filePath,
      })
      if (result !== content) {
        await writeFile(filePath, result)
        formatted++
      }
    } catch (error) {
      // Skip files that Prettier can't parse (e.g., malformed JSON)
      const rel = relative(projectPath, filePath)
      console.warn(`  prettier: skipped ${rel} (${ext} parse error)`, error)
    }
  }

  return formatted
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
