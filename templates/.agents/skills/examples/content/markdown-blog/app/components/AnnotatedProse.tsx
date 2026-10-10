import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

/**
 * One machine-written span inside a paragraph, with its provenance on hover.
 *
 * The geometry rules that keep this from rendering badly (copy them wherever
 * you highlight AI-written text):
 * - The highlight is an INLINE element (`mark`) around runs of text inside a
 *   normal block paragraph. Never wrap the whole `<p>` in a box, and never
 *   give the highlight vertical padding — `box-decoration-break: clone` plus
 *   horizontal padding only, so a highlight spanning several lines stays
 *   text-shaped instead of becoming a tall narrow box.
 * - The hover detail is a REAL child element with the MODEL text in the DOM
 *   (never an empty container waiting for JS): positioned absolutely above the
 *   mark, `max-width` + `width: max-content` so it is as wide as its text and
 *   no wider, hidden until `:hover`/`:focus-within`. The text is in the HTML,
 *   so it works without JavaScript for the reveal styling and is readable by
 *   crawlers/tests.
 * - The PROMPT is deliberately NOT repeated here. It has exactly one home —
 *   the section's side block, which names it against the first paragraph it
 *   produced (see AnnotatedBody's own rules) — and a hover popover carrying
 *   the same sentence showed the reader the same words twice, with neither
 *   copy explaining why. Hover reveals the model; the block holds the prompt.
 */
export type ProvenanceSpan = {
  /** The text of this run. */
  text: string
  /** True when an assistant produced this run in a transcript. */
  ai: boolean
  /** The human prompt that preceded it (ai spans only). */
  prompt?: string
  /** The model that wrote it, as named in the transcript (ai spans only). */
  model?: string
}

export function AnnotatedParagraph({
  spans,
  showAnnotations = true,
}: {
  spans: ProvenanceSpan[]
  showAnnotations?: boolean
}) {
  const { t } = useTranslation()
  return (
    <p className={cm.cn('leading-relaxed')}>
      {spans.map((s, i) =>
        s.ai && showAnnotations ? (
          <mark
            key={i}
            data-mol-id={`prov-ai-${i}`}
            className="prov-ai group relative inline bg-primary-container/60 text-inherit [box-decoration-break:clone] dark:bg-primary-container/40"
          >
            {s.text}
            <span
              role="tooltip"
              data-mol-id={`prov-detail-${i}`}
              className="invisible absolute bottom-full left-0 z-10 mb-2 w-max max-w-sm rounded-lg border border-outline-variant bg-surface-container-highest p-3 text-left text-xs font-normal not-italic leading-normal text-on-surface shadow-lg group-hover:visible group-focus-within:visible"
            >
              {/* Model only — the prompt lives once, in the section block (see
                  the module rules above and AnnotatedBody). */}
              <span className="block font-semibold">
                {t('provenance.model', undefined, { defaultValue: 'Model' })}: {s.model}
              </span>
            </span>
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </p>
  )
}
