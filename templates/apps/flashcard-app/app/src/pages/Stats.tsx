import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface Overview {
  total_reviews: number
  reviews_change_percent: number
  current_streak: number
  longest_streak: number
  retention_rate: number
  daily_minutes_avg: number
  cards_mature: number
  cards_young: number
  cards_new: number
  by_state: { state: string; count: number; pct: number }[]
  daily_reviews: { date: string; count: number }[]
}

const STATE_COLOR: Record<string, string> = {
  new: 'var(--color-state-new)',
  learning: 'var(--color-state-learning)',
  review: 'var(--color-state-review)',
  relearning: 'var(--color-state-relearning)',
}

export function Stats() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/reports/overview')
      .then((res) => {
        if (!cancelled) setStats(unwrapSingle<Overview>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('stats.loadError', {}, { defaultValue: 'Failed to load stats.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!stats) return null

  const dailyReviews = stats.daily_reviews ?? []
  const byState = stats.by_state ?? []
  const maxDay = Math.max(...dailyReviews.map((d) => d.count), 1)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('stats.heading', {}, { defaultValue: 'Stats' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t('stats.subheading', {}, { defaultValue: 'Your memory in numbers — last 30 days' })}
        </p>
      </header>

      {/* 2×2 on phones — four 1-col KPI cards push the charts below the fold. */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Kpi
          label={t('stats.kpi.reviews', {}, { defaultValue: 'Reviews (30d)' })}
          value={`${stats.total_reviews}`}
          delta={stats.reviews_change_percent}
        />
        <Kpi
          label={t('stats.kpi.streak', {}, { defaultValue: 'Current streak' })}
          value={`${stats.current_streak}`}
          unit={t('stats.kpi.days', {}, { defaultValue: 'days' })}
          accent
        />
        <Kpi
          label={t('stats.kpi.retention', {}, { defaultValue: 'Retention' })}
          value={`${Math.round(stats.retention_rate * 100)}%`}
        />
        <Kpi
          label={t('stats.kpi.minutes', {}, { defaultValue: 'Daily avg' })}
          value={`${stats.daily_minutes_avg}`}
          unit={t('stats.kpi.minutes_unit', {}, { defaultValue: 'min' })}
        />
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
        <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.sp('mb', 4))}>
          {t('stats.dailyHeading', {}, { defaultValue: 'Reviews per day (last 30 days)' })}
        </h2>
        <div
          className={cm.flex({ align: 'end', gap: 'xs' })}
          style={{ height: '160px' }}
          data-mol-id="stats-daily-bars"
        >
          {dailyReviews.map((d) => {
            const heightPct = (d.count / maxDay) * 100
            return (
              <div
                key={d.date}
                className={cm.flex({ direction: 'col', align: 'center' })}
                style={{ flex: 1 }}
              >
                <div
                  title={`${d.date}: ${d.count}`}
                  style={{
                    width: '100%',
                    height: `${heightPct}%`,
                    backgroundColor: 'var(--mol-color-primary)',
                    borderRadius: '3px 3px 0 0',
                    minHeight: '2px',
                  }}
                />
              </div>
            )
          })}
        </div>
      </section>

      <section className={cm.grid({ cols: 2, gap: 'md' })}>
        <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
          <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
            {t('stats.byStateHeading', {}, { defaultValue: 'Cards by state' })}
          </h2>
          <ul className={cm.cn('space-y-2')} data-mol-id="stats-by-state">
            {byState.map((s) => (
              <li key={s.state}>
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {t(`stats.state.${s.state}`, {}, { defaultValue: s.state })}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {s.count}
                  </span>
                </div>
                <div
                  className={cm.cn('w-full', cm.sp('mt', 1))}
                  style={{
                    height: '6px',
                    backgroundColor: 'var(--color-surface-container-highest)',
                    borderRadius: '3px',
                  }}
                >
                  <div
                    style={{
                      width: `${s.pct * 100}%`,
                      height: '100%',
                      backgroundColor: STATE_COLOR[s.state] ?? 'var(--mol-color-primary)',
                      borderRadius: '3px',
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
          <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
            {t('stats.recordsHeading', {}, { defaultValue: 'Records' })}
          </h2>
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant',
                cm.fontWeight('medium'),
                'uppercase tracking-wider',
              )}
            >
              {t('stats.records.longest', {}, { defaultValue: 'Longest streak' })}
            </p>
            <p
              className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}
              style={{ color: 'var(--color-streak)' }}
            >
              {stats.longest_streak}{' '}
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                  cm.fontWeight('normal'),
                )}
              >
                {t('stats.kpi.days', {}, { defaultValue: 'days' })}
              </span>
            </p>
          </div>
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant',
                cm.fontWeight('medium'),
                'uppercase tracking-wider',
              )}
            >
              {t('stats.records.mature', {}, { defaultValue: 'Mature cards' })}
            </p>
            <p className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
              {stats.cards_mature}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'stats.records.matureSubtitle',
                {},
                { defaultValue: 'cards with intervals > 21 days' },
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function Kpi({
  label,
  value,
  unit,
  delta,
  accent,
}: {
  label: string
  value: string
  unit?: string
  delta?: number
  accent?: boolean
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          'text-on-surface-variant',
          cm.fontWeight('medium'),
          'uppercase tracking-wider',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}
        style={accent ? { color: 'var(--color-streak)' } : undefined}
      >
        {value}
        {unit ? (
          <span
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.fontWeight('normal'))}
          >
            {' '}
            {unit}
          </span>
        ) : null}
      </p>
      {typeof delta === 'number' ? (
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mt', 1),
            delta >= 0 ? 'text-success' : 'text-error',
          )}
        >
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
        </p>
      ) : null}
    </div>
  )
}
