import type { ReactElement, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CitationChip } from './CitationChip.js'
import { RelevancePill } from './RelevancePill.js'

export interface AnswerCitation {
  id: string
  title: string
  reference?: string
  excerpt: string
  /** Top-1 chunk relevance score 0..1 or 0..100. */
  relevance: number
}

interface AnswerCardProps {
  /** Question that produced the answer. */
  question: string
  /** Body paragraphs of the answer; citation positions are encoded as [N]. */
  paragraphs: ReadonlyArray<string>
  /** Citation list \u2014 indexes inside paragraphs are 1-based. */
  citations: ReadonlyArray<AnswerCitation>
  /** Time it took to retrieve and generate, e.g. "1.4s". */
  responseTime?: string
  /** Optional model label, e.g. "Claude Sonnet 4". */
  modelName?: string
}

/**
 * Q&A answer card \u2014 question header, AI answer body with inline citation
 * chips, citation panel below, response-time pill in the corner.
 *
 * Translated from blog/ArticleListItem editorial typography + ai-data-analyst's
 * InsightFeedCard layout. Citation chips re-use the inline pattern from
 * DESIGN.md "Citation pill (inline)".
 */
export function AnswerCard({
  question,
  paragraphs,
  citations,
  responseTime,
  modelName,
}: AnswerCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <article
      className={cm.cn(
        cm.sp('p', 8),
        cm.flex({ direction: 'col', gap: 'md' }),
        'rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm relative overflow-hidden',
      )}
    >
      <div className={cm.flex({ align: 'start', justify: 'between', gap: 'md' })}>
        <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
          <span
            className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-primary font-bold')}
            style={{ fontSize: 10 }}
          >
            {t('answerCard.eyebrow', {}, { defaultValue: 'Question' })}
          </span>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              'font-bold tracking-tight text-on-surface leading-snug',
            )}
          >
            {question}
          </h2>
        </div>
        {responseTime ? (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              'rounded-full bg-primary-container text-on-primary-container font-bold tabular-nums shrink-0',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              style={{ fontSize: 14 }}
              aria-hidden="true"
            >
              bolt
            </span>
            {responseTime}
          </span>
        ) : null}
      </div>

      <div
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'sm' }),
          cm.textSize('base'),
          'text-on-surface leading-relaxed',
        )}
      >
        {paragraphs.map((para, i) => (
          <p key={i}>{renderInline(para, citations)}</p>
        ))}
      </div>

      {citations.length > 0 ? (
        <div
          className={cm.cn(
            cm.sp('pt', 5),
            cm.flex({ direction: 'col', gap: 'sm' }),
            'border-t border-outline-variant/40',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest font-bold text-on-surface-variant',
            )}
            style={{ fontSize: 10 }}
          >
            {t(
              'answerCard.sources',
              { count: citations.length },
              { defaultValue: `Sources \u00b7 ${citations.length}` },
            )}
          </span>
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {citations.map((c, i) => (
              <li key={c.id} className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'rounded-full font-bold tabular-nums shrink-0',
                  )}
                  style={{
                    background: 'var(--color-primary-light)',
                    color: 'var(--color-primary-dark)',
                    minWidth: 24,
                    height: 24,
                    fontSize: 12,
                  }}
                >
                  {i + 1}
                </span>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'min-w-0 flex-1')}>
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        'font-semibold text-on-surface line-clamp-1',
                      )}
                    >
                      {c.title}
                    </span>
                    <RelevancePill value={c.relevance} />
                  </div>
                  {c.reference ? (
                    <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
                      {c.reference}
                    </span>
                  ) : null}
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant leading-relaxed line-clamp-2',
                    )}
                  >
                    {c.excerpt}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {modelName ? (
        <div
          className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant flex items-center gap-1')}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontSize: 14 }}
            aria-hidden="true"
          >
            smart_toy
          </span>
          {t(
            'answerCard.poweredBy',
            { model: modelName },
            { defaultValue: `Answered by ${modelName}` },
          )}
        </div>
      ) : null}
    </article>
  )
}

function renderInline(text: string, citations: ReadonlyArray<AnswerCitation>): ReactNode[] {
  const out: Array<string | ReactElement> = []
  const re = /\[(\d+)\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const idx = parseInt(m[1], 10)
    const cite = citations[idx - 1]
    if (cite) {
      out.push(
        <CitationChip
          key={`${m.index}-${idx}`}
          index={idx}
          title={cite.title}
          reference={cite.reference}
          excerpt={cite.excerpt}
        />,
      )
    } else {
      out.push(m[0])
    }
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
