/**
 * The code of the files an injection created, for its report. In a project Molecule did not
 * create, those files are the only new code: shown in the report, they need no second look. In
 * the harness eval `add` (2026-11-25) the report listed them by name, and Claude opened
 * `src/bonds/` after three of five adds before writing its routes.
 *
 * @module
 */

import { extname } from 'node:path'

/** One created file and the lines of it the report shows. */
export interface WrittenFile {
  /** The path, as the report names it. */
  path: string
  /** Its code lines: no blank lines, no comments. */
  lines: string[]
}

/** Source files whose code the report can show; data, SQL and markup are listed by name only. */
const SOURCE = new Set(['.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs'])

/**
 * The lines of a source file that carry code: blank lines, `//` lines and block comments that
 * start a line are left out.
 *
 * @param text - The file's content.
 * @returns Its code lines, right-trimmed.
 */
export function codeLines(text: string): string[] {
  const lines: string[] = []
  let inComment = false
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    const trimmed = line.trim()
    if (inComment) {
      if (trimmed.includes('*/')) inComment = false
      continue
    }
    if (trimmed.startsWith('/*')) {
      inComment = !trimmed.includes('*/')
      continue
    }
    if (trimmed === '' || trimmed.startsWith('//')) continue
    lines.push(line)
  }
  return lines
}

/**
 * The created files with the code the report shows: a short source file's code lines, while the
 * report's total stays under `maxLines`. A long file (a migration runner) and a file that is not
 * source code are named only.
 *
 * @param paths - The created files, as the report names them.
 * @param read - Reads one of them.
 * @param limits - Limits.
 * @param limits.maxFileLines - The most code lines one file may have to be shown.
 * @param limits.maxLines - The most code lines the report shows in all.
 * @returns Each file, in order, with the lines to show (none when it is named only).
 */
export function writtenCode(
  paths: readonly string[],
  read: (path: string) => string,
  { maxFileLines = 20, maxLines = 48 }: { maxFileLines?: number; maxLines?: number } = {},
): WrittenFile[] {
  let shown = 0
  return paths.map((path) => {
    const lines = SOURCE.has(extname(path)) ? codeLines(read(path)) : []
    if (lines.length === 0 || lines.length > maxFileLines || shown + lines.length > maxLines)
      return { path, lines: [] }
    shown += lines.length
    return { path, lines }
  })
}
