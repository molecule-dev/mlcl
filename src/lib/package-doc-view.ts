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

/**
 * The longest Quick Start printed in a long README's view. Every Codex run of the harness evals
 * asked for that section in a second call (add, 2026-11-25); 90% of the fleet's are under 2 KB.
 */
const QUICK_START_MAX_CHARS = 3_000

/**
 * The most a request that names no heading prints of the sections or passages found for it
 * instead. Codex asked for `--section uploadParser` (the core has `createUploadParser` and
 * `UploadParserFactory`) and `--section invalidateDeviceExistsCache` (named only in a paragraph);
 * each answer was the index and exit 1, and each cost another call (harness evals, 2026-11-25).
 */
const FALLBACK_MAX_CHARS = 8_000

/** The shortest request whose text is looked for inside heading names (`api` would match most). */
const CONTAINS_MIN_CHARS = 4

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

/** Emphasis markers around words (`_(deprecated)_`, `**Note**`), never the underscores inside a name. */
const EMPHASIS = /(^|[\s(])[*_]+(?=\S)|(?<=\S)[*_]+(?=[\s).,:;!?]|$)/g

/**
 * A heading's text without code or emphasis markers.
 *
 * @param title - The heading text.
 * @returns The text.
 */
function headingText(title: string): string {
  return title.replace(/`/g, '').replace(EMPHASIS, '$1').trim()
}

/**
 * A heading's name: the code span it opens with, as written (`BLOCKED_UPLOAD_TYPES`), or its text,
 * without call parentheses (`findMany(table, options)` is `findMany`). The index showed
 * `BLOCKEDUPLOADTYPES` when underscores were stripped as emphasis, a name no code can import.
 *
 * @param title - The heading text.
 * @returns The name.
 */
function headingName(title: string): string {
  const code = title.match(/^`([^`]+)`/)?.[1]
  return (code ?? headingText(title)).replace(/\(.*\)$/, '').trim()
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
 * A requested section as the reader typed it, for matching: no code markers or call parentheses.
 *
 * @param section - The requested section.
 * @returns The lower-case request.
 */
function typed(section: string): string {
  return section
    .replace(/`/g, '')
    .replace(/\(.*\)$/, '')
    .trim()
    .toLowerCase()
}

/**
 * The forms a request is matched in: as typed, then without emphasis markers, so a heading asked
 * for with its badge (`email _(deprecated)_`, as the search prints it) is found.
 *
 * @param section - The requested section.
 * @returns The distinct forms, the typed one first.
 */
function requestForms(section: string): string[] {
  return [...new Set([typed(section), typed(headingText(section))])]
}

/**
 * The text of a heading's section, up to the next heading of its level or higher.
 *
 * @param readme - The README text.
 * @param headings - The README's headings.
 * @param index - The heading's position in `headings`.
 * @returns The section text.
 */
function sectionText(readme: string, headings: DocHeading[], index: number): string {
  const heading = headings[index]
  const next = headings.slice(index + 1).find((later) => later.level <= heading.level)
  return readme.slice(heading.start, next?.start ?? readme.length).trimEnd()
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
    : `${closeFence(text.slice(0, max).trimEnd())}\n\n…(cut at ${max} characters — ${rest})`
}

/**
 * Close a code fence a cut left open, so the note and the index after it are not read as code
 * (17 of the 18 Quick Starts over the bound were cut inside their ```ts fence).
 *
 * @param text - The cut text.
 * @returns The text, with the open fence's marker appended on its own line.
 */
function closeFence(text: string): string {
  let fence: string | null = null
  for (const line of text.split('\n')) {
    const marker = line.match(/^\s*(```+|~~~+)/)?.[1]
    if (!marker) continue
    if (fence === null) fence = marker
    else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null
  }
  return fence === null ? text : `${text}\n${fence}`
}

/**
 * The sections whose names contain a request, for a request that names no heading: in README
 * order, each section bounded, those past the budget listed by name. The package title is left
 * out, and so is a heading inside a section already printed.
 *
 * @param readme - The README text.
 * @param headings - The README's headings.
 * @param wants - The request's forms (see {@link requestForms}).
 * @param hint - How the reader asks for one section.
 * @returns The text, or null when no heading's name contains the request.
 */
function containingSections(
  readme: string,
  headings: DocHeading[],
  wants: string[],
  hint: string,
): string | null {
  const keys = wants.filter((want) => want.length >= CONTAINS_MIN_CHARS)
  const chosen: number[] = []
  let end = -1
  for (const [index, heading] of headings.entries()) {
    if (heading.level < 2 || heading.start < end) continue
    if (!keys.some((key) => plain(heading.title).includes(key))) continue
    chosen.push(index)
    end = heading.start + sectionText(readme, headings, index).length
  }
  if (!chosen.length) return null
  const parts: string[] = []
  const rest: string[] = []
  let size = 0
  for (const index of chosen) {
    const text = bounded(
      sectionText(readme, headings, index),
      FALLBACK_MAX_CHARS / 2,
      `ask for it alone: ${hint}`,
    )
    if (parts.length && size + text.length > FALLBACK_MAX_CHARS)
      rest.push(headingName(headings[index].title))
    else {
      parts.push(text)
      size += text.length
    }
  }
  if (rest.length) parts.push(`Also named like it (ask for one by name): ${rest.join(', ')}`)
  return parts.join('\n\n')
}

/**
 * The passages that mention a request as a whole name (not `one` inside `findOne`), for one that
 * no heading's name contains: each paragraph, or code block, with the heading it sits under,
 * bounded.
 *
 * @param readme - The README text.
 * @param wants - The request's forms (see {@link requestForms}).
 * @returns The text, or null when the README does not mention it.
 */
function mentioningPassages(readme: string, wants: string[]): string | null {
  const names = wants
    .filter((want) => want.length >= CONTAINS_MIN_CHARS)
    .map(
      (want) =>
        new RegExp(`(?<![\\w$])${want.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w$])`, 'i'),
    )
  if (!names.length) return null
  const lines = readme.split('\n')
  // Each line's heading and, inside a code fence, the fence's first and last lines.
  const under: string[] = []
  const fences: Array<[number, number] | null> = []
  let heading = ''
  let open: { marker: string; start: number } | null = null
  for (const [index, line] of lines.entries()) {
    const marker = line.match(/^\s*(```+|~~~+)/)?.[1]
    if (marker && open === null) open = { marker, start: index }
    else if (
      marker &&
      open &&
      marker[0] === open.marker[0] &&
      marker.length >= open.marker.length
    ) {
      for (let at = open.start; at <= index; at++) fences[at] = [open.start, index]
      open = null
    } else if (open === null && /^#{1,6}\s/.test(line)) heading = line.trim()
    under.push(heading)
  }
  const passages: string[] = []
  let size = 0
  let taken = -1
  for (const [index, line] of lines.entries()) {
    if (index <= taken || /^#{1,6}\s/.test(line)) continue
    if (!names.some((name) => name.test(line))) continue
    let [start, end] = fences[index] ?? [index, index]
    if (!fences[index]) {
      while (
        start > 0 &&
        lines[start - 1].trim() &&
        !/^(#{1,6}\s|\s*(```|~~~))/.test(lines[start - 1])
      )
        start--
      while (
        end < lines.length - 1 &&
        lines[end + 1].trim() &&
        !/^(#{1,6}\s|\s*(```|~~~))/.test(lines[end + 1])
      )
        end++
    }
    taken = end
    const text = `From ${under[index] ? `"${under[index]}"` : 'the overview'}:\n${bounded(
      lines.slice(start, end + 1).join('\n'),
      FALLBACK_MAX_CHARS / 4,
      'read the section it is in',
    )}`
    if (passages.length && size + text.length > FALLBACK_MAX_CHARS) {
      passages.push('…(more mentions past this bound: read the sections they are in)')
      break
    }
    passages.push(text)
    size += text.length
  }
  return passages.length ? passages.join('\n\n') : null
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
    const matches = [
      (title: string, want: string) => plain(title) === want,
      (title: string, want: string) => typed(headingText(title)) === want,
      (title: string, want: string) =>
        typed(headingText(title))
          .split(/[^\w$.]+/)
          .includes(want),
    ]
    const wants = requestForms(section)
    const index =
      matches
        .flatMap((match) =>
          wants.map((want) => headings.findIndex((heading) => match(heading.title, want))),
        )
        .find((at) => at !== -1) ?? -1
    if (index === -1) {
      // A name the reader guessed: the sections named like it, else the passages that mention it.
      const named = containingSections(readme, headings, wants, options.sectionHint)
      if (named)
        return {
          found: true,
          text: `No section is named "${section}". The sections whose names contain it:\n\n${named}`,
        }
      const mentioned = mentioningPassages(readme, wants)
      if (mentioned)
        return {
          found: true,
          text: `No section is named "${section}". The README mentions it here (read a whole section with ${options.sectionHint}):\n\n${mentioned}`,
        }
      return {
        found: false,
        text: [
          `No section "${section}" in this README. Its sections:`,
          '',
          sectionIndex(headings),
        ].join('\n'),
      }
    }
    return {
      found: true,
      text: bounded(
        sectionText(readme, headings, index),
        DOC_VIEW_MAX_CHARS,
        `ask for a narrower section: ${options.sectionHint}`,
      ),
    }
  }
  if (readme.length <= DOC_VIEW_MAX_CHARS) return { found: true, text: readme }
  const firstSection = headings.find((heading) => heading.level >= 2)
  const overview = readme.slice(0, firstSection?.start ?? readme.length).trimEnd()
  // The Quick Start is the section a reader asks for next: print it here.
  const quick = headings.findIndex(
    (heading) => heading.level === 2 && plain(heading.title) === 'quick start',
  )
  const quickStart =
    quick === -1
      ? []
      : [
          bounded(
            sectionText(readme, headings, quick),
            QUICK_START_MAX_CHARS,
            `read it whole with ${options.sectionHint.split('<heading>').join('Quick Start')}`,
          ),
          '',
        ]
  return {
    found: true,
    text: [
      bounded(overview, OVERVIEW_MAX_CHARS, 'the index below lists the rest'),
      '',
      ...quickStart,
      `This README is ${Math.round(readme.length / 1000)} KB. Read one section, a heading or an exported name below, with ${options.sectionHint}:`,
      '',
      sectionIndex(headings),
    ].join('\n'),
  }
}
