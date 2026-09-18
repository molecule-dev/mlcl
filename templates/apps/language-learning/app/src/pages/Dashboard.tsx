import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DailyStatsTriad } from '../components/DailyStatsTriad.js'
import { type LeaderboardEntry, LeaderboardPanel } from '../components/LeaderboardPanel.js'
import {
  type LessonRecommendation,
  LessonRecommendationCard,
} from '../components/LessonRecommendationCard.js'
import { StreakHeroCard } from '../components/StreakHeroCard.js'

interface BackendLesson {
  id: string
  title: string
  language: string | null
  flag: string | null
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | string | null
  duration_min: number | string
  lessons_remaining: number | string
  progress_percent: number | string
  icon: string | null
  tone?: string | null
}

interface BackendLeaderboardEntry {
  user_id: string
  total_xp: number | string
  current_streak?: number | string
  daily_goal_xp?: number | string
  name?: string | null
  email?: string | null
}

interface ProgressSummary {
  current_streak?: number
  longest_streak?: number
  total_xp?: number
  today_xp?: number
  daily_goal?: number
  hearts?: number
  hearts_max?: number
  words_mastered?: number
  minutes_today?: number
  history?: ReadonlyArray<{ day: string; xp: number }>
  recommended_lessons?: BackendLesson[]
}

const FALLBACK_PROGRESS: Required<
  Pick<
    ProgressSummary,
    | 'current_streak'
    | 'total_xp'
    | 'today_xp'
    | 'daily_goal'
    | 'hearts'
    | 'hearts_max'
    | 'words_mastered'
    | 'minutes_today'
    | 'history'
  >
> = {
  current_streak: 0,
  total_xp: 0,
  today_xp: 0,
  daily_goal: 50,
  hearts: 5,
  hearts_max: 5,
  words_mastered: 0,
  minutes_today: 0,
  history: [
    { day: 'Mon', xp: 0 },
    { day: 'Tue', xp: 0 },
    { day: 'Wed', xp: 0 },
    { day: 'Thu', xp: 0 },
    { day: 'Fri', xp: 0 },
    { day: 'Sat', xp: 0 },
    { day: 'Sun', xp: 0 },
  ],
}

function adaptLesson(row: BackendLesson): LessonRecommendation {
  const allowedLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
  const lvl = (allowedLevels as readonly string[]).includes(String(row.level))
    ? (row.level as LessonRecommendation['level'])
    : 'A1'
  const allowedTones = ['primary', 'secondary', 'tertiary', 'info'] as const
  const tone = (allowedTones as readonly string[]).includes(String(row.tone))
    ? (row.tone as LessonRecommendation['tone'])
    : 'primary'
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    language: String(row.language ?? ''),
    flag: String(row.flag ?? ''),
    level: lvl,
    durationMin: Number(row.duration_min ?? 5),
    lessonsRemaining: Number(row.lessons_remaining ?? 0),
    progressPercent: Number(row.progress_percent ?? 0),
    icon: String(row.icon ?? 'school'),
    tone,
  }
}

const NAME_FLAGS = ['🇪🇸', '🇫🇷', '🇯🇵', '🇩🇪', '🇮🇹', '🇰🇷', '🇨🇳', '🇧🇷']

function adaptLeaderboard(
  rows: BackendLeaderboardEntry[],
  meId: string | null,
): LeaderboardEntry[] {
  return rows.slice(0, 5).map((r, idx) => ({
    id: String(r.user_id),
    rank: idx + 1,
    name: r.name?.trim() || (r.email?.split('@')[0] ?? `Learner ${idx + 1}`),
    flag: NAME_FLAGS[idx % NAME_FLAGS.length],
    avatar: `https://picsum.photos/seed/parlance-${r.user_id}/96/96`,
    xp: Number(r.total_xp ?? 0),
    isCurrentUser: meId != null && String(r.user_id) === meId,
  }))
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ id?: string; name?: string }>()
  const http = useHttpClient()
  const [progress, setProgress] = useState<ProgressSummary | null>(null)
  const [lessons, setLessons] = useState<LessonRecommendation[] | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userId = user?.id ?? null

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get<ProgressSummary>('/api/progress/user/me/summary'),
      http.get<{ entries: BackendLeaderboardEntry[] }>('/api/leaderboard/weekly'),
    ])
      .then(([summaryRes, lbRes]) => {
        if (cancelled) return
        const summary =
          (summaryRes && typeof summaryRes === 'object' && 'data' in summaryRes
            ? (summaryRes as { data: ProgressSummary }).data
            : (summaryRes as ProgressSummary)) ?? null
        if (summary && Object.keys(summary).length) {
          setProgress(summary)
          if (Array.isArray(summary.recommended_lessons)) {
            setLessons(summary.recommended_lessons.map(adaptLesson))
          }
        }
        const lbBody =
          (lbRes && typeof lbRes === 'object' && 'data' in lbRes
            ? (lbRes as { data: { entries: BackendLeaderboardEntry[] } }).data
            : (lbRes as { entries: BackendLeaderboardEntry[] })) ?? null
        const entries = lbBody?.entries ?? []
        setLeaderboard(adaptLeaderboard(entries, userId))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t(
              'dashboard.loadError',
              {},
              { defaultValue: 'Could not load latest progress — showing cached values.' },
            ),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t, userId])

  const p = { ...FALLBACK_PROGRESS, ...(progress ?? {}) }

  const recommended: LessonRecommendation[] = lessons && lessons.length > 0 ? lessons : []

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header
        className={cm.cn(cm.flex({ justify: 'between', align: 'center', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <p className={cm.cn('font-bold uppercase tracking-widest text-xs text-primary')}>
            {t(
              'dashboard.eyebrow',
              { day: new Date().toLocaleDateString(undefined, { weekday: 'long' }) },
              { defaultValue: '{{day}} · daily practice' },
            )}
          </p>
          <h1
            className={cm.cn(cm.textSize('4xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}
          >
            {t(
              'dashboard.heading',
              { name: user?.name?.split(' ')[0] || 'learner' },
              { defaultValue: 'Buenos días, {{name}}.' },
            )}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant max-w-xl')}
          >
            {t(
              'dashboard.subheading',
              {},
              {
                defaultValue:
                  'Pick up where you left off — three short sessions and you’ll hit today’s goal.',
              },
            )}
          </p>
        </div>
        <Link
          to="/practice"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            'rounded-full bg-gradient-to-r from-primary to-primary-dark text-on-primary font-semibold text-sm hover:shadow-lg hover:shadow-primary/30 transition-all inline-flex items-center gap-2',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            mic
          </span>
          {t('dashboard.startPractice', {}, { defaultValue: 'Start speaking practice' })}
        </Link>
      </header>

      {error && (
        <p
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('xs'),
            cm.textCenter,
            'rounded-xl bg-warning-container/40 text-on-warning-container',
          )}
        >
          {error}
        </p>
      )}

      {/* Hero row: Streak hero (8 col) + Leaderboard panel (4 col) */}
      <section
        className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-stretch')}
      >
        <StreakHeroCard
          streakDays={p.current_streak}
          xpToday={p.today_xp}
          xpGoal={p.daily_goal}
          totalXp={p.total_xp}
          history={p.history}
        />
        <div className={cm.cn('lg:col-span-4')}>
          <LeaderboardPanel entries={leaderboard ?? []} />
        </div>
      </section>

      <DailyStatsTriad
        hearts={p.hearts}
        heartsMax={p.hearts_max}
        wordsLearned={p.words_mastered}
        minutesPracticed={p.minutes_today}
      />

      {/* Continue learning */}
      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('dashboard.continueHeading', {}, { defaultValue: 'Continue where you left off' })}
          </h2>
          <Link
            to="/lessons"
            className={cm.cn(cm.textSize('sm'), 'font-bold text-primary hover:underline')}
          >
            {t('dashboard.viewAllLessons', {}, { defaultValue: 'All lessons →' })}
          </Link>
        </div>
        {recommended.length > 0 ? (
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}
          >
            {recommended.map((lesson) => (
              <LessonRecommendationCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
        ) : (
          !loading && (
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.textCenter,
                cm.sp('py', 6),
                'text-on-surface-variant',
              )}
            >
              {t(
                'dashboard.noLessons',
                {},
                { defaultValue: 'No lessons available yet — check back soon.' },
              )}
            </p>
          )
        )}
        {loading && (
          <p className={cm.cn(cm.textSize('xs'), cm.textCenter, 'text-on-surface-variant')}>
            {t('dashboard.loading', {}, { defaultValue: 'Refreshing…' })}
          </p>
        )}
      </section>
    </div>
  )
}

export default Dashboard
