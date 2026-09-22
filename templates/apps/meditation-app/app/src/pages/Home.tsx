import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SessionCard, type SessionCardItem } from '../components/SessionCard.js'
import { StillpointTopBar } from '../components/StillpointTopBar.js'
import { StreakRingCard } from '../components/StreakRingCard.js'
import { TodaySessionHeroCard } from '../components/TodaySessionHeroCard.js'
import type {
  ApiCategory,
  ApiSession,
  ApiStatsDailyServer,
  ApiStatsStreak,
  ApiStatsSummaryServer,
  ApiUserPreferences,
} from '../lib/api.js'
import { toMinutes, toneFor } from '../lib/api.js'

interface CategoryWithCount extends ApiCategory {
  session_count: number
}

function formatToday(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function sessionToCard(s: ApiSession, categories: CategoryWithCount[]): SessionCardItem {
  const cat = categories.find((c) => c.id === s.category_id)
  return {
    id: s.slug || s.id,
    title: s.title,
    instructor: s.instructor_name ?? '',
    durationMinutes: toMinutes(s.duration_seconds),
    category: toneFor(cat?.slug ?? null),
    categoryLabel: cat?.label ?? '',
    description: s.description ?? '',
  }
}

export function Home() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserProfile>()
  const firstName =
    user?.name?.split(' ')[0] ??
    user?.email?.split('@')[0] ??
    t('stillpoint.home.friend', {}, { defaultValue: 'friend' })

  const [sessions, setSessions] = useState<ApiSession[]>([])
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [streak, setStreak] = useState<ApiStatsStreak | null>(null)
  const [summary, setSummary] = useState<ApiStatsSummaryServer | null>(null)
  const [daily, setDaily] = useState<ApiStatsDailyServer[]>([])
  const [preferences, setPreferences] = useState<ApiUserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    Promise.all([
      http.get<ApiSession[]>('/sessions?limit=4'),
      http.get<CategoryWithCount[]>('/categories'),
      http.get<ApiStatsStreak>('/stats/streak'),
      http.get<ApiStatsSummaryServer>('/stats/summary'),
      http.get<ApiStatsDailyServer[]>('/stats/daily'),
      http.get<ApiUserPreferences>('/preferences'),
    ])
      .then(([s, c, st, su, d, pr]) => {
        if (cancelled) return
        setSessions(Array.isArray(s.data) ? s.data : [])
        setCategories(Array.isArray(c.data) ? c.data : [])
        setStreak(st.data ?? null)
        setSummary(su.data ?? null)
        setDaily(Array.isArray(d.data) ? d.data : [])
        setPreferences(pr.data ?? null)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const todaySession = sessions[0] ?? null
  const recommended = useMemo(
    () => sessions.slice(1, 4).map((s) => sessionToCard(s, categories)),
    [sessions, categories],
  )
  const todayCard = useMemo(
    () => (todaySession ? sessionToCard(todaySession, categories) : null),
    [todaySession, categories],
  )

  const weeklyGoal = preferences?.weekly_goal_minutes ?? 120
  const minutesThisWeek = summary?.total_minutes ?? 0
  const sessionsThisWeek = summary?.total_sessions ?? 0
  // /stats/daily buckets by UTC date (matching Stats.tsx), so read today's
  // real minutes from the same bucket instead of estimating.
  const todayIso = new Date().toISOString().split('T')[0]
  const minutesToday = daily.find((d) => d.date === todayIso)?.minutes ?? 0

  return (
    <>
      <StillpointTopBar
        title={t(
          'stillpoint.home.heading',
          { name: firstName },
          { defaultValue: 'Welcome back, {{name}} 🪷' },
        )}
        eyebrow={
          <>
            <span data-testid="home-date">{formatToday()}</span>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                'rounded-full bg-primary-container text-on-primary-container font-bold uppercase tracking-widest',
              )}
            >
              {t('status.today', {}, { defaultValue: 'Today' })}
            </span>
          </>
        }
      />

      {loadError ? (
        <div
          data-testid="home-load-error"
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-2xl border border-error text-error bg-error-container/30',
          )}
        >
          {t(
            'stillpoint.home.loadError',
            { error: loadError },
            { defaultValue: "Couldn't load your practice: {{error}}" },
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={cm.cn(
              cm.sp('ml', 3),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full border border-error hover:bg-error/10 transition-colors',
            )}
          >
            {t('common.retry', {}, { defaultValue: 'Retry' })}
          </button>
        </div>
      ) : null}

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch')}>
        {todayCard ? (
          <TodaySessionHeroCard
            sessionId={todayCard.id}
            eyebrow={t('stillpoint.home.heroEyebrow', {}, { defaultValue: "Today's session" })}
            title={todayCard.title}
            instructor={todayCard.instructor}
            durationMinutes={todayCard.durationMinutes}
            category={todayCard.categoryLabel}
          />
        ) : (
          <div
            data-testid="home-hero-empty"
            className={cm.cn(
              'lg:col-span-8 rounded-2xl border border-dashed border-outline p-12 text-center text-on-surface-variant',
            )}
          >
            {loading
              ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
              : t(
                  'stillpoint.home.empty',
                  {},
                  { defaultValue: 'No sessions yet — check back soon.' },
                )}
          </div>
        )}
        <div className={cm.cn('lg:col-span-4')}>
          <StreakRingCard
            days={streak?.current_streak ?? 0}
            minutesThisWeek={minutesThisWeek}
            weeklyGoalMinutes={weeklyGoal}
            headline={t('stillpoint.home.streakHeadline', {}, { defaultValue: 'day streak' })}
            subline={t(
              'stillpoint.home.streakSubline',
              {},
              { defaultValue: 'Stillness compounds. Show up tomorrow.' },
            )}
          />
        </div>
      </div>

      <div data-testid="home-kpis" className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-4')}>
        <KpiCard
          icon="self_improvement"
          accent="border-l-primary text-primary"
          label={t('stillpoint.home.kpi.minutes', {}, { defaultValue: 'Minutes today' })}
          value={String(minutesToday)}
          testid="home-kpi-minutes"
        />
        <KpiCard
          icon="spa"
          accent="border-l-secondary text-secondary"
          label={t('stillpoint.home.kpi.sessions', {}, { defaultValue: 'Sessions this week' })}
          value={String(sessionsThisWeek)}
          testid="home-kpi-sessions"
        />
        <KpiCard
          icon="local_fire_department"
          accent="border-l-accent text-accent"
          label={t('stillpoint.home.kpi.streak', {}, { defaultValue: 'Day streak' })}
          value={String(streak?.current_streak ?? 0)}
          testid="home-kpi-streak"
        />
      </div>

      <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface tracking-tight')}>
            {t('stillpoint.home.recommendedHeading', {}, { defaultValue: 'Recommended for you' })}
          </h2>
          <Link
            to="/library"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-primary hover:underline',
            )}
          >
            {t('stillpoint.home.viewAll', {}, { defaultValue: 'View library →' })}
          </Link>
        </div>
        {recommended.length > 0 ? (
          <div
            data-testid="home-recommended"
            className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-4')}
          >
            {recommended.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        ) : (
          <div
            data-testid="home-recommended-empty"
            className={cm.cn(
              cm.sp('p', 8),
              cm.textCenter,
              'rounded-2xl border border-dashed border-outline text-on-surface-variant',
            )}
          >
            {t(
              'stillpoint.home.noRecommended',
              {},
              { defaultValue: 'Recommendations will appear as you practice.' },
            )}
          </div>
        )}
      </section>
    </>
  )
}

interface KpiCardProps {
  icon: string
  accent: string
  label: string
  value: string
  testid: string
}

function KpiCard({ icon, accent, label, value, testid }: KpiCardProps) {
  const cm = getClassMap()
  return (
    <div
      data-testid={testid}
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'sm' }),
        cm.sp('p', 5),
        'rounded-2xl shadow-sm border-l-4 bg-surface-container-lowest hover:-translate-y-0.5 transition-transform',
        accent,
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <span
          aria-hidden="true"
          className={cm.cn('material-symbols-outlined text-2xl')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {label}
        </span>
      </div>
      <p className={cm.cn('text-4xl font-extrabold text-on-surface tabular-nums tracking-tight')}>
        {value}
      </p>
    </div>
  )
}
