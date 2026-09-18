import { useEffect, useMemo, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { StillpointTopBar } from '../components/StillpointTopBar.js'
import type {
  ApiHistory,
  ApiSession,
  ApiStatsStreak,
  ApiStatsSummaryServer,
  ApiUserPreferences,
} from '../lib/api.js'

interface AchievementSpec {
  id: string
  icon: string
  defaultTitle: string
  defaultBody: string
  earned: (ctx: AchievementContext) => boolean
}

interface AchievementContext {
  totalSessions: number
  longestStreak: number
  totalMinutes: number
  uniqueDays: number
  hasMorningSession: boolean
  longSessionDone: boolean
  uniqueSleepSessions: number
}

const ACHIEVEMENTS: AchievementSpec[] = [
  {
    id: 'first-session',
    icon: 'self_improvement',
    defaultTitle: 'First breath',
    defaultBody: 'Completed your first session.',
    earned: (c) => c.totalSessions >= 1,
  },
  {
    id: 'week-streak',
    icon: 'local_fire_department',
    defaultTitle: '7-day streak',
    defaultBody: 'Practiced every day for a week.',
    earned: (c) => c.longestStreak >= 7,
  },
  {
    id: 'sleep-explorer',
    icon: 'bedtime',
    defaultTitle: 'Sleep explorer',
    defaultBody: 'Tried 5 different sleep stories.',
    earned: (c) => c.uniqueSleepSessions >= 5,
  },
  {
    id: 'morning-bird',
    icon: 'wb_sunny',
    defaultTitle: 'Morning bird',
    defaultBody: 'Practiced before 8 AM.',
    earned: (c) => c.hasMorningSession,
  },
  {
    id: 'deep-stillness',
    icon: 'spa',
    defaultTitle: 'Deep stillness',
    defaultBody: 'Completed a 30-minute session.',
    earned: (c) => c.longSessionDone,
  },
  {
    id: 'devoted',
    icon: 'workspace_premium',
    defaultTitle: 'Devoted',
    defaultBody: 'Practiced on 30+ different days.',
    earned: (c) => c.uniqueDays >= 30,
  },
]

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserProfile>()

  const [streak, setStreak] = useState<ApiStatsStreak | null>(null)
  const [summary, setSummary] = useState<ApiStatsSummaryServer | null>(null)
  const [history, setHistory] = useState<ApiHistory[]>([])
  const [sessions, setSessions] = useState<Map<string, ApiSession>>(new Map())
  const [prefs, setPrefs] = useState<ApiUserPreferences | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get<ApiStatsStreak>('/stats/streak'),
      http.get<ApiStatsSummaryServer>('/stats/summary'),
      http.get<ApiHistory[]>('/history?limit=200'),
      http.get<ApiUserPreferences>('/preferences'),
    ])
      .then(async ([s, su, h, p]) => {
        if (cancelled) return
        setStreak(s.data ?? null)
        setSummary(su.data ?? null)
        const list = Array.isArray(h.data) ? h.data : []
        setHistory(list)
        setPrefs(p.data ?? null)
        const sessionIds = Array.from(
          new Set(list.map((x) => x.session_id).filter((id): id is string => Boolean(id))),
        )
        if (sessionIds.length > 0) {
          const fetched = await Promise.all(
            sessionIds.map((id) =>
              http
                .get<ApiSession>(`/sessions/${id}`)
                .then((r) => r.data)
                .catch(() => null),
            ),
          )
          if (cancelled) return
          const map = new Map<string, ApiSession>()
          for (const sess of fetched) if (sess?.id) map.set(sess.id, sess)
          setSessions(map)
        }
      })
      .catch(() => {
        // swallow — UI shows zeros if fetch fails
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const ctx = useMemo<AchievementContext>(() => {
    let totalMinutes = 0
    let hasMorningSession = false
    let longSessionDone = false
    const sleepSessionIds = new Set<string>()
    const uniqueDates = new Set<string>()
    for (const h of history) {
      const seconds = h.duration_seconds ?? 0
      totalMinutes += seconds / 60
      if (seconds >= 30 * 60) longSessionDone = true
      const startedAt = new Date(h.started_at)
      uniqueDates.add(startedAt.toISOString().slice(0, 10))
      if (startedAt.getHours() < 8) hasMorningSession = true
      if (h.session_id) {
        const sess = sessions.get(h.session_id)
        if (sess && /sleep/i.test(sess.slug)) sleepSessionIds.add(h.session_id)
      }
    }
    return {
      totalSessions: history.length,
      longestStreak: streak?.longest_streak ?? 0,
      totalMinutes: Math.round(totalMinutes),
      uniqueDays: uniqueDates.size,
      hasMorningSession,
      longSessionDone,
      uniqueSleepSessions: sleepSessionIds.size,
    }
  }, [history, sessions, streak])

  const displayName =
    user?.name ??
    user?.email?.split('@')[0] ??
    t('stillpoint.profile.you', {}, { defaultValue: 'You' })
  const handle =
    user?.email?.split('@')[0] ??
    t('stillpoint.profile.defaultHandle', {}, { defaultValue: 'stillpointer' })

  const goal = prefs?.weekly_goal_minutes ?? 120
  const minutesThisWeek = summary?.total_minutes ?? 0
  const ratio = Math.min(1, goal > 0 ? minutesThisWeek / goal : 0)

  const headerStats = [
    {
      value: ctx.totalMinutes.toLocaleString(),
      labelKey: 'stillpoint.profile.lifetime',
      defaultLabel: 'lifetime min',
      testId: 'profile-lifetime',
    },
    {
      value: ctx.totalSessions.toLocaleString(),
      labelKey: 'stillpoint.profile.sessions',
      defaultLabel: 'sessions',
      testId: 'profile-sessions',
    },
    {
      value: (streak?.longest_streak ?? 0).toLocaleString(),
      labelKey: 'stillpoint.profile.bestStreak',
      defaultLabel: 'best streak',
      testId: 'profile-best-streak',
    },
  ]

  return (
    <>
      <StillpointTopBar
        title={t('nav.profile', {}, { defaultValue: 'Profile' })}
        eyebrow={
          <span data-testid="profile-eyebrow">
            {t('stillpoint.profile.eyebrow', {}, { defaultValue: 'Your practice, summarised.' })}
          </span>
        }
      />

      <section
        data-testid="profile-hero"
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between', gap: 'lg' }),
          cm.sp('p', 8),
          'rounded-[2rem] bg-gradient-to-br from-[var(--color-hero-from)] via-primary to-[var(--color-cat-mindfulness)] text-white relative overflow-hidden md:flex-row md:items-center',
        )}
      >
        <div
          className={cm.cn(
            'absolute -top-24 -left-20 w-80 h-80 bg-surface/10 rounded-full blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'absolute -bottom-24 -right-20 w-80 h-80 bg-accent/30 rounded-full blur-3xl',
          )}
          aria-hidden="true"
        />
        <div className={cm.cn('relative z-10 flex items-center gap-5')}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.fontWeight('bold'),
              'w-20 h-20 rounded-full bg-surface/15 backdrop-blur-md text-3xl uppercase tracking-tight',
            )}
            aria-hidden="true"
          >
            {displayName[0]?.toUpperCase()}
          </span>
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-white/70',
              )}
            >
              {t(
                'stillpoint.profile.member',
                { appName: APP_NAME },
                { defaultValue: '{{appName}} member' },
              )}
            </p>
            <p
              data-testid="profile-name"
              className={cm.cn('text-3xl font-extrabold tracking-tight leading-tight mt-1')}
            >
              {displayName}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-white/85 mt-1')}>@{handle}</p>
          </div>
        </div>
        <div className={cm.cn('relative z-10 grid grid-cols-3 gap-6 max-w-md md:text-right')}>
          {headerStats.map((s) => (
            <div key={s.testId} data-testid={s.testId}>
              <p className={cm.cn('text-3xl font-extrabold tabular-nums tracking-tight')}>
                {s.value}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  'uppercase tracking-widest text-white/80 font-bold mt-1',
                )}
              >
                {t(s.labelKey, {}, { defaultValue: s.defaultLabel })}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        data-testid="profile-weekly-goal"
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'sm' }),
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest shadow-sm border border-outline/30',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <h2 className={cm.cn(cm.fontWeight('bold'), 'text-lg text-on-surface tracking-tight')}>
            {t('stillpoint.profile.weeklyGoal', {}, { defaultValue: 'Weekly practice goal' })}
          </h2>
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-primary tabular-nums')}
          >
            {minutesThisWeek} / {goal}{' '}
            <span className={cm.cn('text-on-surface-variant font-normal')}>
              {t('stillpoint.profile.minutesThisWeek', {}, { defaultValue: 'minutes this week' })}
            </span>
          </span>
        </div>
        <div className={cm.cn('w-full h-2 rounded-full bg-outline/30 overflow-hidden')}>
          <div
            className={cm.cn('h-full bg-primary transition-all')}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      </section>

      <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <h2 className={cm.cn(cm.fontWeight('bold'), 'text-lg text-on-surface tracking-tight')}>
          {t('nav.achievements', {}, { defaultValue: 'Achievements' })}
        </h2>
        <div
          data-testid="profile-achievements"
          className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4')}
        >
          {ACHIEVEMENTS.map((a) => {
            const earned = a.earned(ctx)
            return (
              <div
                key={a.id}
                data-testid={`profile-achievement-${a.id}${earned ? '-earned' : ''}`}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.sp('p', 5),
                  'rounded-2xl bg-surface-container-lowest shadow-sm border border-outline/20',
                  earned ? '' : 'opacity-60',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-12 h-12 rounded-xl text-2xl',
                    earned
                      ? 'bg-accent-container text-on-accent-container'
                      : 'bg-surface-variant text-on-surface-variant',
                  )}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  <span className={cm.cn('material-symbols-outlined')}>{a.icon}</span>
                </span>
                <div>
                  <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                    {t(
                      `stillpoint.profile.ach.${a.id}.title`,
                      {},
                      { defaultValue: a.defaultTitle },
                    )}
                  </p>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(`stillpoint.profile.ach.${a.id}.body`, {}, { defaultValue: a.defaultBody })}
                  </p>
                </div>
                {!earned ? (
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'uppercase tracking-widest font-bold text-on-surface-variant',
                    )}
                  >
                    {t('stillpoint.profile.locked', {}, { defaultValue: 'Locked' })}
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      {loading ? (
        <p
          data-testid="profile-loading"
          className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant text-center')}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : null}
    </>
  )
}
