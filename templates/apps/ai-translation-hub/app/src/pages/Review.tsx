import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LanguagePairBadge } from '../components/LanguagePairBadge.js'
import { PageHeading } from '../components/PageHeading.js'
import { unwrapList } from '../lib/unwrap.js'

interface ReviewItem {
  id: string
  project: string
  source_lang: string
  target_lang: string
  segment_number: number
  source: string
  target: string
  proposed: string
  reviewer: string
  reason: 'tone' | 'glossary' | 'grammar' | 'low_confidence'
  comments: number
  age: string
}

interface ApiSegmentRow {
  id?: unknown
  source_lang?: unknown
  target_lang?: unknown
  source_text?: unknown
  target_text?: unknown
  machine_translation?: unknown
  position?: unknown
  reviewer_id?: unknown
  status?: unknown
  updated_at?: unknown
}

function reasonForStatus(status: string): ReviewItem['reason'] {
  if (status === 'needs_review') return 'low_confidence'
  if (status === 'in_review') return 'tone'
  return 'grammar'
}

function adaptSegment(s: ApiSegmentRow, idx: number): ReviewItem {
  return {
    id: String(s.id ?? `r_${idx}`),
    project: '',
    source_lang: String(s.source_lang ?? 'EN').toLowerCase(),
    target_lang: String(s.target_lang ?? 'ES').toLowerCase(),
    segment_number: typeof s.position === 'number' ? s.position + 1 : idx + 1,
    source: String(s.source_text ?? ''),
    target: String(s.target_text ?? ''),
    proposed: String(s.machine_translation ?? s.target_text ?? ''),
    reviewer: '',
    reason: reasonForStatus(String(s.status ?? '')),
    comments: 0,
    age: '',
  }
}

const REASON_TONE: Record<ReviewItem['reason'], string> = {
  tone: 'bg-warning-light text-warning',
  glossary: 'bg-tertiary-container/15 text-tertiary',
  grammar: 'bg-secondary-container text-on-secondary-container',
  low_confidence: 'bg-error-container text-on-error-container',
}

const REASON_LABEL: Record<ReviewItem['reason'], string> = {
  tone: 'Tone',
  glossary: 'Glossary',
  grammar: 'Grammar',
  low_confidence: 'Low confidence',
}

export function Review() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [queue, setQueue] = useState<ReadonlyArray<ReviewItem>>([])
  const [activeId, setActiveId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [decision, setDecision] = useState<{ id: string; kind: 'approved' | 'rejected' } | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/reports/review_queue')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<ApiSegmentRow>(res)
        const adapted = list.map((s, i) => adaptSegment(s, i))
        setQueue(adapted)
        if (adapted.length > 0) setActiveId(adapted[0].id)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('review.loadError', {}, { defaultValue: 'Failed to load review queue.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const active = queue.find((r) => r.id === activeId)
  const persistDecision = async (id: string, kind: 'approved' | 'rejected') => {
    const dbStatus = kind === 'approved' ? 'approved' : 'draft'
    try {
      await http.put(`/segments/${encodeURIComponent(id)}`, { status: dbStatus })
      // Domain event: a reviewer decision was committed (success point).
      void track({
        name: kind === 'approved' ? 'review.approved' : 'review.rejected',
        properties: { segment_id: id },
      })
      setDecision({ id, kind })
      setQueue((prev) => prev.filter((r) => r.id !== id))
      const next = queue.find((r) => r.id !== id)
      setActiveId(next?.id ?? '')
    } catch (_error) {
      // Persist decision failed — surface the error message to the user.
      setError(
        t(
          'review.persistError',
          {},
          { defaultValue: 'Could not save the decision. Please try again.' },
        ),
      )
    }
  }
  const handleApprove = () => {
    if (!active) return
    void persistDecision(active.id, 'approved')
  }
  const handleReject = () => {
    if (!active) return
    void persistDecision(active.id, 'rejected')
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'lg' }),
        cm.sp('p', 8),
        cm.maxW('7xl'),
        cm.mxAuto,
        cm.minH('screen'),
        'w-full',
      )}
    >
      <PageHeading
        eyebrow={t('review.eyebrow', {}, { defaultValue: 'Review queue' })}
        title={t('review.title', {}, { defaultValue: 'Segments awaiting review' })}
        subtitle={t(
          'review.subtitle',
          {},
          { defaultValue: 'Segments awaiting reviewer attention.' },
        )}
      />

      {loading && (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('review.loading', {}, { defaultValue: 'Loading review queue\u2026' })}
        </p>
      )}

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl bg-error-container text-on-error-container text-sm',
          )}
        >
          {error}
        </div>
      )}

      {decision && (
        <div
          role="status"
          className={cm.cn(
            cm.sp('p', 3),
            'rounded-xl bg-primary-fixed/40 text-on-primary-fixed text-sm',
          )}
        >
          {decision.kind === 'approved'
            ? t('review.decisionApproved', {}, { defaultValue: 'Translation approved.' })
            : t('review.decisionRejected', {}, { defaultValue: 'Translation rejected.' })}
        </div>
      )}

      {!loading && queue.length === 0 && !error && (
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.textCenter,
            cm.sp('py', 12),
            'text-on-surface-variant',
          )}
        >
          {t('review.empty', {}, { defaultValue: 'No segments need review right now. Nice work.' })}
        </p>
      )}

      {queue.length > 0 && (
        <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-start')}>
          {/* Queue list */}
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'lg:col-span-4')}>
            {queue.map((item) => {
              const isActive = item.id === activeId
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('p', 4),
                      'text-left rounded-xl border transition-colors',
                      isActive
                        ? 'border-primary bg-primary-fixed/40'
                        : 'border-surface-container/50 bg-surface-container-lowest hover:border-primary/30 hover:bg-surface-container-low',
                    )}
                  >
                    <div
                      className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}
                    >
                      <span
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          cm.textSize('sm'),
                          'text-on-background line-clamp-1',
                        )}
                      >
                        {item.project}
                      </span>
                      <span
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest',
                          REASON_TONE[item.reason],
                        )}
                      >
                        {t(
                          `review.reason.${item.reason}`,
                          {},
                          { defaultValue: REASON_LABEL[item.reason] },
                        )}
                      </span>
                    </div>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 2))}>
                      <LanguagePairBadge
                        source={item.source_lang}
                        target={item.target_lang}
                        size="sm"
                      />
                      <span
                        className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}
                      >
                        {t(
                          'review.segmentRef',
                          { number: item.segment_number },
                          { defaultValue: 'Seg {{number}}' },
                        )}
                      </span>
                    </div>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mt', 2),
                        'text-on-surface-variant line-clamp-2 leading-relaxed',
                      )}
                    >
                      {item.source}
                    </p>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('mt', 3),
                        cm.textSize('xs'),
                        'text-on-surface-variant font-mono',
                      )}
                    >
                      <span>{item.reviewer}</span>
                      <span>{item.age}</span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>

          {/* Diff pane */}
          {active && (
            <section
              className={cm.cn(
                cm.sp('p', 6),
                cm.flex({ direction: 'col', gap: 'lg' }),
                'lg:col-span-8 bg-surface-container-lowest rounded-2xl border border-surface-container/50 shadow-sm',
              )}
            >
              <header
                className={cm.cn(
                  cm.flex({ align: 'start', justify: 'between', wrap: 'wrap', gap: 'md' }),
                )}
              >
                <div>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-bold uppercase tracking-widest text-primary',
                    )}
                  >
                    {t(
                      'review.activeEyebrow',
                      { number: active.segment_number },
                      { defaultValue: 'Segment {{number}}' },
                    )}
                  </p>
                  <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight mt-1')}>
                    {active.project}
                  </h2>
                </div>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] uppercase tracking-widest',
                      REASON_TONE[active.reason],
                    )}
                  >
                    {t(
                      `review.reason.${active.reason}`,
                      {},
                      { defaultValue: REASON_LABEL[active.reason] },
                    )}
                  </span>
                </div>
              </header>

              <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
                <div
                  className={cm.cn(
                    cm.sp('p', 4),
                    'bg-source-pane rounded-lg font-serif-content text-sm border-l-4 border-l-secondary',
                  )}
                >
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('mb', 2),
                      'uppercase tracking-widest font-bold text-on-surface-variant',
                    )}
                  >
                    {t('review.sourceLabel', {}, { defaultValue: 'Source' })}
                  </p>
                  {active.source}
                </div>
                <div
                  className={cm.cn(
                    cm.sp('p', 4),
                    'bg-target-pane rounded-lg font-serif-content text-sm border-l-4 border-l-warning',
                  )}
                >
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('mb', 2),
                      'uppercase tracking-widest font-bold text-warning',
                    )}
                  >
                    {t('review.currentLabel', {}, { defaultValue: 'Current translation' })}
                  </p>
                  {active.target}
                </div>
              </div>

              <div
                className={cm.cn(
                  cm.sp('p', 4),
                  'bg-success-light rounded-lg font-serif-content text-sm border-l-4 border-l-success',
                )}
              >
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mb', 2),
                    'uppercase tracking-widest font-bold text-success',
                  )}
                >
                  {t('review.proposedLabel', {}, { defaultValue: 'Proposed' })}
                </p>
                {active.proposed}
              </div>

              <footer
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
                )}
              >
                <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
                  {t(
                    'review.commentsCount',
                    { count: active.comments, reviewer: active.reviewer },
                    { defaultValue: '{{count}} comments · reviewed by {{reviewer}}' },
                  )}
                </span>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <button
                    data-mol-id="review-reject"
                    onClick={handleReject}
                    type="button"
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 2),
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'rounded-full border border-outline-variant/40 text-on-surface hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('review.reject', {}, { defaultValue: 'Reject' })}
                  </button>
                  <button
                    data-mol-id="review-approve"
                    onClick={handleApprove}
                    type="button"
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 2),
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'rounded-full inline-flex items-center gap-1 text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 transition-opacity shadow-sm shadow-primary/30',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      check
                    </span>
                    {t('review.approve', {}, { defaultValue: 'Approve translation' })}
                  </button>
                </div>
              </footer>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

export default Review
export { Review as ReviewPage }
