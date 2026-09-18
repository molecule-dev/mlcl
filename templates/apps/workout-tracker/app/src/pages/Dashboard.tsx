import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ForjaTopBar } from '../components/ForjaTopBar.js'
import type { MuscleGroup } from '../components/MuscleGroupBadge.js'
import { type StatItem, StatsTriad } from '../components/StatsTriad.js'
import { WorkoutHeroCard } from '../components/WorkoutHeroCard.js'
import { type WorkoutHistoryEntry, WorkoutHistoryRow } from '../components/WorkoutHistoryRow.js'
import { getWeightUnit, toDisplayWeight } from '../lib/weight.js'

interface ApiWorkout {
  id: string
  name?: string | null
  status: string
  started_at: string
  completed_at?: string | null
  duration_seconds?: number | string | null
  total_volume?: number | string | null
  total_volume_kg?: number | string | null
  sets?: ApiWorkoutSet[]
}

interface ApiWorkoutSet {
  id: string
  exercise_id: string
}

interface ApiExercise {
  id: string
  name: string
  muscle_group?: string | null
  primary_muscle_group?: string | null
}

interface ApiSummary {
  period: number
  total_workouts: number
  total_volume: number
  total_duration_seconds: number
  avg_duration_seconds: number
}

interface ApiStreak {
  current_streak: number
  total_workout_days: number
}

interface ApiPersonalRecord {
  id: string
  achieved_at: string
}

function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const KNOWN_GROUPS = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'glutes',
  'calves',
] as const

function asMuscleGroup(s: string | null | undefined): MuscleGroup | null {
  if (!s) return null
  const lower = s.toLowerCase()
  for (const g of KNOWN_GROUPS) {
    if (lower.includes(g)) return g as MuscleGroup
  }
  return null
}

type TranslateFn = ReturnType<typeof useTranslation>['t']

function relativeDate(iso: string, t: TranslateFn): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diff <= 0) return t('forja.common.today', {}, { defaultValue: 'Today' })
  if (diff === 1) return t('forja.common.yesterday', {}, { defaultValue: 'Yesterday' })
  if (diff < 7) return d.toLocaleDateString(undefined, { weekday: 'long' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function toHistoryEntry(
  w: ApiWorkout,
  exerciseMap: Map<string, ApiExercise>,
  t: TranslateFn,
): WorkoutHistoryEntry {
  const sets = w.sets ?? []
  const groups = new Set<MuscleGroup>()
  for (const s of sets) {
    const ex = exerciseMap.get(s.exercise_id)
    const g = asMuscleGroup(ex?.primary_muscle_group ?? ex?.muscle_group ?? null)
    if (g) groups.add(g)
  }
  return {
    id: w.id,
    name: w.name || t('forja.active.defaultName', {}, { defaultValue: 'Workout' }),
    date: relativeDate(w.started_at, t),
    totalVolume: Math.round(toDisplayWeight(num(w.total_volume_kg ?? w.total_volume))),
    unit: getWeightUnit(),
    durationMin: Math.max(0, Math.round(num(w.duration_seconds) / 60)),
    sets: sets.length,
    newPRs: 0,
    muscleGroups: Array.from(groups),
  }
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [history, setHistory] = useState<WorkoutHistoryEntry[]>([])
  const [summary, setSummary] = useState<ApiSummary | null>(null)
  const [streak, setStreak] = useState<ApiStreak | null>(null)
  const [recentPRCount, setRecentPRCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [workoutsRes, exercisesRes, summaryRes, streakRes, prsRes] = await Promise.all([
          http.get<ApiWorkout[]>('/workouts?status=completed&limit=10'),
          http.get<ApiExercise[]>('/exercises'),
          http.get<ApiSummary>('/progress/summary?period=7'),
          http.get<ApiStreak>('/progress/streak'),
          http.get<ApiPersonalRecord[]>('/progress/personal-records?limit=50'),
        ])
        if (cancelled) return
        const exercises = exercisesRes.data ?? []
        const exerciseMap = new Map(exercises.map((e) => [e.id, e]))
        const workouts = workoutsRes.data ?? []
        const detailed = await Promise.all(
          workouts.map(async (w) => {
            try {
              const detail = (await http.get<ApiWorkout>(`/workouts/${w.id}`)).data
              return detail ?? w
            } catch (_error) {
              // Detail fetch failed — fall back to list-level workout object
              return w
            }
          }),
        )
        if (cancelled) return
        setHistory(detailed.map((w) => toHistoryEntry(w, exerciseMap, t)))
        setSummary(summaryRes.data ?? null)
        setStreak(streakRes.data ?? null)
        const prs = prsRes.data ?? []
        const since = Date.now() - 30 * 86_400_000
        setRecentPRCount(prs.filter((r) => new Date(r.achieved_at).getTime() >= since).length)
      } catch (_error) {
        // Network errors leave defaults — dashboard degrades gracefully
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const trend = useMemo(() => {
    if (history.length === 0) return [0, 0, 0, 0, 0, 0, 0]
    const last7 = history.slice(0, 7).reverse()
    const padded = [...Array(7 - last7.length).fill(0), ...last7.map((h) => h.totalVolume)]
    return padded
  }, [history])

  const totalSets = useMemo(
    () => history.slice(0, 7).reduce((s, h) => s + (h.sets ?? 0), 0),
    [history],
  )
  const weekVolume = useMemo(
    () => history.slice(0, 7).reduce((s, h) => s + (h.totalVolume ?? 0), 0),
    [history],
  )

  const stats: StatItem[] = [
    {
      key: 'streak',
      icon: 'local_fire_department',
      tone: 'streak',
      label: t('forja.dashboard.stats.streak.label', {}, { defaultValue: 'Active streak' }),
      value: String(streak?.current_streak ?? 0),
      caption: t(
        'forja.dashboard.stats.streak.caption',
        { total: streak?.total_workout_days ?? 0 },
        { defaultValue: 'days · {{total}} total workout days' },
      ),
    },
    {
      key: 'sets',
      icon: 'fitness_center',
      tone: 'primary',
      label: t('forja.dashboard.stats.sets.label', {}, { defaultValue: 'Sets this week' }),
      value: String(totalSets),
      caption: t(
        'forja.dashboard.stats.sets.caption',
        { count: summary?.total_workouts ?? 0 },
        { defaultValue: '{{count}} sessions logged' },
      ),
    },
    {
      key: 'prs',
      icon: 'emoji_events',
      tone: 'pr',
      label: t('forja.dashboard.stats.prs.label', {}, { defaultValue: 'PRs this month' }),
      value: String(recentPRCount),
      caption: t(
        'forja.dashboard.stats.prs.caption',
        {},
        { defaultValue: 'estimated 1RM records' },
      ),
    },
  ]

  return (
    <>
      <ForjaTopBar
        title={t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
        eyebrow={
          <>
            <span>{new Date().toLocaleDateString(undefined, { weekday: 'long' })}</span>
            {streak && streak.current_streak > 0 ? (
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.sp('py', 0),
                  'rounded-full bg-pr-light text-pr-text text-[10px] font-black uppercase tracking-widest',
                )}
              >
                {t(
                  'forja.dashboard.streak',
                  { count: streak.current_streak },
                  { defaultValue: '{{count}}d streak' },
                )}
              </span>
            ) : null}
          </>
        }
        actions={
          <Link
            to="/workout/active"
            data-testid="start-workout-link"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'bg-primary text-on-primary rounded-full hover:bg-primary-light transition-colors uppercase tracking-wide text-sm',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
              play_arrow
            </span>
            {t('forja.dashboard.startWorkout', {}, { defaultValue: 'Start workout' })}
          </Link>
        }
      />

      <WorkoutHeroCard
        eyebrow={t(
          'forja.dashboard.hero.eyebrow',
          {},
          { defaultValue: 'This Week · Total Volume' },
        )}
        totalVolume={Math.round(weekVolume)}
        unit={getWeightUnit()}
        change={undefined}
        trend={trend}
        workouts={summary?.total_workouts ?? 0}
        setsLogged={totalSets}
      />

      <StatsTriad items={stats} />

      <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }))}>
          <div>
            <h2 className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface')}>
              {t('forja.dashboard.recent.title', {}, { defaultValue: 'Recent workouts' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'forja.dashboard.recent.body',
                {},
                { defaultValue: 'Your last sessions, latest first.' },
              )}
            </p>
          </div>
          <Link
            to="/history"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-primary-dark hover:underline uppercase tracking-wide',
            )}
          >
            {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
          </Link>
        </div>

        {loading ? (
          <div
            className={cm.cn(
              cm.sp('p', 5),
              cm.textSize('sm'),
              'text-on-surface-variant rounded-xl bg-surface border border-outline/40',
            )}
          >
            {t('forja.dashboard.recent.loading', {}, { defaultValue: 'Loading recent workouts…' })}
          </div>
        ) : history.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('p', 5),
              cm.textSize('sm'),
              'text-on-surface-variant rounded-xl bg-surface border border-outline/40 text-center',
            )}
            data-testid="dashboard-empty"
          >
            {t(
              'forja.dashboard.recent.empty',
              {},
              { defaultValue: 'No workouts logged yet — pick the bar up.' },
            )}
          </div>
        ) : (
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'list-none')}>
            {history.slice(0, 6).map((entry) => (
              <li key={entry.id}>
                <WorkoutHistoryRow entry={entry} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
