import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useGet, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ProgressRing } from '../components/ProgressRing.js'
import { type ObjectiveRow, toNumber, uiStatus } from '../lib/api.js'

interface ReviewRow {
  id: string
  owner_id: string
  period_id: string | null
  employee_user_id: string
  reviewer_user_id: string
  summary: string | null
  rating: number | null
  status: 'draft' | 'in_progress' | 'completed'
  submitted_at: string | null
  created_at: string
  updated_at: string
}

function ratingFraction(rating: number | null): number {
  if (rating == null) return 0
  return Math.max(0, Math.min(1, rating / 5))
}

function gradeLetter(rating: number | null): string {
  if (rating == null) return '—'
  if (rating >= 5) return 'A'
  if (rating >= 4) return 'B'
  if (rating >= 3) return 'C'
  if (rating >= 2) return 'D'
  return 'F'
}

function reviewStatusLabel(s: ReviewRow['status']): string {
  if (s === 'in_progress') return 'In progress'
  if (s === 'completed') return 'Completed'
  return 'Draft'
}

const OBJ_STATUS_LABEL: Record<string, string> = {
  'on-track': 'On track',
  'at-risk': 'At risk',
  behind: 'Behind',
  completed: 'Completed',
  'not-started': 'Not started',
}

export function ReviewDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const client = useHttpClient()

  const {
    data: review,
    loading: reviewLoading,
    error: reviewError,
    execute: refetch,
  } = useGet<ReviewRow>(id ? `/api/reviews/${id}` : '/api/reviews/missing', {
    immediate: Boolean(id),
  })
  const { data: objectives } = useGet<ObjectiveRow[]>('/api/objectives?archived=false', {
    immediate: true,
  })

  const [draftSummary, setDraftSummary] = useState('')
  const [draftRating, setDraftRating] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!review) return
    setDraftSummary(review.summary ?? '')
    setDraftRating(review.rating)
  }, [review])

  const objectiveRows = objectives ?? []

  const submit = async (status: 'draft' | 'in_progress' | 'completed'): Promise<void> => {
    if (!id) return
    setError(null)
    if (status === 'completed') setSubmitting(true)
    else setSaving(true)
    try {
      await client.patch<ReviewRow>(`/api/reviews/${id}`, {
        summary: draftSummary,
        rating: draftRating,
        status,
      })
      // Domain event (fire-and-forget; no-ops without an analytics provider).
      if (status === 'completed') {
        track({ name: 'review.submitted', properties: { review_id: id, rating: draftRating } })
      }
      setFeedback(
        status === 'completed'
          ? t('reviewDetail.submittedToast', {}, { defaultValue: 'Review submitted' })
          : t('common.saved', {}, { defaultValue: 'Saved' }),
      )
      void refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
      setSubmitting(false)
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!id) return
    if (
      !window.confirm(
        t('reviewDetail.confirmDelete', {}, { defaultValue: 'Delete this review draft?' }),
      )
    )
      return
    setDeleting(true)
    setError(null)
    try {
      await client.delete(`/api/reviews/${id}`)
      navigate('/reviews')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setDeleting(false)
    }
  }

  if (!id) {
    return (
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t('reviewDetail.missingId', {}, { defaultValue: 'Missing review ID' })}
      </p>
    )
  }

  if (reviewLoading) {
    return (
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t('reviewDetail.loading', {}, { defaultValue: 'Loading review…' })}
      </p>
    )
  }

  if (reviewError || !review) {
    return (
      <div className={cm.cn(cm.stack(4))}>
        <Link
          to="/reviews"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            'text-sm font-bold text-indigo-700 hover:text-indigo-900 inline-block',
          )}
        >
          ← {t('reviewDetail.backToList', {}, { defaultValue: 'Back to reviews' })}
        </Link>
        <p
          role="alert"
          data-testid="review-error"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-xl bg-error-light text-error border border-red-200',
          )}
        >
          {t(
            'reviewDetail.notFound',
            {},
            { defaultValue: 'Review not found or you do not have access.' },
          )}
        </p>
      </div>
    )
  }

  const isCompleted = review.status === 'completed'

  return (
    <div className={cm.cn(cm.stack(8))} data-testid="review-detail">
      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          'text-on-surface-variant',
        )}
      >
        <Link to="/reviews" className={cm.cn('hover:text-indigo-700 transition-colors')}>
          {t('nav.reviews', {}, { defaultValue: 'Reviews' })}
        </Link>
        <span aria-hidden>/</span>
        <span data-testid="review-status" className="font-semibold text-on-surface">
          {t(
            `reviews.status.${review.status}` as 'reviews.status.draft',
            {},
            { defaultValue: reviewStatusLabel(review.status) },
          )}
        </span>
      </nav>

      <header
        className={cm.cn('relative overflow-hidden rounded-[2rem] text-white', cm.sp('p', 8))}
        style={{
          background:
            'linear-gradient(135deg, var(--color-nav-bg) 0%, #6d28d9 50%, var(--color-secondary) 100%)',
        }}
      >
        <div
          aria-hidden
          className={cm.cn(
            'absolute -right-20 -top-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
          )}
        />
        <div
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'center', gap: 'lg' }),
            'relative flex-col md:flex-row',
          )}
        >
          <div className={cm.cn(cm.stack(3), 'max-w-2xl')}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-[0.22em] text-sky-200',
              )}
            >
              {t(
                'reviewDetail.eyebrow',
                {
                  status: t(
                    `reviews.status.${review.status}` as 'reviews.status.draft',
                    {},
                    { defaultValue: reviewStatusLabel(review.status) },
                  ),
                  date: review.submitted_at
                    ? new Date(review.submitted_at).toLocaleDateString()
                    : new Date(review.updated_at).toLocaleDateString(),
                },
                { defaultValue: '{{status}} · {{date}}' },
              )}
            </span>
            <h1
              data-testid="review-title"
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.05] text-white',
              )}
            >
              {review.summary && review.summary.trim().length > 0
                ? review.summary.split('\n')[0]?.slice(0, 140)
                : t(
                    'reviewDetail.untitled',
                    {},
                    { defaultValue: 'Quarterly review · click below to edit' },
                  )}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), 'text-indigo-100 leading-relaxed')}>
              {t(
                'reviewDetail.body',
                {
                  count: objectiveRows.length,
                  grade: gradeLetter(review.rating),
                },
                {
                  defaultValue:
                    '{{count}} active objective(s) · grade {{grade}}. Edit reflections and grade below.',
                },
              )}
            </p>
          </div>
          <ProgressRing
            value={ratingFraction(review.rating) * 100}
            size={150}
            stroke={13}
            status={isCompleted ? 'completed' : 'on-track'}
            label={t('reviewDetail.scoreLabel', {}, { defaultValue: 'Avg score' })}
            className="text-white"
          />
        </div>
      </header>

      <section className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }))}>
        <div className={cm.cn('col-span-12 lg:col-span-8', cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}>
            {t('reviewDetail.scorecardHeading', {}, { defaultValue: 'Scorecard' })}
          </h2>
          <div
            className={cm.cn(
              'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden',
            )}
          >
            {objectiveRows.length === 0 ? (
              <p className={cm.cn(cm.sp('p', 6), cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'reviewDetail.noObjectives',
                  {},
                  { defaultValue: 'No active objectives — create some on the dashboard.' },
                )}
              </p>
            ) : (
              <table className={cm.cn('w-full')}>
                <thead>
                  <tr className="bg-surface-container-low text-left">
                    <th
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 3),
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('reviewDetail.colObjective', {}, { defaultValue: 'Objective' })}
                    </th>
                    <th
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 3),
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-on-surface-variant text-right',
                      )}
                    >
                      {t('nav.progress', {}, { defaultValue: 'Progress' })}
                    </th>
                    <th
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 3),
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-on-surface-variant text-right',
                      )}
                    >
                      {t('nav.status', {}, { defaultValue: 'Status' })}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {objectiveRows.map((obj) => {
                    const status = uiStatus(obj.status)
                    const pillClass =
                      status === 'on-track'
                        ? 'bg-success-light text-success-text'
                        : status === 'at-risk'
                          ? 'bg-warning-light text-warning'
                          : 'bg-error-light text-error'
                    return (
                      <tr
                        key={obj.id}
                        data-testid={`scorecard-${obj.id}`}
                        className={cm.cn('hover:bg-surface-container-low transition-colors')}
                      >
                        <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4))}>
                          <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                            {obj.title}
                          </p>
                        </td>
                        <td
                          className={cm.cn(
                            cm.sp('px', 5),
                            cm.sp('py', 4),
                            'text-right tabular-nums font-bold text-on-surface',
                          )}
                        >
                          {toNumber(obj.progress)}%
                        </td>
                        <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4), 'text-right')}>
                          <span
                            className={cm.cn(
                              cm.fontWeight('bold'),
                              'text-[11px] uppercase tracking-widest px-2.5 py-1 rounded-full',
                              pillClass,
                            )}
                          >
                            {t(
                              `objectiveDetail.status.${status}` as 'objectiveDetail.status.on-track',
                              {},
                              { defaultValue: OBJ_STATUS_LABEL[status] ?? status },
                            )}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <aside className={cm.cn('col-span-12 lg:col-span-4', cm.stack(4))}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(3),
              'rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 border border-indigo-100',
            )}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-indigo-700',
              )}
            >
              <span className="material-symbols-outlined text-[16px]">tips_and_updates</span>
              {t('reviewDetail.reflectionsHeading', {}, { defaultValue: 'Reflections' })}
            </span>
            <textarea
              value={draftSummary}
              onChange={(e) => setDraftSummary(e.target.value)}
              disabled={isCompleted}
              data-testid="review-summary-input"
              rows={6}
              className={cm.cn(
                cm.sp('p', 3),
                'rounded-xl bg-surface text-on-surface ring-1 ring-indigo-100 focus:ring-indigo-600 focus:outline-none disabled:opacity-60',
              )}
              placeholder={t(
                'reviewDetail.reflectionsPlaceholder',
                {},
                { defaultValue: 'What went well? What didn’t? Notes for next quarter.' },
              )}
            />
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              {/* Fixed dark ink — the card keeps its light indigo tint in dark
                  mode, so a theme-flipping text token would be unreadable. */}
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-indigo-900/70',
                )}
              >
                {t('form.rating', {}, { defaultValue: 'Rating' })}
              </span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDraftRating(n)}
                  disabled={isCompleted}
                  data-testid={`review-rating-${n}`}
                  aria-pressed={draftRating === n}
                  className={cm.cn(
                    'w-8 h-8 rounded-full font-bold text-sm tabular-nums transition-colors disabled:opacity-60',
                    draftRating === n
                      ? 'bg-primary text-on-primary shadow'
                      : 'bg-surface text-on-surface ring-1 ring-outline-variant hover:bg-surface-container',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          {feedback && (
            <p
              role="status"
              data-testid="review-feedback"
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                'rounded-xl bg-success-light text-success-text border border-emerald-200',
              )}
            >
              {feedback}
            </p>
          )}
          {error && (
            <p
              role="alert"
              data-testid="review-error"
              className={cm.cn(
                cm.sp('p', 3),
                cm.textSize('sm'),
                'rounded-xl bg-error-light text-error border border-red-200',
              )}
            >
              {error}
            </p>
          )}
          <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
            <button
              type="button"
              onClick={() => submit('draft')}
              disabled={saving || isCompleted}
              data-testid="review-save"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                cm.flex1,
                'rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors disabled:opacity-60',
              )}
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveDraft', {}, { defaultValue: 'Save draft' })}
            </button>
            <button
              type="button"
              onClick={() => submit('completed')}
              disabled={submitting || isCompleted}
              data-testid="review-submit"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                cm.flex1,
                'rounded-xl bg-primary text-on-primary hover:opacity-90 transition-colors disabled:opacity-60',
              )}
            >
              {submitting
                ? t('common.submittingEllipsis', {}, { defaultValue: 'Submitting…' })
                : isCompleted
                  ? t('reviewDetail.submitted', {}, { defaultValue: 'Submitted' })
                  : t('common.submit', {}, { defaultValue: 'Submit' })}
            </button>
          </div>
          {!isCompleted && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              data-testid="review-delete"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'rounded-xl text-error hover:bg-error-light transition-colors disabled:opacity-60',
              )}
            >
              {deleting
                ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
                : t('reviewDetail.delete', {}, { defaultValue: 'Delete draft' })}
            </button>
          )}
        </aside>
      </section>
    </div>
  )
}

export default ReviewDetail
