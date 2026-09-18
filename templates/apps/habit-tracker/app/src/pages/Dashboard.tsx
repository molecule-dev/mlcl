import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type HabitCategory, HabitChecklistRow } from '../components/HabitChecklistRow.js'
import { HabitStatsTriad } from '../components/HabitStatsTriad.js'
import { StreakHeroCard } from '../components/StreakHeroCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Habit {
  id: string
  name: string
  emoji: string
  category: HabitCategory
  cadence: 'daily' | 'weekly'
  current_streak: number
  longest_streak: number
  completed_today: boolean
}

interface Today {
  date: string
  active_streaks: number
  longest_active: number
  freezes_available: number
  motivational_message: string
}

interface Overview {
  active_habits: number
  current_completion_rate: number
  longest_active_streak: number
  longest_active_habit: string
  best_ever_streak: number
  best_ever_habit: string
  weekly_completion: { week: string; rate: number }[]
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [habits, setHabits] = useState<Habit[]>([])
  const [today, setToday] = useState<Today | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/habits'),
      http.get('/api/reports/today'),
      http.get('/api/reports/overview'),
    ])
      .then(([h, todayData, overviewData]) => {
        if (cancelled) return
        setHabits(unwrapList<Habit>(h))
        setToday(unwrapSingle<Today>(todayData))
        setOverview(unwrapSingle<Overview>(overviewData))
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

  const toggle = async (habit: Habit) => {
    const next = !habit.completed_today
    setHabits((curr) =>
      curr.map((h) =>
        h.id === habit.id
          ? {
              ...h,
              completed_today: next,
              current_streak: next ? h.current_streak + 1 : Math.max(0, h.current_streak - 1),
            }
          : h,
      ),
    )
    try {
      const resp = next
        ? await http.post(`/api/habits/${habit.id}/check-in`, {})
        : await http.delete(`/api/habits/${habit.id}/check-in`)
      const refreshed =
        (resp as { habit?: Habit })?.habit ?? (resp as { data?: { habit?: Habit } })?.data?.habit
      if (refreshed && refreshed.id) {
        setHabits((curr) => curr.map((h) => (h.id === refreshed.id ? { ...h, ...refreshed } : h)))
      }
      if (today) {
        const todayResp = await http.get('/api/reports/today').catch(() => null)
        if (todayResp) setToday(unwrapSingle<Today>(todayResp))
      }
    } catch (err) {
      // Revert the optimistic update and surface the failure.
      setHabits((curr) =>
        curr.map((h) =>
          h.id === habit.id
            ? { ...h, completed_today: habit.completed_today, current_streak: habit.current_streak }
            : h,
        ),
      )
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    }
  }

  const completed = habits.filter((h) => h.completed_today).length
  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  if (error) {
    return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  }
  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
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
          {todayStr}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight', cm.sp('mt', 2))}>
          {t(
            'dashboard.heading',
            { completed, total: habits.length },
            { defaultValue: 'Today — {{completed}} of {{total}} done' },
          )}
        </h1>
      </header>

      <StreakHeroCard
        longestActive={today?.longest_active ?? overview?.longest_active_streak ?? 0}
        activeStreaks={today?.active_streaks ?? overview?.active_habits ?? 0}
        freezesAvailable={today?.freezes_available ?? 0}
        motivationalMessage={today?.motivational_message ?? ''}
        weeklyCompletion={overview?.weekly_completion}
      />

      {overview ? (
        <HabitStatsTriad
          todayDone={completed}
          todayTotal={habits.length}
          activeHabits={overview.active_habits}
          bestEverStreak={overview.best_ever_streak}
          bestEverHabit={overview.best_ever_habit}
          completionRate={overview.current_completion_rate}
        />
      ) : null}

      <section className={cm.cn('space-y-3')}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('dashboard.todaySection', {}, { defaultValue: "Today's checklist" })}
          </h2>
          <Link
            to="/habits/new"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'inline-flex items-center gap-2 rounded-full text-on-primary shadow-sm hover:shadow-md transition-shadow uppercase tracking-widest',
            )}
            style={{
              background:
                'linear-gradient(90deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>add</span>
            {t('dashboard.newHabitCta', {}, { defaultValue: 'New habit' })}
          </Link>
        </div>
        {habits.length === 0 ? (
          <p
            className={cm.cn(
              'bg-surface-container-lowest rounded-2xl shadow-sm',
              cm.sp('p', 12),
              cm.textCenter,
              'text-on-surface-variant',
            )}
          >
            {t(
              'dashboard.empty',
              {},
              { defaultValue: 'No habits yet. Add one to start a streak.' },
            )}
          </p>
        ) : (
          <ul className={cm.cn('space-y-3')}>
            {habits.map((h) => (
              <li key={h.id}>
                <HabitChecklistRow
                  id={h.id}
                  name={h.name}
                  emoji={h.emoji}
                  category={h.category}
                  cadence={h.cadence}
                  currentStreak={h.current_streak}
                  completedToday={h.completed_today}
                  onToggle={() => toggle(h)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <Link
          to="/habits"
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), cm.textPrimary)}
        >
          {t('dashboard.viewAllHabits', {}, { defaultValue: 'Manage habits →' })}
        </Link>
        <Link
          to="/stats"
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), cm.textPrimary)}
        >
          {t('dashboard.viewStats', {}, { defaultValue: 'See stats →' })}
        </Link>
      </div>
    </div>
  )
}
