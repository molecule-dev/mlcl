import { z } from 'zod'

/** Literal, bounded README/type-reference search. Mirrored in molecule-mcp (no shared runtime dependency). */

/** One installed declaration file; paths are relative to the package root. */
export interface DocDeclaration {
  path: string
  text: string
}

/** Search output fits beneath the existing doc tool's transport budget. */
export const DOC_SEARCH_TOTAL_CHARS = 24_000
const TERM_CHARS = 6_000
const SOURCE_CHARS = 2_600
const DECLARATION_CHARS = 1_800

/** Validate the scalar/array input before opening any package files. */
export function parseDocSearch(value: unknown): string[] {
  const terms = typeof value === 'string' ? [value] : value
  if (
    !Array.isArray(terms) ||
    terms.length < 1 ||
    terms.length > 6 ||
    terms.some((term) => typeof term !== 'string' || !term.trim() || term.length > 200)
  )
    throw new Error(
      '`search` must be one non-empty string or 1–6 non-empty strings (max 200 characters each).',
    )
  return terms
}

/** Locate top-level declaration starts without treating quoted/commented braces as structure. */
function declarationRanges(lines: string[]): Array<[number, number]> {
  const masked = lines
    .join('\n')
    .replace(
      /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g,
      (text) => text.replace(/[^\n]/g, ' '),
    )
    .split('\n')
  const starts: number[] = []
  let depth = 0
  for (let i = 0; i < masked.length; i++) {
    if (
      depth === 0 &&
      /^\s*(?:(?:export|declare|default|abstract)\s+)*(?:interface|type|class|function|const|let|var|enum|namespace|module|global|import|export)\b/.test(
        masked[i],
      )
    ) {
      // The preceding comment belongs to this declaration, not the previous export.
      let start = i
      while (start > 0 && !masked[start - 1].trim()) start--
      while (start < i && !lines[start].trim()) start++
      starts.push(start)
    }
    for (const char of masked[i]) {
      if ('{[('.includes(char)) depth++
      if ('}])'.includes(char)) depth = Math.max(0, depth - 1)
    }
  }
  if (starts[0] !== 0) starts.unshift(0)
  return starts.map((start, i) => [start, (starts[i + 1] ?? lines.length) - 1])
}

/** Retain the literal hit when a generated signature occupies one very long line. */
function searchLine(line: string, needle: string, cap: number): string {
  if (line.length <= cap) return line
  const match = line.toLowerCase().indexOf(needle)
  const start = Math.max(0, match - 100)
  return `${start ? '…' : ''}${line.slice(start, start + cap)}…(line truncated)`
}

/** Search README lines (one context line either side) and complete declaration blocks. */
export function searchPackageDoc(
  readme: string,
  terms: readonly string[],
  declarations: readonly DocDeclaration[] = [],
  sourceNote?: string,
): { doc: string; search: readonly string[]; truncated?: boolean; note?: string } {
  let truncated = false
  const readmeLines = readme.split(/\r?\n/)
  const headings: string[] = []
  let heading = '(introduction)'
  let fence = ''
  for (const line of readmeLines) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/)
    if (marker) {
      if (!fence) fence = marker[1][0]
      else if (marker[1][0] === fence) fence = ''
    }
    const title = !fence && line.match(/^\s{0,3}#{1,6}\s+(.+?)(?:\s+#+)?\s*$/)
    if (title) heading = title[1]
    headings.push(heading)
  }
  const files = declarations.map((file) => {
    const lines = file.text.split(/\r?\n/)
    return { ...file, lines, ranges: declarationRanges(lines) }
  })
  const output: string[] = []
  for (const [termIndex, term] of terms.entries()) {
    const needle = term.toLowerCase()
    const readmeHits: string[] = []
    const declarationHits: string[] = []
    let readmeCut = false
    let declarationCut = false
    let readmeSize = 0
    let declarationSize = 0
    let last = -1
    for (let i = 0; i < readmeLines.length; i++) {
      if (!readmeLines[i].toLowerCase().includes(needle)) continue
      const start = Math.max(last + 1, i - 1, 0)
      const end = Math.min(readmeLines.length - 1, i + 1)
      if (start > end) continue
      const hit =
        `README.md:${i + 1} — section ${JSON.stringify(headings[i])}\n` +
        readmeLines
          .slice(start, end + 1)
          .map(
            (line, j) =>
              `${start + j + 1}: ${searchLine(line, needle, start + j === i ? 1_400 : 300)}`,
          )
          .join('\n')
      if (hit.includes('…(line truncated)')) readmeCut = true
      if (readmeSize + hit.length > SOURCE_CHARS) {
        readmeCut = true
        break
      }
      readmeHits.push(hit)
      readmeSize += hit.length
      last = end
    }
    for (const file of files) {
      for (const [start, end] of file.ranges) {
        let match = start
        while (match <= end && !file.lines[match].toLowerCase().includes(needle)) match++
        if (match > end) continue
        let text = file.lines
          .slice(start, end + 1)
          .join('\n')
          .trimEnd()
        let at = start
        if (text.length > DECLARATION_CHARS) {
          // Keep the matching line visible even inside a very large interface.
          at = Math.max(start, match - 1)
          const before = at < match ? searchLine(file.lines[at], needle, 200) + '\n' : ''
          text = (
            before +
            searchLine(file.lines[match], needle, 1_400) +
            '\n' +
            file.lines.slice(match + 1, end + 1).join('\n')
          ).slice(0, DECLARATION_CHARS)
          text += '\n…(declaration truncated; read this path for the complete declaration)'
          declarationCut = true
        }
        const hit = `${file.path}:${at + 1}\n${text}`
        if (declarationSize + hit.length > SOURCE_CHARS) {
          declarationCut = true
          break
        }
        declarationHits.push(hit)
        declarationSize += hit.length
      }
    }
    const chunks = [`### Search: ${JSON.stringify(term)}`, ...readmeHits, ...declarationHits]
    if (readmeCut) chunks.push('…(README matches truncated by the per-term cap)')
    if (declarationCut) chunks.push('…(declaration matches truncated by the per-term cap)')
    if (!readmeHits.length && !declarationHits.length && !readmeCut && !declarationCut)
      chunks.push('No matches in README.md or dist/**/*.d.ts.')
    let block = chunks.join('\n\n')
    if (block.length > TERM_CHARS) {
      block = block.slice(0, TERM_CHARS - 100) + '\n…(per-term search cap reached)'
      truncated = true
    }
    const reserve = terms
      .slice(termIndex + 1)
      .reduce((size, value) => size + JSON.stringify(value).length + 100, 700)
    if (output.join('\n\n').length + block.length > DOC_SEARCH_TOTAL_CHARS - reserve) {
      output.push(`### Search: ${JSON.stringify(term)}\nOmitted — total search cap reached.`)
      truncated = true
    } else {
      output.push(block)
      truncated ||= readmeCut || declarationCut
    }
  }
  const note = [
    !declarations.length ? 'No installed dist/**/*.d.ts declarations available.' : '',
    sourceNote?.slice(0, 500),
  ]
    .filter(Boolean)
    .join(' ')
  if (note) output.push(note)
  return {
    doc: output.join('\n\n'),
    search: terms,
    ...(truncated ? { truncated: true } : {}),
    ...(note ? { note } : {}),
  }
}

/** The same bounded search input on stdio and hosted MCP. */
export const docSearchSchema = z
  .union([
    z
      .string()
      .min(1)
      .max(200)
      .refine((term) => !!term.trim()),
    z
      .array(
        z
          .string()
          .min(1)
          .max(200)
          .refine((term) => !!term.trim()),
      )
      .min(1)
      .max(6),
  ])
  .describe(
    'Case-insensitive literal string or up to 6 terms. Search README lines with context/headings and available installed dist/**/*.d.ts declarations; never implementation JS.',
  )
