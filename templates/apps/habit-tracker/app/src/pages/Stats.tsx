import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ConsistencyHeatmap } from '../components/ConsistencyHeatmap.js'
import { HabitStatsTriad } from '../components/HabitStatsTriad.js'
import { StreakHeroCard } from '../components/StreakHeroCard.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface Overview {
  total_check_ins: number
  total_check_ins_change_percent: number
  active_habits: number
  active_streaks: number
  current_completion_rate: number
  longest_active_streak: number
  longest_active_habit: string
  best_ever_streak: number
  best_ever_habit: string
  by_category: { category: string; count: number; rate: number }[]
  weekly_completion: { week: string; rate: number }[]
}

interface FreezeBalance {
  total: number
  used: number
  available: number
}

const CATEGORY_LABEL: Record<string, string> = {
  health: 'Health',
  mind: 'Mind',
  creativity: 'Creativity',
  social: 'Social',
  learning: 'Learning',
}

export function Stats() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<Overview | null>(null)
  const [freezes, setFreezes] = useState<FreezeBalance>({ total: 0, used: 0, available: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/reports/overview'),
      http.get('/api/freezes/balance').catch(() => null),
    ])
      .then(([overviewRes, freezeRes]) => {
        if (cancelled) return
        setStats(unwrapSingle<Overview>(overviewRes))
        if (freezeRes) {
          const fb = unwrapSingle<FreezeBalance>(freezeRes)
          if (fb) setFreezes(fb)
        }
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

  // Synthesize 26-week heatmap intensities from weekly_completion (4..14 cells/week).
  const heatCells: number[] = []
  for (let week = 0; week < 26; week++) {
    const wIndex = Math.floor((week / 26) * stats.weekly_completion.length)
    const rate = stats.weekly_completion[wIndex]?.rate ?? 0.6
    for (let day = 0; day < 7; day++) {
      const jitter = ((week * 7 + day) * 13) % 5
      const noise = (jitter - 2) * 0.05
      const v = Math.max(0, Math.min(1, rate + noise))
      heatCells.push(Math.round(v * 4))
    }
  }

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
          {t('stats.eyebrow', {}, { defaultValue: 'Your habit health' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight', cm.sp('mt', 2))}>
          {t('stats.heading', {}, { defaultValue: 'Stats & trends' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'stats.subheading',
            {},
            { defaultValue: 'Streaks, completion, and the chain at a glance.' },
          )}
        </p>
      </header>

      <StreakHeroCard
        longestActive={stats.longest_active_streak}
        activeStreaks={stats.active_streaks}
        freezesAvailable={freezes.available}
        motivationalMessage={t(
          'stats.heroMessage',
          { habit: stats.longest_active_habit, days: stats.longest_active_streak },
          { defaultValue: '{{habit}} leads at {{days}} days. Keep the chain alive.' },
        )}
        weeklyCompletion={stats.weekly_completion}
      />

      <HabitStatsTriad
        todayDone={Math.round(stats.current_completion_rate * stats.active_habits)}
        todayTotal={stats.active_habits}
        activeHabits={stats.active_habits}
        bestEverStreak={stats.best_ever_streak}
        bestEverHabit={stats.best_ever_habit}
        completionRate={stats.current_completion_rate}
      />

      <ConsistencyHeatmap
        cells={heatCells}
        weeks={26}
        title={t('stats.heatmapTitle', {}, { defaultValue: 'Consistency' })}
        caption={t(
          'stats.heatmapCaption',
          { count: stats.total_check_ins },
          { defaultValue: '{{count}} check-ins in the last 26 weeks' },
        )}
      />

      <section
        className={cm.grid({ gap: 'lg' })}
        style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}
      >
        <div className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm', cm.sp('p', 6))}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('stats.weeklyEyebrow', {}, { defaultValue: 'Weekly completion' })}
          </h2>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              cm.sp('mb', 5),
              'text-on-surface',
            )}
          >
            {t('stats.weeklyHeading', {}, { defaultValue: 'Last 12 weeks' })}
          </p>
          <div className={cm.flex({ align: 'end', gap: 'xs' })} style={{ height: '180px' }}>
            {stats.weekly_completion.map((w) => {
              const pct = w.rate
              return (
                <div
                  key={w.week}
                  className={cm.flex({ direction: 'col', align: 'center', gap: 'xs' })}
                  style={{ flex: 1, height: '100%' }}
                >
                  <div
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'text-on-surface-variant',
                    )}
                  >
                    {Math.round(pct * 100)}
                  </div>
                  <div className={cm.cn('w-full flex-1 flex items-end')}>
                    <div
                      title={`${w.week}: ${Math.round(pct * 100)}%`}
                      className={cm.cn('w-full rounded-t-md transition-all')}
                      style={{
                        height: `${pct * 100}%`,
                        background: `linear-gradient(180deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))`,
                        minHeight: '4px',
                      }}
                    />
                  </div>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'text-on-surface-variant',
                    )}
                  >
                    {w.week.slice(5)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm', cm.sp('p', 6))}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('stats.byCategoryEyebrow', {}, { defaultValue: 'By category' })}
          </h2>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              cm.sp('mb', 5),
              'text-on-surface',
            )}
          >
            {t('stats.byCategoryHeading', {}, { defaultValue: 'Where the work goes' })}
          </p>
          <ul className={cm.cn('space-y-4')}>
            {stats.by_category.map((c) => {
              const pct = Math.round(c.rate * 100)
              return (
                <li key={c.category}>
                  <div className={cm.flex({ align: 'center', justify: 'between' })}>
                    <span
                      className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                    >
                      {t(
                        `category.${c.category}`,
                        {},
                        { defaultValue: CATEGORY_LABEL[c.category] ?? c.category },
                      )}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('extrabold'),
                        'text-on-surface',
                      )}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div
                    className={cm.cn(
                      'h-2 rounded-full bg-surface-container overflow-hidden mt-1.5',
                    )}
                  >
                    <div
                      className={cm.cn('h-full rounded-full')}
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))`,
                      }}
                    />
                  </div>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('mt', 1),
                      cm.fontWeight('medium'),
                      'text-on-surface-variant',
                    )}
                  >
                    {t(
                      'stats.byCategoryCount',
                      { count: c.count },
                      { defaultValue: '{{count}} habits' },
                    )}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      </section>
    </div>
  )
}
