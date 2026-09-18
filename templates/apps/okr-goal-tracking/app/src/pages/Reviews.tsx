import { useState } from 'react'
import { Link } from 'react-router'

import { useGet, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ProgressRing } from '../components/ProgressRing.js'

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

const STATUS_PILL: Record<ReviewRow['status'], string> = {
  draft: 'bg-warning-light text-warning',
  in_progress: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-success-light text-success-text',
}

function ratingToGrade(rating: number | null): string {
  if (rating == null) return '—'
  if (rating >= 5) return 'A'
  if (rating >= 4) return 'B'
  if (rating >= 3) return 'C'
  if (rating >= 2) return 'D'
  return 'F'
}

function ratingFraction(rating: number | null): number {
  if (rating == null) return 0
  return Math.max(0, Math.min(1, rating / 5))
}

function reviewStatusLabel(s: ReviewRow['status']): string {
  if (s === 'in_progress') return 'In progress'
  if (s === 'completed') return 'Completed'
  return 'Draft'
}

export function Reviews() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const client = useHttpClient()

  const {
    data,
    loading,
    error,
    execute: refetch,
  } = useGet<ReviewRow[]>('/api/reviews', { immediate: true })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const reviews = data ?? []

  const createDraft = async (): Promise<void> => {
    setCreating(true)
    setCreateError(null)
    try {
      // Self-review draft (employee == reviewer == caller). Useful as the
      // "start a quarterly retrospective" CTA on a fresh workspace.
      // /api/users/me returns either the user record directly or `{ props }`
      // depending on which middleware ran — accept either shape.
      const meRes = await client.get<unknown>('/api/users/me')
      const meData = meRes.data as { id?: string; props?: { id?: string } } | null
      const employeeId = meData?.id ?? meData?.props?.id
      if (!employeeId) {
        setCreateError(
          t(
            'reviews.error.noUser',
            {},
            { defaultValue: 'Could not determine the signed-in user.' },
          ),
        )
        return
      }
      await client.post<ReviewRow>('/api/reviews', {
        employee_user_id: employeeId,
        reviewer_user_id: employeeId,
        status: 'draft',
        summary: '',
      })
      void refetch()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className={cm.cn(cm.stack(8))} data-testid="reviews-page">
      <header className={cm.cn(cm.flex({ justify: 'between', align: 'end', gap: 'md' }))}>
        <div className={cm.cn(cm.stack(2))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-[0.22em] text-indigo-700',
            )}
          >
            {t('reviews.eyebrow', {}, { defaultValue: 'Quarter retrospectives' })}
          </span>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
            style={{ color: 'var(--color-heading-ink)' }}
          >
            {t('nav.reviews', {}, { defaultValue: 'Reviews' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
            {t(
              'reviews.subheading',
              {},
              {
                defaultValue:
                  'Roll-up scorecards, headline reflections, and grades from the quarters that came before.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={createDraft}
          disabled={creating}
          data-testid="reviews-create-draft"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-xl bg-primary text-on-primary hover:opacity-90 transition-colors disabled:opacity-60',
          )}
        >
          {creating
            ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
            : t('reviews.createDraft', {}, { defaultValue: 'Start a draft' })}
        </button>
      </header>

      {createError && (
        <p
          role="alert"
          data-testid="reviews-error"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-xl bg-error-light text-error border border-red-200',
          )}
        >
          {createError}
        </p>
      )}

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('reviews.loading', {}, { defaultValue: 'Loading reviews…' })}
        </p>
      ) : error ? (
        <p
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-xl bg-error-light text-error border border-red-200',
          )}
        >
          {t('reviews.error', {}, { defaultValue: 'Could not load reviews. Try again later.' })}
        </p>
      ) : reviews.length === 0 ? (
        <div
          data-testid="reviews-empty"
          className={cm.cn(
            cm.sp('p', 8),
            cm.stack(3),
            'rounded-2xl border border-dashed border-outline-variant text-center',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), 'font-bold text-on-surface')}>
            {t('reviews.empty.heading', {}, { defaultValue: 'No reviews yet' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'reviews.empty.body',
              {},
              {
                defaultValue:
                  'Quarterly reviews appear here once you start a draft. Click "Start a draft" above to begin.',
              },
            )}
          </p>
        </div>
      ) : (
        <section data-testid="reviews-list" className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }))}>
          {reviews.map((review) => {
            const fraction = ratingFraction(review.rating)
            const status = review.status
            return (
              <Link
                key={review.id}
                to={`/reviews/${review.id}`}
                data-testid={`review-${review.id}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.flex({ align: 'center', gap: 'lg' }),
                  'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200',
                )}
              >
                <ProgressRing
                  value={fraction * 100}
                  size={96}
                  stroke={9}
                  status={fraction > 0.75 ? 'on-track' : fraction > 0.5 ? 'at-risk' : 'behind'}
                />
                <div className={cm.cn(cm.flex1, cm.stack(2), 'min-w-0')}>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {new Date(review.updated_at).toLocaleDateString()}
                    </span>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full',
                        STATUS_PILL[status],
                      )}
                    >
                      {t(
                        `reviews.status.${status}` as 'reviews.status.draft',
                        {},
                        { defaultValue: reviewStatusLabel(status) },
                      )}
                    </span>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700',
                      )}
                    >
                      {t(
                        'reviews.grade',
                        { grade: ratingToGrade(review.rating) },
                        { defaultValue: 'Grade {{grade}}' },
                      )}
                    </span>
                  </div>
                  <h2
                    className={cm.cn(cm.textSize('lg'), 'font-bold tracking-tight text-on-surface')}
                  >
                    {review.summary && review.summary.trim().length > 0
                      ? review.summary.split('\n')[0]?.slice(0, 140)
                      : t(
                          'reviews.untitled',
                          {},
                          { defaultValue: 'Untitled review · click to edit' },
                        )}
                  </h2>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {review.submitted_at
                      ? t(
                          'reviews.submittedAt',
                          { date: new Date(review.submitted_at).toLocaleDateString() },
                          { defaultValue: 'Submitted {{date}}' },
                        )
                      : t('reviews.notSubmitted', {}, { defaultValue: 'Not submitted yet' })}
                  </p>
                </div>
                <span
                  aria-hidden
                  className="material-symbols-outlined text-on-surface-variant text-[24px]"
                >
                  arrow_forward
                </span>
              </Link>
            )
          })}
        </section>
      )}
    </div>
  )
}

export default Reviews
