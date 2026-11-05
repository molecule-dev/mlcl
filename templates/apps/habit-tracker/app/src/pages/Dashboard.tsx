import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useOptimisticValue, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type HabitCategory, HabitChecklistRow } from '../components/HabitChecklistRow.js'
import { HabitStatsTriad } from '../components/HabitStatsTriad.js'
import { StreakHeroCard } from '../components/StreakHeroCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

/** Streak lengths worth a one-time celebration event. */
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365]

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

/** What today's checklist shows for one habit. */
interface CheckIn {
  done: boolean
  streak: number
}

/** Today's check-ins by habit id. */
type CheckIns = Record<string, CheckIn>

const sameCheckIns = (a: CheckIns, b: CheckIns): boolean => {
  const ids = Object.keys(a)
  return (
    ids.length === Object.keys(b).length &&
    ids.every((id) => a[id]?.done === b[id]?.done && a[id]?.streak === b[id]?.streak)
  )
}

/** Tick or untick one habit, moving its streak with it. */
const toggleCheckIn = (current: CheckIns, id: string, fallback: CheckIn): CheckIns => {
  const check = current[id] ?? fallback
  const done = !check.done
  return {
    ...current,
    [id]: { done, streak: done ? check.streak + 1 : Math.max(0, check.streak - 1) },
  }
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

  // The checklist changes at once on every tap and saves the taps in order, so a quick
  // tick-untick never leaves a habit showing a check-in the server does not hold.
  const serverCheckIns = useMemo<CheckIns>(
    () =>
      Object.fromEntries(
        habits.map((h) => [h.id, { done: h.completed_today, streak: h.current_streak }]),
      ),
    [habits],
  )
  const checkIns = useOptimisticValue<CheckIns>({
    value: serverCheckIns,
    equals: sameCheckIns,
    commit: async (next, previous, confirm) => {
      // The record map is not an atomic server write. Keep each accepted check-in even
      // when a later request fails, and compare queued taps with that actual progress.
      confirm((current) => current)
      let changed = false
      try {
        for (const [id, check] of Object.entries(next)) {
          if (previous[id]?.done === check.done) continue
          const resp = check.done
            ? await http.post(`/api/habits/${id}/check-in`, {})
            : await http.delete(`/api/habits/${id}/check-in`)
          const refreshed =
            (resp as { habit?: Habit })?.habit ??
            (resp as { data?: { habit?: Habit } })?.data?.habit
          const streak = refreshed?.current_streak ?? check.streak
          confirm((current) => ({
            ...current,
            [id]: { done: refreshed?.completed_today ?? check.done, streak },
          }))
          changed = true
          if (check.done) {
            void track({ name: 'habit.checked_in', properties: { habit_id: id, streak } })
            if (STREAK_MILESTONES.includes(streak)) {
              void track({ name: 'streak.milestone', properties: { habit_id: id, streak } })
            }
          } else {
            void track({ name: 'habit.unchecked', properties: { habit_id: id } })
          }
        }
      } finally {
        if (changed && today) {
          const todayResp = await http.get('/api/reports/today').catch(() => null)
          if (todayResp) setToday(unwrapSingle<Today>(todayResp))
        }
      }
    },
    onError: (err) => setError(err instanceof Error ? err.message : String(err)),
  })
  const shown = (h: Habit): CheckIn =>
    checkIns.value[h.id] ?? { done: h.completed_today, streak: h.current_streak }

  const completed = habits.filter((h) => shown(h).done).length
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
                  currentStreak={shown(h).streak}
                  completedToday={shown(h).done}
                  onToggle={() =>
                    checkIns.update((current) =>
                      toggleCheckIn(current, h.id, {
                        done: h.completed_today,
                        streak: h.current_streak,
                      }),
                    )
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <Link
          to="/habits"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.textPrimary,
            'inline-flex min-h-10 items-center',
          )}
        >
          {t('dashboard.viewAllHabits', {}, { defaultValue: 'Manage habits →' })}
        </Link>
        <Link
          to="/stats"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.textPrimary,
            'inline-flex min-h-10 items-center',
          )}
        >
          {t('dashboard.viewStats', {}, { defaultValue: 'See stats →' })}
        </Link>
      </div>
    </div>
  )
}
