import { useEffect, useRef, useState } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-react'

import { AnnotatedParagraph, type ProvenanceSpan } from './AnnotatedProse.js'

const cm = getClassMap()

/**
 * The reading layout for annotated + summarised prose: paragraphs on the
 * left, their summary and prompt block on the right, one row per paragraph
 * (or per paragraph GROUP when one summary covers several) — and on a phone,
 * a sticky bar at the bottom whose panel follows the reader down the page.
 *
 * The geometry rules that keep this readable (copy them wherever you put
 * summaries/annotations beside text):
 * - **The prose is the biggest thing on the page.** The body is set LARGE
 *   (1.25rem / leading 1.7) in a column of about 34rem — roughly 70
 *   characters — and that column is WIDER than the side column. A 20rem
 *   strip of body text beside a busy gutter reads like a caption, not an
 *   article.
 * - **Everything in the side column is visibly secondary**: at most 0.8x the
 *   prose font-size (0.875rem against 1.25rem here). A 1-2px difference is
 *   not a hierarchy; a reader has to SEE which one is the article.
 * - TWO columns only, from `md` up: the prose column and a narrower side
 *   column, `items-start` so each side block aligns to the TOP of the
 *   paragraph it belongs to — never `items-stretch`, which centers the
 *   block against a tall paragraph. Each row is its own grid row
 *   (`display: contents`), which is what keeps a block beside ITS paragraph
 *   instead of drifting down the page as the post gets longer.
 * - **The block FOLLOWS the reader through its section.** It is
 *   `position: sticky` (offset below the site header) inside its own grid
 *   row: a sticky grid item is bounded by its own grid AREA, so while a long
 *   section scrolls past, its summary and prompt stay pinned at the top of
 *   the gutter and release when the section ends. No script — only the row
 *   structure above.
 * - The side block renders the SUMMARY FIRST, then the prompt — that order,
 *   top to bottom — and the two look like DIFFERENT things: the summary a
 *   quiet tinted panel with a small label; the prompt the words a person
 *   typed, so it is quoted/monospaced with its own accent and the model
 *   named beside it.
 * - **Each prompt appears in exactly ONE place, ONCE.** This block is that
 *   place, and a prompt that produced three paragraphs is shown a single time
 *   against the first of them — never once per paragraph (see promptsOf).
 *   Do not also show it in a hover popover: the reader then sees the same
 *   sentence twice and neither copy explains why. Hovering a highlighted
 *   span may EMPHASISE its block; it must not duplicate it.
 * - A short paragraph needs no summary: omit it rather than padding the
 *   block to match its neighbours. One block MAY cover several paragraphs
 *   (a whole section) — group them into one row when that reads better.
 * - **At phone width (<`md`) the gutter becomes a STICKY PANEL at the bottom
 *   of the screen** (see MobileCommentary). The inline blocks are hidden —
 *   NOT stacked between paragraphs, which interrupts the article every few
 *   paragraphs, and NOT collapsed below it, which is what a two-column grid
 *   does to itself. A bar fixed to the bottom carries the same two switches
 *   as the desktop header ("Summary", "Prompt", ≥44px hit areas); turning
 *   one on slides a panel up from beneath the bar showing that content for
 *   the SECTION IN VIEW, and the panel swaps as the reader scrolls into the
 *   next section (an IntersectionObserver over the rows, topmost wins). The
 *   panel is at most ~45vh, scrolls inside itself, respects reduced motion,
 *   and the article carries bottom padding so its last paragraph clears the
 *   bar. The panel is the phone's ONE place for this material.
 */

/** A summary the build generated for the section this row covers. */
export type SectionSummary = {
  /** The TL;DR text. */
  tldr: string
  /** True when an AI provider produced it (it is itself ai-attributed). */
  ai?: boolean
  /** The prompt that asked for it (ai summaries only). */
  prompt?: string
  /** The model that wrote it (ai summaries only). */
  model?: string
}

export type ProvenanceRow = {
  /** The paragraph(s) this row covers; each entry renders as its own <p>. */
  paragraphs: ProvenanceSpan[][]
  /** The section summary covering these paragraphs; omit for short rows. */
  summary?: SectionSummary
}

/**
 * The DISTINCT prompts behind a row's ai spans.
 *
 * One prompt usually produces several paragraphs, and rendering a block per
 * SPAN then prints the same prompt two or three times down the gutter — the
 * reader sees one act of writing repeated, which looks like a rendering bug
 * because it is one. Group by prompt text, keep first appearance order.
 */
function promptsOf(row: ProvenanceRow): Array<{ prompt: string; model?: string }> {
  const byPrompt = new Map<string, { prompt: string; model?: string }>()
  for (const span of row.paragraphs.flat()) {
    if (!span.ai || !span.prompt) continue
    if (!byPrompt.has(span.prompt))
      byPrompt.set(span.prompt, { prompt: span.prompt, model: span.model })
  }
  return [...byPrompt.values()]
}

/** True when a row has anything to say beside its prose. */
function hasCommentary(row: ProvenanceRow): boolean {
  return Boolean(row.summary) || promptsOf(row).length > 0
}

/** The summary block: a quiet tinted panel with a small label. */
function SummaryBlock({ summary, id }: { summary: SectionSummary; id: string }) {
  const { t } = useTranslation()
  return (
    <div data-mol-id={id} className="rounded-md bg-surface-variant/60 px-3 py-2 leading-normal">
      <span className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-on-surface-variant">
        {t('summaries.tldr', undefined, { defaultValue: 'TL;DR' })}
      </span>
      <span className="mt-1 block">{summary.tldr}</span>
      {summary.ai ? (
        <span className="block text-xs text-on-surface-variant">
          {t('summaries.aiWritten', undefined, { defaultValue: 'AI-written' })}
          {summary.model ? ` · ${summary.model}` : ''}
        </span>
      ) : null}
    </div>
  )
}

/**
 * The prompt block: the words a PERSON typed, so it reads differently from
 * both the prose and the summary — quoted, monospaced, its own accent edge,
 * the model named with it. This is the ONE place the prompt appears.
 */
function PromptBlock({
  prompt,
  model,
  id,
  open,
}: {
  prompt: string
  model?: string
  id: string
  open: boolean
}) {
  const { t } = useTranslation()
  return (
    <details
      open={open}
      data-mol-id={id}
      className="border-l-2 border-tertiary/60 pl-2 text-[0.8125rem] leading-normal text-on-surface-variant"
    >
      <summary className="cursor-pointer list-none font-semibold text-on-surface">
        {t('provenance.promptLabel', undefined, { defaultValue: 'Prompt' })}
        {model ? <span className="ml-1 font-normal text-on-surface-variant">· {model}</span> : null}
      </summary>
      <q className="mt-1 block font-mono text-[0.75rem] leading-snug">{prompt}</q>
    </details>
  )
}

/**
 * The phone's commentary: a bar fixed to the bottom with the two switches,
 * and a panel that slides up from beneath it with the in-view section's
 * summary and prompt. Rendered only below `md`; the desktop gutter is hidden
 * there, so this is the phone's ONE place for the material.
 *
 * `activeRow` is whichever row is topmost in the viewport, tracked by the
 * parent's IntersectionObserver — the panel never needs a tap to catch up.
 */
function MobileCommentary({
  row,
  showSummaries,
  showAnnotations,
  onToggleSummaries,
  onToggleAnnotations,
}: {
  row: ProvenanceRow | null
  showSummaries: boolean
  showAnnotations: boolean
  onToggleSummaries: () => void
  onToggleAnnotations: () => void
}) {
  const { t } = useTranslation()
  const summary = showSummaries && row?.summary ? row.summary : null
  const prompts = showAnnotations && row ? promptsOf(row).slice(0, 3) : []
  const open = (showSummaries || showAnnotations) && (summary !== null || prompts.length > 0)

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 md:hidden" data-mol-id="prov-mobile">
      {/* The panel slides up from BENEATH the bar (the bar is later in DOM
          order and so paints on top). translate keeps the slide on the
          compositor; motion-reduce drops it for readers who asked. */}
      <div
        role="region"
        aria-label={t('provenance.sectionCommentary', undefined, {
          defaultValue: 'Commentary for this section',
        })}
        data-mol-id="prov-mobile-panel"
        aria-hidden={!open}
        className={cm.cn(
          'max-h-[45vh] overflow-y-auto border-t border-outline-variant bg-surface px-4 pb-3 pt-3 text-[0.9375rem] leading-normal shadow-lg transition-transform duration-200 motion-reduce:transition-none',
          open ? 'translate-y-0' : 'pointer-events-none translate-y-full',
        )}
      >
        <div className="mx-auto flex max-w-[34rem] flex-col gap-3">
          {summary ? <SummaryBlock summary={summary} id="prov-mobile-summary" /> : null}
          {prompts.map((p, k) => (
            <PromptBlock
              key={k}
              prompt={p.prompt}
              model={p.model}
              id={`prov-mobile-prompt-${k}`}
              open
            />
          ))}
        </div>
      </div>
      {/* The bar: the phone's form of the header toggles. Same switch
          semantics, and each control is ≥44px in BOTH directions. */}
      <div
        data-mol-id="prov-mobile-bar"
        className="flex items-center justify-center gap-2 border-t border-outline-variant bg-surface px-4 py-2"
      >
        <button
          type="button"
          role="switch"
          aria-checked={showSummaries}
          data-mol-id="prov-mobile-summaries"
          onClick={onToggleSummaries}
          className={cm.cn(
            'min-h-[44px] min-w-[44px] rounded-full px-4 text-sm font-medium',
            showSummaries
              ? 'bg-primary text-on-primary'
              : 'bg-surface-variant text-on-surface-variant',
          )}
        >
          {t('summaries.toggle', undefined, { defaultValue: 'Summary' })}
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={showAnnotations}
          data-mol-id="prov-mobile-prompts"
          onClick={onToggleAnnotations}
          className={cm.cn(
            'min-h-[44px] min-w-[44px] rounded-full px-4 text-sm font-medium',
            showAnnotations
              ? 'bg-primary text-on-primary'
              : 'bg-surface-variant text-on-surface-variant',
          )}
        >
          {t('provenance.toggle', undefined, { defaultValue: 'Prompt' })}
        </button>
      </div>
    </div>
  )
}

export function AnnotatedBody({
  rows,
  showAnnotations = true,
  showSummaries = true,
  onToggleSummaries,
  onToggleAnnotations,
}: {
  rows: ProvenanceRow[]
  showAnnotations?: boolean
  showSummaries?: boolean
  /**
   * The phone bar toggles the SAME state as the page's header switches; pass
   * the page's setters so both surfaces agree. Without them the bar keeps its
   * own state seeded from the props.
   */
  onToggleSummaries?: () => void
  onToggleAnnotations?: () => void
}) {
  // Local fallback state for the phone bar when the page does not own it.
  const [localSummaries, setLocalSummaries] = useState(showSummaries)
  const [localAnnotations, setLocalAnnotations] = useState(showAnnotations)
  const summariesOn = onToggleSummaries ? showSummaries : localSummaries
  const annotationsOn = onToggleAnnotations ? showAnnotations : localAnnotations

  // Which row is in view — the phone panel follows it. The `contents` row
  // wrapper has no box to observe, so observe each row's PROSE column.
  const rowRefs = useRef<Array<HTMLDivElement | null>>([])
  const [activeRow, setActiveRow] = useState(0)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const visible = new Map<number, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = Number((entry.target as HTMLElement).dataset.provRow)
          if (entry.isIntersecting) visible.set(idx, entry.boundingClientRect.top)
          else visible.delete(idx)
        }
        if (visible.size === 0) return
        // Topmost intersecting row wins — the one the reader is reading.
        let best = -1
        let bestTop = Infinity
        for (const [idx, top] of visible) {
          if (top < bestTop) {
            bestTop = top
            best = idx
          }
        }
        if (best >= 0) setActiveRow(best)
      },
      // Bias toward the upper part of the screen: a row counts as "in view"
      // once its top clears the bottom 40%, so the panel changes as the reader
      // reaches the section rather than when it is nearly gone.
      { rootMargin: '0px 0px -40% 0px', threshold: 0 },
    )
    for (const el of rowRefs.current) if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [rows.length])

  const panelOpen =
    (summariesOn || annotationsOn) && rows[activeRow] ? hasCommentary(rows[activeRow]) : false

  return (
    // items-start: each block aligns to the TOP of its paragraph.
    // The prose track is wider than the side track, and both are explicit so
    // the ratio cannot drift as content changes. Bottom padding on a phone
    // keeps the last paragraph clear of the fixed bar (and the open panel).
    <div
      className={cm.cn(
        'grid items-start gap-y-4 pb-[4.5rem] md:grid-cols-[minmax(0,34rem)_18rem] md:gap-x-10 md:pb-0',
        panelOpen ? 'pb-[calc(4.5rem+45vh)]' : '',
      )}
    >
      {rows.map((row, i) => (
        <div key={i} className="contents">
          <div
            ref={(el) => {
              rowRefs.current[i] = el
            }}
            data-prov-row={i}
            className="prose-column flex flex-col gap-4 text-[1.125rem] leading-[1.7] md:text-[1.25rem]"
          >
            {row.paragraphs.map((spans, j) => (
              <AnnotatedParagraph key={j} spans={spans} showAnnotations={annotationsOn} />
            ))}
          </div>
          {(summariesOn || annotationsOn) && hasCommentary(row) ? (
            // Desktop only: hidden below md, where MobileCommentary is the one
            // place for this. sticky + self-start + a header offset: the block
            // follows the reader through its own row and releases at its end.
            <aside
              data-mol-id={`prov-side-${i}`}
              className="side-block hidden flex-col gap-3 text-[0.875rem] leading-normal md:sticky md:top-24 md:flex md:self-start"
            >
              {row.summary && summariesOn ? (
                <SummaryBlock summary={row.summary} id={`prov-summary-${i}`} />
              ) : null}
              {annotationsOn
                ? promptsOf(row)
                    .slice(0, 3)
                    .map((s, k) => (
                      <PromptBlock
                        key={k}
                        prompt={s.prompt}
                        model={s.model}
                        id={`prov-annotation-${i}-${k}`}
                        open
                      />
                    ))
                : null}
            </aside>
          ) : (
            <div className="hidden md:block" aria-hidden="true" />
          )}
        </div>
      ))}
      <MobileCommentary
        row={rows[activeRow] ?? null}
        showSummaries={summariesOn}
        showAnnotations={annotationsOn}
        onToggleSummaries={onToggleSummaries ?? (() => setLocalSummaries((v) => !v))}
        onToggleAnnotations={onToggleAnnotations ?? (() => setLocalAnnotations((v) => !v))}
      />
    </div>
  )
}
