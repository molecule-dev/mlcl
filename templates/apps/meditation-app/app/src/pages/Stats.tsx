import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StillpointTopBar } from '../components/StillpointTopBar.js'
import { StreakRingCard } from '../components/StreakRingCard.js'
import type {
  ApiStatsDailyServer,
  ApiStatsStreak,
  ApiStatsSummaryServer,
  ApiUserPreferences,
} from '../lib/api.js'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface DayBucket {
  key: string
  day: string
  minutes: number
  sessions: number
}

function buildLast7Days(daily: ApiStatsDailyServer[]): DayBucket[] {
  const map = new Map<string, ApiStatsDailyServer>()
  for (const d of daily) map.set(d.date, d)
  const out: DayBucket[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    const iso = d.toISOString().split('T')[0]
    const found = map.get(iso) ?? { date: iso, sessions: 0, minutes: 0 }
    out.push({
      key: iso,
      day: DAY_LABELS[d.getUTCDay()],
      minutes: found.minutes,
      sessions: found.sessions,
    })
  }
  return out
}

export function Stats() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [streak, setStreak] = useState<ApiStatsStreak | null>(null)
  const [summary, setSummary] = useState<ApiStatsSummaryServer | null>(null)
  const [daily, setDaily] = useState<ApiStatsDailyServer[]>([])
  const [prefs, setPrefs] = useState<ApiUserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get<ApiStatsStreak>('/stats/streak'),
      http.get<ApiStatsSummaryServer>('/stats/summary'),
      http.get<ApiStatsDailyServer[]>('/stats/daily'),
      http.get<ApiUserPreferences>('/preferences'),
    ])
      .then(([s, su, d, p]) => {
        if (cancelled) return
        setStreak(s.data ?? null)
        setSummary(su.data ?? null)
        setDaily(Array.isArray(d.data) ? d.data : [])
        setPrefs(p.data ?? null)
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const week = useMemo(() => buildLast7Days(daily), [daily])
  const totalThisWeek = week.reduce((acc, d) => acc + d.minutes, 0)
  const max = Math.max(...week.map((d) => d.minutes), 1)
  const goal = prefs?.weekly_goal_minutes ?? 120
  const totalSessions = summary?.total_sessions ?? 0
  const totalMinutes = summary?.total_minutes ?? 0
  const longestStreak = streak?.longest_streak ?? 0
  const totalDays = streak?.total_days ?? 0

  const KPI = [
    {
      icon: 'self_improvement',
      labelKey: 'stillpoint.stats.kpi.lifetime',
      defaultLabel: 'Minutes (last 7 days)',
      value: totalMinutes.toLocaleString(),
      accent: 'border-l-primary text-primary',
      testId: 'stats-kpi-minutes',
    },
    {
      icon: 'spa',
      labelKey: 'stillpoint.stats.kpi.sessions',
      defaultLabel: 'Sessions (last 7 days)',
      value: totalSessions.toLocaleString(),
      accent: 'border-l-secondary text-secondary',
      testId: 'stats-kpi-sessions',
    },
    {
      icon: 'local_fire_department',
      labelKey: 'stillpoint.stats.kpi.bestStreak',
      defaultLabel: 'Best streak',
      value: t(
        'stillpoint.stats.kpi.daysValue',
        { count: longestStreak },
        { defaultValue: '{{count}} days' },
      ),
      accent: 'border-l-accent text-accent',
      testId: 'stats-kpi-streak',
    },
    {
      icon: 'event_available',
      labelKey: 'stillpoint.stats.kpi.totalDays',
      defaultLabel: 'Days practiced',
      value: totalDays.toLocaleString(),
      accent: 'border-l-info text-info',
      testId: 'stats-kpi-days',
    },
  ]

  return (
    <>
      <StillpointTopBar
        title={t('stillpoint.stats.heading', {}, { defaultValue: 'Stats' })}
        eyebrow={
          <span data-testid="stats-eyebrow">
            {t('stillpoint.stats.eyebrow', {}, { defaultValue: 'A quiet practice, measured.' })}
          </span>
        }
      />

      {error ? (
        <div
          data-testid="stats-error"
          className={cm.cn(cm.sp('p', 4), 'rounded-2xl border border-error text-error')}
        >
          {t('stillpoint.stats.loadError', {}, { defaultValue: "We couldn't load your stats." })}
        </div>
      ) : null}

      {loading ? (
        <div
          data-testid="stats-loading"
          className={cm.cn(cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      ) : (
        <>
          <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch')}>
            <div className={cm.cn('lg:col-span-4')} data-testid="stats-streak-card">
              <StreakRingCard
                days={streak?.current_streak ?? 0}
                minutesThisWeek={totalThisWeek}
                weeklyGoalMinutes={goal}
                headline={t('stillpoint.stats.streakHeadline', {}, { defaultValue: 'day streak' })}
                subline={t(
                  'stillpoint.stats.streakSubline',
                  {},
                  { defaultValue: 'Closer than yesterday.' },
                )}
              />
            </div>
            <div
              data-testid="stats-week-card"
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'md' }),
                cm.sp('p', 8),
                'lg:col-span-8 rounded-2xl bg-surface-container-lowest shadow-sm border border-outline/30',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <div>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('stillpoint.stats.weekHeading', {}, { defaultValue: 'Minutes this week' })}
                  </p>
                  <p
                    data-testid="stats-week-minutes"
                    className={cm.cn(
                      'text-5xl font-extrabold tracking-tight text-on-surface tabular-nums mt-1',
                    )}
                  >
                    {totalThisWeek}
                    <span
                      className={cm.cn(
                        cm.textSize('lg'),
                        'text-on-surface-variant font-semibold ml-2',
                      )}
                    >
                      {t('common.min', {}, { defaultValue: 'min' })}
                    </span>
                  </p>
                </div>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest rounded-full bg-primary-container text-on-primary-container',
                  )}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                    flag
                  </span>
                  {t(
                    'stillpoint.stats.goalChip',
                    { minutes: goal },
                    { defaultValue: 'goal {{minutes}}' },
                  )}
                </span>
              </div>
              <div
                data-testid="stats-week-bars"
                className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), 'h-40 gap-2')}
              >
                {week.map((w) => (
                  <div
                    key={w.key}
                    className={cm.cn(
                      cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
                      'flex-1',
                    )}
                  >
                    <div className={cm.cn('w-full flex items-end h-32')}>
                      <div
                        data-testid={`stats-week-bar-${w.day}`}
                        className={cm.cn(
                          'w-full rounded-t-lg bg-gradient-to-t from-primary/70 to-primary transition-all',
                        )}
                        style={{
                          height: `${(w.minutes / max) * 100}%`,
                          minHeight: w.minutes > 0 ? '6px' : '0',
                        }}
                        aria-label={t(
                          'stillpoint.stats.barLabel',
                          { day: w.day, minutes: w.minutes },
                          { defaultValue: '{{day}}: {{minutes}} minutes' },
                        )}
                      />
                    </div>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant uppercase tracking-widest font-semibold',
                      )}
                    >
                      {t(`stillpoint.stats.day.${w.day}`, {}, { defaultValue: w.day })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            data-testid="stats-kpis"
            className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4')}
          >
            {KPI.map((k) => (
              <div
                key={k.icon}
                data-testid={k.testId}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.sp('p', 5),
                  'rounded-2xl shadow-sm border-l-4 bg-surface-container-lowest hover:-translate-y-0.5 transition-transform',
                  k.accent,
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <span
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-2xl')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {k.icon}
                  </span>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t(k.labelKey, {}, { defaultValue: k.defaultLabel })}
                  </span>
                </div>
                <p
                  className={cm.cn(
                    'text-3xl font-extrabold text-on-surface tabular-nums tracking-tight',
                  )}
                >
                  {k.value}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
