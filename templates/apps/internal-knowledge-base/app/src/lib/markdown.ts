/**
 * Article markdown through the bonded `@molecule/app-markdown` provider
 * (`src/bonds/app-markdown-marked.ts`): the HTML an article shows and the
 * table of contents beside it come from one render, so every TOC link has a
 * heading with that id. The provider gives repeated headings unique ids
 * (`setup`, `setup-2`), keeps non-Latin letters in ids, ignores `#` lines
 * inside code fences, and sanitizes by default (raw HTML escaped, unsafe
 * link URLs refused). `SafeHtml` and the API's `sanitizeHtml` still run on
 * the result.
 */
import { requireProvider } from '@molecule/app-markdown'

/** A heading in an article's table of contents. */
export interface TocItem {
  /** The heading element's id. */
  id: string
  /** The heading text. */
  label: string
  /** The heading level; the sticky TOC in `ArticleView` lists H1–H3. */
  level: 1 | 2 | 3
}

/**
 * Renders an article body to HTML.
 *
 * @param md - The article's markdown.
 * @returns The sanitized HTML, or `''` for an empty body.
 */
export function renderMarkdown(md: string): string {
  if (!md) return ''
  return requireProvider().render(md).html
}

/**
 * The H1–H3 headings of an article that have text, in order, with the ids `renderMarkdown`
 * gives them.
 *
 * @param md - The article's markdown.
 * @returns The table of contents (`[]` when the body has no H1–H3 heading).
 */
export function extractToc(md: string): TocItem[] {
  if (!md) return []
  return (
    requireProvider()
      .render(md)
      // A heading with no text (`## `) would be a blank link.
      .toc.filter((entry) => entry.level >= 1 && entry.level <= 3 && entry.text.trim() !== '')
      .map((entry) => ({ id: entry.id, label: entry.text, level: entry.level as 1 | 2 | 3 }))
  )
}

/**
 * The first line of body text, trimmed and length-capped, used as the excerpt in
 * list views when the API row doesn't carry one. Headings and fenced code blocks
 * (their fences and every line inside them) are skipped.
 *
 * @param md - The article's markdown.
 * @param max - The longest excerpt, in characters, before it is cut with `…`.
 * @returns The excerpt, or `''` when the body has no such line.
 */
export function extractExcerpt(md: string, max = 240): string {
  if (!md) return ''
  let inFence = false
  for (const line of md.split('\n')) {
    const trimmed = line.trim()
    if (/^(```|~~~)/.test(trimmed)) {
      inFence = !inFence
      continue
    }
    if (inFence || !trimmed || trimmed.startsWith('#')) continue
    if (trimmed.length <= max) return trimmed
    return `${trimmed.slice(0, max)}…`
  }
  return ''
}
