import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { KpiCard } from '../components/KpiCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface Review {
  id: string
  employee_name: string
  employee_initial: string
  role: string
  manager_name: string
  cycle: string
  status: 'not_started' | 'in_progress' | 'complete'
  self_review_done: boolean
  manager_review_done: boolean
  rating: 'exceeds' | 'meets' | 'below' | null
  due_date: string
  goals_total: number
  goals_done: number
}

const STATUS_PILL: Record<Review['status'], string> = {
  not_started: 'bg-surface-container-low text-on-surface-variant',
  in_progress: 'bg-warning/15 text-warning',
  complete: 'bg-success/10 text-success',
}

const STATUS_LABEL: Record<Review['status'], string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
}

const RATING_PILL: Record<NonNullable<Review['rating']>, string> = {
  exceeds: 'bg-success/10 text-success',
  meets: 'bg-primary/10 text-primary-dark',
  below: 'bg-error/10 text-error',
}

const RATING_LABEL: Record<NonNullable<Review['rating']>, string> = {
  exceeds: 'Exceeds',
  meets: 'Meets',
  below: 'Below',
}

export function Performance() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/performance')
      .then((res) => {
        if (!cancelled) setReviews(unwrapList<Review>(res))
      })
      .catch(() => {
        if (!cancelled) setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const counts = useMemo(() => {
    const total = reviews.length
    const complete = reviews.filter((r) => r.status === 'complete').length
    const inProgress = reviews.filter((r) => r.status === 'in_progress').length
    const notStarted = reviews.filter((r) => r.status === 'not_started').length
    return { total, complete, inProgress, notStarted }
  }, [reviews])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(6))}>
      <header>
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary-dark')}>
          {t('performance.eyebrow', {}, { defaultValue: 'H1 2026 review cycle' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 2),
            cm.textSize('4xl'),
            'font-extrabold tracking-tight text-on-surface',
          )}
        >
          {t('performance.heading', {}, { defaultValue: 'Performance' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
          {t(
            'performance.subheading',
            {},
            { defaultValue: 'Goals, reviews, and 1:1s for the half. Due May 15.' },
          )}
        </p>
      </header>

      <div className={cm.grid({ cols: 4, gap: 'md' })}>
        <KpiCard
          icon="group"
          label={t('performance.kpi.cycle', {}, { defaultValue: 'In cycle' })}
          value={counts.total}
        />
        <KpiCard
          icon="task_alt"
          label={t('common.complete', {}, { defaultValue: 'Complete' })}
          value={counts.complete}
          trend={{
            delta: `${Math.round((counts.complete / Math.max(counts.total, 1)) * 100)}%`,
            direction: 'up',
            tone: 'good',
          }}
        />
        <KpiCard
          icon="hourglass"
          label={t('status.inProgress', {}, { defaultValue: 'In progress' })}
          value={counts.inProgress}
        />
        <KpiCard
          icon="alarm"
          label={t('performance.kpi.notStarted', {}, { defaultValue: 'Not started' })}
          value={counts.notStarted}
          trend={{ delta: 'nudge', direction: 'flat', tone: 'warn' }}
          hint={t('performance.kpi.dueHint', {}, { defaultValue: 'Due May 15 — send reminders.' })}
        />
      </div>

      <section
        className={cm.cn(
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm overflow-hidden',
        )}
      >
        <header
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
            'border-b border-outline-variant/20',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
            {t('performance.reviewsHeading', {}, { defaultValue: 'Review status' })}
          </h2>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
            )}
          >
            {t('performance.due', {}, { defaultValue: 'Cycle ends May 15' })}
          </span>
        </header>
        {loading ? (
          <p className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : error ? (
          <p className={cm.cn(cm.sp('p', 8), 'text-error')}>{error}</p>
        ) : reviews.length === 0 ? (
          <p className={cm.cn(cm.sp('p', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('performance.empty', {}, { defaultValue: 'No reviews scheduled.' })}
          </p>
        ) : (
          <ul className={cm.cn('divide-y divide-outline-variant/20')}>
            {reviews.map((r) => (
              <li
                key={r.id}
                className={cm.cn(cm.sp('p', 5), cm.flex({ align: 'center', gap: 'md' }))}
              >
                <span
                  className={cm.cn(
                    'grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary-dark font-bold shrink-0',
                  )}
                >
                  {r.employee_initial}
                </span>
                <div className={cm.cn('min-w-0 flex-1')}>
                  <p className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}>
                    {r.employee_name}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {r.role} ·{' '}
                    {t(
                      'performance.managerLabel',
                      { name: r.manager_name },
                      { defaultValue: 'manager: {{name}}' },
                    )}
                  </p>
                </div>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0')}>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      'rounded-full text-[10px] font-black uppercase tracking-widest',
                      STATUS_PILL[r.status],
                    )}
                  >
                    {t(
                      `performance.status.${r.status}`,
                      {},
                      { defaultValue: STATUS_LABEL[r.status] },
                    )}
                  </span>
                  {r.rating ? (
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        'rounded-full text-[10px] font-black uppercase tracking-widest',
                        RATING_PILL[r.rating],
                      )}
                    >
                      {t(
                        `performance.rating.${r.rating}`,
                        {},
                        { defaultValue: RATING_LABEL[r.rating] },
                      )}
                    </span>
                  ) : (
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        'rounded-full text-[10px] font-black uppercase tracking-widest text-on-surface-variant bg-surface-container-low',
                      )}
                    >
                      {t('performance.rating.pending', {}, { defaultValue: 'Pending' })}
                    </span>
                  )}
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'text-on-surface tabular-nums',
                    )}
                  >
                    {t(
                      'performance.goalsCount',
                      { done: r.goals_done, total: r.goals_total },
                      { defaultValue: '{{done}}/{{total}} goals' },
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
