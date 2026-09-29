/**
 * The post page's margin notes: each block of the post, with its section's
 * TL;DR and each AI block's prompt beside it.
 *
 * This file already does what the reader is promised, and each part was
 * measured against the finished site: the summaries switch starts ON and the
 * prompts switch OFF, one prompt is shown once however many paragraphs it
 * wrote, each AI paragraph carries a margin mark, and
 * `@molecule/app-margin-notes-html` places, sizes and scrolls the notes (its
 * switches, gutter, phone bar and script are all that package). Restyle the site
 * in public/styles.css; you should not need to change this file, and builders
 * who rewrote it — flipped a default, added a third kind of note, wrapped the
 * layout in a grid or a script of their own — failed the build.
 */
import {
  escapeHtml,
  type MarginNote,
  type MarginNotesBlock,
  type RenderedMarginNotes,
  renderMarginNotes,
} from '@molecule/app-margin-notes-html'
import { provider as markdown } from '@molecule/app-markdown-marked'

import type { Post } from './content.js'
import { markdownBlocks, type Provenance } from './provenance.js'

/**
 * The block indexes that start a section: 0 (the lead), then every heading at
 * the post's shallowest heading level. Summaries are keyed by these.
 *
 * @param blocks - The post's top-level markdown blocks (`markdownBlocks()`).
 * @returns The indexes, in order.
 */
export function sectionStarts(blocks: string[]): number[] {
  const level = (text: string): number => /^(#{1,6})\s/.exec(text)?.[1].length ?? 0
  const top = Math.min(...blocks.map((b) => level(b) || 7))
  return blocks.flatMap((b, i) => (i === 0 || level(b) === top ? [i] : []))
}

/**
 * The post body as a margin-notes layout: each top-level block of the post,
 * with the section's TL;DR and each AI block's prompt beside it
 * (`@molecule/app-margin-notes-html` — the switches, the gutter, the phone bar
 * and its script are all that package; do not rebuild any of them here).
 * Every post body goes through it, so every post shares one type scale; a
 * post with nothing to put beside it (`hasNotes` false) is plain centred prose,
 * with no gutter, bar or switches.
 *
 * @param post - The post.
 * @param provenance - Its provenance, when it has transcripts.
 * @param summaries - TL;DR per section start index.
 * @returns The layout, the switches for the header, and whether there are notes.
 */
export function postNotes(
  post: Post,
  provenance: Provenance | undefined,
  summaries: Record<number, string>,
): RenderedMarginNotes {
  const texts = provenance?.spans.map((s) => s.text) ?? markdownBlocks(post.markdown)
  const starts = new Set(sectionStarts(texts))
  const notes: MarginNote[] = []
  const promptIds = new Map<string, string>()
  let summaryId: string | undefined
  const blocks: MarginNotesBlock[] = texts.map((text, i) => {
    if (starts.has(i)) {
      summaryId = summaries[i] ? `summary-${i}` : undefined
      if (summaryId) {
        notes.push({
          id: summaryId,
          kind: 'summary',
          label: 'TL;DR',
          html: `<p>${escapeHtml(summaries[i])}</p>`,
        })
      }
    }
    const noteIds = summaryId ? [summaryId] : []
    const span = provenance?.spans[i]
    if (span?.origin === 'ai' && span.prompt) {
      let id = promptIds.get(span.prompt)
      if (!id) {
        id = `prompt-${promptIds.size}`
        promptIds.set(span.prompt, id)
        notes.push({
          id,
          kind: 'prompt',
          label: `Prompt · ${span.model ?? 'AI'}`,
          html: `<p>${escapeHtml(span.prompt)}</p>`,
        })
      }
      noteIds.push(id)
    }
    return {
      id: `block-${i}`,
      html: markdown.render(text).html,
      noteIds,
      marked: span?.origin === 'ai',
    }
  })
  return renderMarginNotes({
    blocks,
    notes,
    kinds: [
      { id: 'summary', label: 'Summary', defaultOn: true },
      { id: 'prompt', label: 'Prompt', defaultOn: false, panel: 'tap' },
    ],
    markLabel: 'Written with AI',
  })
}
