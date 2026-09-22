import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const CATEGORY_PALETTE: Record<string, string> = {
  health: '#10b981',
  mind: '#4a5fd7',
  creativity: '#a78bfa',
  social: '#f472b6',
  learning: '#f59e0b',
}

interface Habit {
  id: string
  name: string
  emoji: string
  category: string
  current_streak: number
}

interface Entry {
  id: string
  habit_id: string
  date: string
  completed: boolean
}

interface OverviewStats {
  total_check_ins: number
  active_habits: number
  longest_active_streak: number
  best_ever_streak: number
}

const WINDOW_DAYS = 14

function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function Calendar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [offset, setOffset] = useState(0)
  const [habits, setHabits] = useState<Habit[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const today = useMemo(() => new Date(), [])
  const monthLabel = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const dates = useMemo(() => {
    const arr: Date[] = []
    const end = new Date(today)
    end.setDate(end.getDate() + offset * WINDOW_DAYS)
    for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
      const d = new Date(end)
      d.setDate(d.getDate() - i)
      arr.push(d)
    }
    return arr
  }, [today, offset])

  const dateKeys = useMemo(() => dates.map(formatLocalDate), [dates])
  const periodLabel = useMemo(() => {
    if (offset === 0) return t('calendar.rangeLabel', {}, { defaultValue: 'Last 14 days' })
    const start = dates[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const end = dates[dates.length - 1].toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
    return `${start} – ${end}`
  }, [offset, dates, t])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const [habitsRes, entriesRes, statsRes] = await Promise.all([
          http.get('/api/habits'),
          http.get(`/api/completions?from=${dateKeys[0]}&to=${dateKeys[dateKeys.length - 1]}`),
          http.get('/api/reports/overview'),
        ])
        if (cancelled) return
        setHabits(unwrapList<Habit>(habitsRes))
        setEntries(unwrapList<Entry>(entriesRes))
        setStats(unwrapSingle<OverviewStats>(statsRes))
        setError(null)
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [http, dateKeys])

  const completionByHabitDate = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const e of entries) {
      if (e.completed) map.set(`${e.habit_id}:${e.date}`, true)
    }
    return map
  }, [entries])

  const periodCompletion = useMemo(() => {
    if (habits.length === 0 || dateKeys.length === 0) return 0
    const total = habits.length * dateKeys.length
    let done = 0
    for (const h of habits) {
      for (const k of dateKeys) {
        if (completionByHabitDate.get(`${h.id}:${k}`)) done++
      }
    }
    return Math.round((done / total) * 100)
  }, [habits, dateKeys, completionByHabitDate])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-8')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('calendar.eyebrow', { month: monthLabel }, { defaultValue: '{{month}}' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight', cm.sp('mt', 2))}>
          {t('calendar.heading', {}, { defaultValue: 'Calendar' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'calendar.subheading',
            {},
            { defaultValue: 'See every habit, every day, on one canvas.' },
          )}
        </p>
      </header>

      <section
        className={cm.cn(
          'bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden',
          cm.sp('p', 6),
        )}
      >
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <button
              type="button"
              aria-label={t('calendar.prev', {}, { defaultValue: 'Previous period' })}
              onClick={() => setOffset((o) => o - 1)}
              className={cm.cn(
                'w-9 h-9 rounded-full border border-outline-variant hover:bg-surface-container flex items-center justify-center transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>chevron_left</span>
            </button>
            <button
              type="button"
              aria-label={t('calendar.next', {}, { defaultValue: 'Next period' })}
              onClick={() => setOffset((o) => Math.min(0, o + 1))}
              disabled={offset >= 0}
              className={cm.cn(
                'w-9 h-9 rounded-full border border-outline-variant hover:bg-surface-container flex items-center justify-center transition-colors disabled:opacity-50',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>chevron_right</span>
            </button>
            <h2
              className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('ml', 2))}
              data-testid="calendar-range-label"
            >
              {periodLabel}
            </h2>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'xs' })}>
            <span
              className={cm.cn(
                'px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full',
              )}
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                color: 'var(--mol-color-primary)',
              }}
            >
              {t('calendar.viewLabel', {}, { defaultValue: 'Habit grid' })}
            </span>
          </div>
        </div>

        <div className={cm.sp('mt', 6)} style={{ overflowX: 'auto' }}>
          {loading ? (
            <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : error ? (
            <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-error')}>{error}</p>
          ) : habits.length === 0 ? (
            <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
              {t('calendar.empty', {}, { defaultValue: 'Create a habit to see your calendar.' })}
            </p>
          ) : (
            <table className={cm.cn('w-full border-collapse')} style={{ minWidth: '720px' }}>
              <thead>
                <tr>
                  <th
                    className={cm.cn(
                      'text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
                      cm.sp('py', 2),
                      cm.sp('pr', 4),
                    )}
                  >
                    {t('calendar.habitColumn', {}, { defaultValue: 'Habit' })}
                  </th>
                  {dates.map((d, i) => (
                    <th
                      key={i}
                      className={cm.cn(
                        'text-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant py-2',
                      )}
                    >
                      <div>{d.getDate()}</div>
                      <div className="font-medium normal-case tracking-normal opacity-70">
                        {d.toLocaleDateString(undefined, { weekday: 'short' })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {habits.map((h) => {
                  const palette = CATEGORY_PALETTE[h.category] ?? '#4a5fd7'
                  return (
                    <tr
                      key={h.id}
                      className={cm.cn('hover:bg-surface-container-low/50 transition-colors')}
                      data-testid={`calendar-row-${h.id}`}
                    >
                      <td className={cm.cn(cm.sp('py', 3), cm.sp('pr', 4))}>
                        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                          <span aria-hidden="true" className={cm.cn('text-xl')}>
                            {h.emoji}
                          </span>
                          <div>
                            <div
                              className={cm.cn(
                                cm.textSize('sm'),
                                cm.fontWeight('bold'),
                                'text-on-surface',
                              )}
                            >
                              {h.name}
                            </div>
                            <div
                              className="text-[10px] font-bold uppercase tracking-widest"
                              style={{ color: palette }}
                            >
                              {h.current_streak}{' '}
                              {t('calendar.streakLabel', {}, { defaultValue: 'day streak' })}
                            </div>
                          </div>
                        </div>
                      </td>
                      {dateKeys.map((dk, di) => {
                        const done = completionByHabitDate.get(`${h.id}:${dk}`) ?? false
                        return (
                          <td key={di} className={cm.cn('py-3 text-center')}>
                            <div
                              className={cm.cn('w-7 h-7 mx-auto rounded-lg transition-all')}
                              data-testid={`cell-${h.id}-${dk}`}
                              data-completed={done ? 'true' : 'false'}
                              style={{
                                background: done
                                  ? `linear-gradient(135deg, ${palette}, ${palette}aa)`
                                  : 'var(--color-heatmap-empty)',
                                boxShadow: done ? `0 0 0 2px ${palette}33` : 'none',
                              }}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className={cm.grid({ cols: 3, gap: 'md' })}>
        {[
          {
            icon: 'today',
            label: t('calendar.summary.completion', {}, { defaultValue: 'Period completion' }),
            value: `${periodCompletion}%`,
          },
          {
            icon: 'local_fire_department',
            label: t('calendar.summary.longest', {}, { defaultValue: 'Longest streak' }),
            value: `${stats?.best_ever_streak ?? 0}d`,
          },
          {
            icon: 'self_improvement',
            label: t('calendar.summary.active', {}, { defaultValue: 'Active habits' }),
            value: String(stats?.active_habits ?? habits.length),
          },
        ].map((s) => (
          <div
            key={s.label}
            className={cm.cn(
              cm.sp('p', 5),
              'bg-surface-container-lowest rounded-2xl shadow-sm border-l-4 hover:-translate-y-0.5 transition-transform',
            )}
            style={{ borderLeftColor: 'var(--mol-color-primary)' }}
          >
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span
                className={cm.cn('material-symbols-outlined text-2xl text-primary')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {s.icon}
              </span>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {s.label}
              </span>
            </div>
            <p className={cm.cn('text-3xl font-extrabold mt-2 text-on-surface')}>{s.value}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
