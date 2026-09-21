import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { NoshTopBar } from '../components/NoshTopBar.js'
import { StreakCard } from '../components/StreakCard.js'

const PERIODS = [
  { key: 'week' as const, days: 7 },
  { key: 'month' as const, days: 30 },
  { key: 'year' as const, days: 365 },
]
type PeriodKey = (typeof PERIODS)[number]['key']

interface DailyAveragesResponse {
  days: {
    date: string
    calories: number | string
    protein: number | string
    carbs: number | string
    fat: number | string
  }[]
  averages: { calories: number; protein: number; carbs: number; fat: number }
}

interface StreakResponse {
  current_streak: number
}

interface GoalResponse {
  calories: number | string
}

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'string' ? Number.parseFloat(v) : (v ?? 0)
  return Number.isFinite(n) ? Number(n) : 0
}

const toIso = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const dayLabel = (iso: string, period: PeriodKey): string => {
  // Year view aggregates to 'YYYY-MM' month keys.
  const d = new Date(`${iso}${iso.length === 7 ? '-01' : ''}T00:00:00`)
  if (period === 'year') return d.toLocaleDateString(undefined, { month: 'short' })
  if (period === 'month') return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return d.toLocaleDateString(undefined, { weekday: 'short' })
}

export function Progress() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [period, setPeriod] = useState<PeriodKey>('week')
  const [data, setData] = useState<DailyAveragesResponse | null>(null)
  const [streak, setStreak] = useState<number | null>(null)
  const [goal, setGoal] = useState<number>(2000)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const range = useMemo(() => {
    const def = PERIODS.find((p) => p.key === period) ?? PERIODS[0]
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - def.days + 1)
    return { start: toIso(start), end: toIso(end) }
  }, [period])

  useEffect(() => {
    let cancelled = false
    setError(null)
    setLoading(true)
    Promise.all([
      http
        .get<DailyAveragesResponse>(
          `/api/nutrition/daily-averages?start_date=${range.start}&end_date=${range.end}`,
        )
        .then((r) => (r.data ?? null) as DailyAveragesResponse | null),
      http
        .get<StreakResponse>('/api/nutrition/streak')
        .then((r) => (r.data ?? null) as StreakResponse | null),
      http.get<GoalResponse>('/api/goals').then((r) => (r.data ?? null) as GoalResponse | null),
    ])
      .then(([d, s, g]) => {
        if (cancelled) return
        setData(d ?? { days: [], averages: { calories: 0, protein: 0, carbs: 0, fat: 0 } })
        setStreak(s?.current_streak ?? 0)
        if (g) setGoal(num(g.calories) || 2000)
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('nosh.progress.loadError', {}, { defaultValue: 'Could not load progress.' }),
        )
        setData({ days: [], averages: { calories: 0, protein: 0, carbs: 0, fat: 0 } })
        setStreak(0)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t, range, refreshKey])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- avg is a ?? fallback; macroSplit deps intentionally omit the inline object reference
  const avg = data?.averages ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
  const days = useMemo(() => data?.days ?? [], [data])
  const max = Math.max(goal || 1, ...days.map((d) => num(d.calories))) * 1.1
  const goalDays = days.filter((d) => Math.abs(num(d.calories) - goal) <= goal * 0.1).length

  // Year view: 365 daily bars cannot render readably in any viewport —
  // aggregate to monthly averages so the chart stays a 12-bar trend.
  const chartDays = useMemo(() => {
    if (period !== 'year') return days
    const byMonth = new Map<string, { total: number; count: number }>()
    for (const d of days) {
      const key = String(d.date).slice(0, 7)
      const cur = byMonth.get(key) ?? { total: 0, count: 0 }
      cur.total += num(d.calories)
      cur.count += 1
      byMonth.set(key, cur)
    }
    return [...byMonth.entries()].map(([month, { total, count }]) => ({
      date: month,
      calories: count > 0 ? total / count : 0,
    }))
  }, [period, days])

  const macroSplit = useMemo(() => {
    const totalP = avg.protein
    const totalC = avg.carbs
    const totalF = avg.fat
    const cal = totalP * 4 + totalC * 4 + totalF * 9
    if (cal <= 0) return { protein: 0, carbs: 0, fat: 0 }
    return {
      protein: Math.round(((totalP * 4) / cal) * 100),
      carbs: Math.round(((totalC * 4) / cal) * 100),
      fat: Math.round(((totalF * 9) / cal) * 100),
    }
  }, [avg])

  return (
    <>
      <NoshTopBar
        title={t('nosh.progress.heading', {}, { defaultValue: 'Your progress' })}
        eyebrow={t(
          `nosh.progress.eyebrow.${period}`,
          {},
          {
            defaultValue:
              period === 'week'
                ? '7-day overview'
                : period === 'month'
                  ? '30-day overview'
                  : 'Full-year view',
          },
        )}
        actions={
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('p', 1),
              'rounded-full bg-surface-variant gap-1',
            )}
          >
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setPeriod(p.key)
                  setRefreshKey((n) => n + 1)
                }}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 1),
                  cm.textSize('sm'),
                  'rounded-full transition-colors',
                  period === p.key
                    ? 'bg-surface text-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant font-medium hover:text-on-surface',
                )}
              >
                {t(
                  `nosh.progress.period.${p.key}`,
                  {},
                  { defaultValue: p.key[0].toUpperCase() + p.key.slice(1) },
                )}
              </button>
            ))}
          </div>
        }
      />

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-lg bg-error-container text-on-error-container',
          )}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}>
        {[
          {
            key: 'avg',
            value: avg.calories.toLocaleString(),
            tone: 'text-primary',
            label: t('nosh.progress.stat.avg', {}, { defaultValue: 'Avg daily kcal' }),
          },
          {
            key: 'streak',
            value: String(streak ?? 0),
            tone: 'text-accent',
            label: t('nosh.progress.stat.streak', {}, { defaultValue: 'Day streak' }),
          },
          {
            key: 'goalDays',
            value: `${goalDays}/${days.length || PERIODS.find((p) => p.key === period)?.days || 7}`,
            tone: 'text-success',
            label: t('nosh.progress.stat.goalDays', {}, { defaultValue: 'Days at goal' }),
          },
        ].map((s) => (
          <div
            key={s.key}
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface rounded-2xl shadow-sm border border-outline/20',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {s.label}
            </p>
            <p className={cm.cn('text-4xl font-extrabold tabular-nums mt-2', s.tone)}>{s.value}</p>
          </div>
        ))}
      </div>

      <section className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}>
        <h3 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 4), 'text-on-surface')}>
          {t('nosh.progress.calorieChart.title', {}, { defaultValue: 'Calories by day' })}
        </h3>
        {loading ? (
          <div
            className={cm.cn('h-[260px] rounded-xl bg-surface-variant/60 animate-pulse')}
            aria-hidden="true"
          />
        ) : days.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'nosh.progress.empty',
              {},
              { defaultValue: 'No data yet — log a meal to start your trend.' },
            )}
          </p>
        ) : (
          <div
            className={cm.cn('h-[260px] flex items-end gap-3 overflow-x-auto pb-1')}
            role="img"
            aria-label={t(
              'nosh.progress.calorieChart.label',
              {},
              { defaultValue: 'Bar chart of calories per day' },
            )}
          >
            {chartDays.map((d) => {
              const cal = num(d.calories)
              const heightPct = (cal / max) * 100
              const goalPct = (goal / max) * 100
              const tone =
                cal > goal ? 'bg-over-goal' : cal > goal * 0.85 ? 'bg-near-goal' : 'bg-primary'
              return (
                <div
                  key={d.date}
                  className={cm.cn('flex-1 min-w-[28px] flex flex-col items-center gap-2 group')}
                >
                  <div className={cm.cn('relative flex-1 w-full flex items-end')}>
                    <div
                      className={cm.cn(
                        'w-full rounded-t-lg transition-all duration-300 group-hover:opacity-80',
                        tone,
                      )}
                      style={{ height: `${heightPct}%` }}
                      aria-label={`${d.date}: ${Math.round(cal)} kcal`}
                    />
                    <div
                      className={cm.cn(
                        'absolute left-0 right-0 border-t-2 border-dashed border-accent/70',
                      )}
                      style={{ bottom: `${goalPct}%` }}
                      aria-hidden="true"
                    />
                  </div>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'text-on-surface-variant',
                    )}
                  >
                    {dayLabel(d.date, period)}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface tabular-nums')}>
                    {Math.round(cal).toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'lg' }),
            cm.textSize('xs'),
            cm.sp('mt', 4),
            'text-on-surface-variant',
          )}
        >
          <span className={cm.flex({ align: 'center', gap: 'xs' })}>
            <span className={cm.cn('w-3 h-3 rounded-sm bg-primary')} aria-hidden="true" />
            {t('nosh.progress.legend.under', {}, { defaultValue: 'Under goal' })}
          </span>
          <span className={cm.flex({ align: 'center', gap: 'xs' })}>
            <span className={cm.cn('w-3 h-3 rounded-sm bg-near-goal')} aria-hidden="true" />
            {t('nosh.progress.legend.near', {}, { defaultValue: 'Near goal' })}
          </span>
          <span className={cm.flex({ align: 'center', gap: 'xs' })}>
            <span className={cm.cn('w-3 h-3 rounded-sm bg-over-goal')} aria-hidden="true" />
            {t('nosh.progress.legend.over', {}, { defaultValue: 'Over goal' })}
          </span>
        </div>
      </section>

      <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-6')}>
        <StreakCard
          days={streak ?? 0}
          headline={t(
            'nosh.progress.streak.headline',
            { count: streak ?? 0 },
            { defaultValue: '{{count}}-day streak' },
          )}
          subtitle={t(
            'nosh.progress.streak.subtitle',
            {},
            { defaultValue: 'Track another day to keep going.' },
          )}
        />
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface rounded-2xl shadow-sm border border-outline/20',
          )}
        >
          <h3
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('semibold'),
              cm.sp('mb', 4),
              'text-on-surface',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-primary')}>
              spa
            </span>
            {t('nosh.progress.macros.title', {}, { defaultValue: 'Macro split' })}
          </h3>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {[
              {
                key: 'protein',
                label: t('nosh.progress.macro.protein', {}, { defaultValue: 'Protein' }),
                value: macroSplit.protein,
                tone: 'bg-protein',
              },
              {
                key: 'carbs',
                label: t('nosh.progress.macro.carbs', {}, { defaultValue: 'Carbs' }),
                value: macroSplit.carbs,
                tone: 'bg-carbs',
              },
              {
                key: 'fat',
                label: t('nosh.progress.macro.fat', {}, { defaultValue: 'Fat' }),
                value: macroSplit.fat,
                tone: 'bg-fat',
              },
            ].map((m) => (
              <div key={m.key}>
                <div
                  className={cm.cn(
                    cm.flex({ justify: 'between' }),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    cm.sp('mb', 1),
                  )}
                >
                  <span className={cm.cn('text-on-surface')}>{m.label}</span>
                  <span className={cm.cn('text-on-surface-variant tabular-nums')}>{m.value}%</span>
                </div>
                <div className={cm.cn('h-2 bg-outline/20 rounded-full overflow-hidden')}>
                  <div className={`${m.tone} h-2 rounded-full`} style={{ width: `${m.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
