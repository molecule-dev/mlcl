/**
 * A bounded view of a package README: the whole file when it is small, otherwise its overview and
 * an index of its sections; or one named section.
 *
 * `@molecule/*` READMEs are generated and some run past 100 KB, so printing one whole puts most of
 * it in an agent's context to find one function. The Molecule harness's doc tool reads the same
 * way (overview and index past 16 KB, or a section by heading or exported symbol). `mlcl docs` and
 * the MCP `read_package_doc` tool use this module; it is pure, so the MCP package carries a
 * generated copy (scripts/generate-mcp-package-docs.mjs).
 *
 * @module
 */

/** A README this long or shorter is returned whole. */
export const DOC_VIEW_MAX_CHARS = 16_000

/** The longest overview printed above the index of a long README. */
const OVERVIEW_MAX_CHARS = 4_000

/** The longest section index printed for a long README. */
const INDEX_MAX_CHARS = 8_000

/** One Markdown heading of a README, outside code fences. */
interface DocHeading {
  /** 1 for `#`, 2 for `##`, … */
  level: number
  /** The heading text, without `#` marks. */
  title: string
  /** Index of the heading's first character in the README. */
  start: number
}

/**
 * The README's headings, skipping lines inside fenced code blocks.
 *
 * @param readme - The README text.
 * @returns Every heading, in order.
 */
export function docHeadings(readme: string): DocHeading[] {
  const headings: DocHeading[] = []
  let fence: string | null = null
  let offset = 0
  for (const line of readme.split('\n')) {
    const marker = line.match(/^\s*(```+|~~~+)/)?.[1]
    if (marker) {
      if (fence === null) fence = marker[0]
      else if (marker[0] === fence) fence = null
    } else if (fence === null) {
      const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/)
      if (match) headings.push({ level: match[1].length, title: match[2], start: offset })
    }
    offset += line.length + 1
  }
  return headings
}

/**
 * A heading's name: no backticks, emphasis or call parentheses (`findMany(table, options)` is
 * `findMany`).
 *
 * @param title - The heading text.
 * @returns The name.
 */
function headingName(title: string): string {
  return title
    .replace(/[`*_]/g, '')
    .replace(/\(.*\)$/, '')
    .trim()
}

/**
 * A heading's name as a reader would type it, for matching.
 *
 * @param title - The heading text.
 * @returns The lower-case name.
 */
function plain(title: string): string {
  return headingName(title).toLowerCase()
}

/**
 * Cut a text to a length, saying so.
 *
 * @param text - The text.
 * @param max - The longest text to return.
 * @param rest - What the reader can do for the rest.
 * @returns The text, or its first `max` characters and a note.
 */
function bounded(text: string, max: number, rest: string): string {
  return text.length <= max
    ? text
    : `${text.slice(0, max).trimEnd()}\n\n…(cut at ${max} characters — ${rest})`
}

/**
 * The README's section index: each `##` and `###` heading on its own line, and the `####`
 * headings under one (the exported functions, types and components the generated READMEs
 * document) as one line of names.
 *
 * @param headings - The README's headings.
 * @returns The index, bounded.
 */
function sectionIndex(headings: DocHeading[]): string {
  const lines: string[] = []
  for (const heading of headings) {
    if (heading.level === 2) lines.push(`- ${heading.title}`)
    else if (heading.level === 3) lines.push(`  - ${heading.title}`)
    else if (heading.level === 4) {
      const last = lines.at(-1)
      if (last?.startsWith('    '))
        lines[lines.length - 1] = `${last}, ${headingName(heading.title)}`
      else lines.push(`    ${headingName(heading.title)}`)
    }
  }
  return bounded(lines.join('\n'), INDEX_MAX_CHARS, 'ask for a section above to see its part')
}

/**
 * A view of a README.
 *
 * @param readme - The README text.
 * @param options.section - A heading, or an exported symbol that names one, to read in full.
 * @param options.sectionHint - How the reader asks for one section, with `<heading>` where the
 *   heading goes (`npx mlcl docs @molecule/api-database --section "<heading>"`).
 * @returns The text to show, and whether a requested section was found.
 */
export function packageDocView(
  readme: string,
  options: { section?: string; sectionHint: string },
): { text: string; found: boolean } {
  // The generated READMEs open with a comment telling people not to edit the file by hand.
  readme = readme.replace(/^\s*<!--[\s\S]*?-->\s*/, '')
  const headings = docHeadings(readme)
  const section = options.section?.trim()
  if (section) {
    const want = plain(section)
    const index =
      headings.findIndex((heading) => plain(heading.title) === want) !== -1
        ? headings.findIndex((heading) => plain(heading.title) === want)
        : headings.findIndex((heading) =>
            plain(heading.title)
              .split(/[^\w$.]+/)
              .includes(want),
          )
    if (index === -1) {
      return {
        found: false,
        text: [
          `No section "${section}" in this README. Its sections:`,
          '',
          sectionIndex(headings),
        ].join('\n'),
      }
    }
    const heading = headings[index]
    const next = headings.slice(index + 1).find((later) => later.level <= heading.level)
    return {
      found: true,
      text: bounded(
        readme.slice(heading.start, next?.start ?? readme.length).trimEnd(),
        DOC_VIEW_MAX_CHARS,
        `ask for a narrower section: ${options.sectionHint}`,
      ),
    }
  }
  if (readme.length <= DOC_VIEW_MAX_CHARS) return { found: true, text: readme }
  const firstSection = headings.find((heading) => heading.level >= 2)
  const overview = readme.slice(0, firstSection?.start ?? readme.length).trimEnd()
  return {
    found: true,
    text: [
      bounded(overview, OVERVIEW_MAX_CHARS, 'the index below lists the rest'),
      '',
      `This README is ${Math.round(readme.length / 1000)} KB. Read one section, a heading or an exported name below, with ${options.sectionHint}:`,
      '',
      sectionIndex(headings),
    ].join('\n'),
  }
}
