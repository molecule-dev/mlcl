import { useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SummaryProfile {
  total_xp: number | string
  lessons_completed: number | string
  current_streak: number | string
  longest_streak: number | string
  daily_goal_xp: number | string
  target_languages: string[] | string
}

interface BackendCourse {
  id: string
  language_name?: string | null
  language_code?: string | null
  flag?: string | null
  level?: string | null
  progress_percent?: number | string
  lesson_count?: number | string
}

interface SummaryResponse {
  profile: SummaryProfile
  total_xp?: number
  current_streak?: number
}

const ACHIEVEMENT_RULES = [
  {
    key: 'first_lesson',
    icon: 'school',
    label: 'First lesson',
    when: (p: { lessons_completed: number }) => p.lessons_completed >= 1,
  },
  {
    key: 'streak_3',
    icon: 'local_fire_department',
    label: '3-day streak',
    when: (p: { current_streak: number }) => p.current_streak >= 3,
  },
  {
    key: 'streak_7',
    icon: 'local_fire_department',
    label: '7-day streak',
    when: (p: { current_streak: number }) => p.current_streak >= 7,
  },
  {
    key: 'streak_30',
    icon: 'whatshot',
    label: '30-day streak',
    when: (p: { current_streak: number }) => p.current_streak >= 30,
  },
  {
    key: 'xp_100',
    icon: 'auto_stories',
    label: '100 XP',
    when: (p: { total_xp: number }) => p.total_xp >= 100,
  },
  {
    key: 'xp_500',
    icon: 'auto_stories',
    label: '500 XP',
    when: (p: { total_xp: number }) => p.total_xp >= 500,
  },
  {
    key: 'xp_1000',
    icon: 'workspace_premium',
    label: '1000 XP',
    when: (p: { total_xp: number }) => p.total_xp >= 1000,
  },
] as const

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<{
    id?: string
    name?: string
    email?: string
    createdAt?: string | Date
  }>()

  const [profile, setProfile] = useState<{
    total_xp: number
    lessons_completed: number
    current_streak: number
    longest_streak: number
    daily_goal_xp: number
    target_languages: string[]
  } | null>(null)
  const [courses, setCourses] = useState<BackendCourse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get<SummaryResponse | { data: SummaryResponse }>('/api/progress/user/me/summary'),
      http.get<BackendCourse[] | { data: BackendCourse[] }>('/api/courses'),
    ])
      .then(([summaryRes, coursesRes]) => {
        if (cancelled) return
        const sBody =
          summaryRes && typeof summaryRes === 'object' && 'data' in summaryRes
            ? (summaryRes as { data: SummaryResponse }).data
            : (summaryRes as SummaryResponse)
        const sp = sBody?.profile ?? ({} as SummaryProfile)
        const targetLangs = Array.isArray(sp.target_languages)
          ? (sp.target_languages as string[])
          : typeof sp.target_languages === 'string'
            ? (() => {
                try {
                  const parsed = JSON.parse(sp.target_languages)
                  return Array.isArray(parsed) ? (parsed as string[]) : []
                } catch (_error) {
                  // JSON.parse failed; fall back to empty array as a safe default.
                  return []
                }
              })()
            : []
        setProfile({
          total_xp: Number(sp.total_xp ?? 0),
          lessons_completed: Number(sp.lessons_completed ?? 0),
          current_streak: Number(sp.current_streak ?? 0),
          longest_streak: Number(sp.longest_streak ?? 0),
          daily_goal_xp: Number(sp.daily_goal_xp ?? 50),
          target_languages: targetLangs,
        })

        const cBody =
          coursesRes && typeof coursesRes === 'object' && 'data' in coursesRes
            ? (coursesRes as { data: BackendCourse[] }).data
            : (coursesRes as BackendCourse[])
        const list = Array.isArray(cBody)
          ? cBody
          : Array.isArray((cBody as { data?: unknown })?.data)
            ? (cBody as { data: BackendCourse[] }).data
            : []
        setCourses(list)
      })
      .catch(() => {
        // surface inline only via empty render
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const memberSince = user?.createdAt
    ? new Date(String(user.createdAt)).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : ''

  const totalXp = profile?.total_xp ?? 0
  const streak = profile?.current_streak ?? 0
  const enrolled = profile?.target_languages ?? []
  const visibleCourses =
    enrolled.length > 0
      ? courses.filter((c) => enrolled.includes(String(c.language_code ?? '')))
      : courses

  const achievements = profile
    ? ACHIEVEMENT_RULES.filter((rule) =>
        rule.when({
          lessons_completed: profile.lessons_completed,
          current_streak: profile.current_streak,
          total_xp: profile.total_xp,
        }),
      )
    : []

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, cm.stack(8))}>
      {/* Profile header card. */}
      <section
        className={cm.cn(
          cm.sp('p', 10),
          'rounded-[2rem] bg-gradient-to-br from-primary via-primary-dark to-primary-light text-white relative overflow-hidden shadow-xl shadow-primary/30',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'relative z-10')}>
          <img
            alt={t(
              'profile.avatarAlt',
              { name: user?.name ?? 'You' },
              { defaultValue: '{{name}}\u2019s avatar' },
            )}
            src={`https://picsum.photos/seed/parlance-profile-${user?.id ?? 'me'}/200/200`}
            className={cm.cn(
              cm.w(24),
              cm.h(24),
              cm.roundedFull,
              'object-cover ring-4 ring-white/40',
            )}
          />
          <div>
            <p
              className={cm.cn(
                'font-black uppercase tracking-widest text-[10px] text-primary-fixed/90',
              )}
            >
              {memberSince
                ? t(
                    'profile.eyebrow',
                    { joined: memberSince },
                    { defaultValue: 'Member since {{joined}}' },
                  )
                : t('profile.eyebrowNew', {}, { defaultValue: 'New learner' })}
            </p>
            <h1
              className={cm.cn(cm.textSize('4xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}
              data-testid="profile-name"
            >
              {user?.name || user?.email || t('profile.anonymous', {}, { defaultValue: 'Learner' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'opacity-90 max-w-md')}>
              {user?.email ?? ''}
            </p>
          </div>
        </div>
        <div className={cm.cn(cm.grid({ gap: 'lg' }), cm.sp('mt', 8), 'grid-cols-3 relative z-10')}>
          <div>
            <p
              className={cm.cn(
                'font-black uppercase tracking-widest text-[10px] text-primary-fixed/90',
              )}
            >
              {t('profile.totalXp', {}, { defaultValue: 'Total XP' })}
            </p>
            <p
              className={cm.cn('text-3xl font-extrabold tracking-tighter tabular-nums mt-1')}
              data-testid="profile-total-xp"
            >
              {totalXp.toLocaleString()}
            </p>
          </div>
          <div>
            <p
              className={cm.cn(
                'font-black uppercase tracking-widest text-[10px] text-primary-fixed/90',
              )}
            >
              {t('profile.languages', {}, { defaultValue: 'Languages' })}
            </p>
            <p
              className={cm.cn('text-3xl font-extrabold tracking-tighter tabular-nums mt-1')}
              data-testid="profile-langs"
            >
              {visibleCourses.length}
            </p>
          </div>
          <div>
            <p
              className={cm.cn(
                'font-black uppercase tracking-widest text-[10px] text-primary-fixed/90',
              )}
            >
              {t('profile.streak', {}, { defaultValue: 'Streak' })}
            </p>
            <p
              className={cm.cn('text-3xl font-extrabold tracking-tighter tabular-nums mt-1')}
              data-testid="profile-streak"
            >
              {streak}
            </p>
          </div>
        </div>
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
          )}
        />
        <div
          className={cm.cn(
            'absolute right-12 top-12 w-20 h-20 rounded-full bg-secondary/40 blur-2xl',
          )}
        />
      </section>

      {/* Stats & insights — learning vitals from progress data. */}
      <section className={cm.stack(4)}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            aria-hidden="true"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-9 h-9 rounded-full bg-primary-container text-on-primary-container shrink-0',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
              insights
            </span>
          </span>
          <h2
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
            data-testid="profile-stats-heading"
          >
            {t('profile.statsHeading', {}, { defaultValue: 'Stats & insights' })}
          </h2>
        </div>
        <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-2 lg:grid-cols-4')}>
          {[
            {
              key: 'lessons',
              icon: 'menu_book',
              label: t('profile.statLessons', {}, { defaultValue: 'Lessons completed' }),
              value: String(profile?.lessons_completed ?? 0),
              tint: 'text-primary',
            },
            {
              key: 'xp',
              icon: 'workspace_premium',
              label: t('profile.statXp', {}, { defaultValue: 'Total XP' }),
              value: totalXp.toLocaleString(),
              tint: 'text-secondary',
            },
            {
              key: 'bestStreak',
              icon: 'local_fire_department',
              label: t('profile.statBestStreak', {}, { defaultValue: 'Best streak' }),
              value: `${profile?.longest_streak ?? 0}`,
              tint: 'text-tertiary',
            },
            {
              key: 'dailyGoal',
              icon: 'flag',
              label: t('profile.statDailyGoal', {}, { defaultValue: 'Daily XP goal' }),
              value: `${profile?.daily_goal_xp ?? 50}`,
              tint: 'text-on-surface-variant',
            },
          ].map((tile) => (
            <div
              key={tile.key}
              data-testid={`profile-stat-${tile.key}`}
              className={cm.cn(
                cm.sp('p', 4),
                cm.stack(1),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/20',
              )}
            >
              <p
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('sm'),
                  'font-medium text-on-surface-variant',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn('material-symbols-outlined text-base', tile.tint)}
                >
                  {tile.icon}
                </span>
                {tile.label}
              </p>
              <p className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tabular-nums')}>
                {tile.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Languages — per-language progress. */}
      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('profile.languagesHeading', {}, { defaultValue: 'Languages in progress' })}
        </h2>
        {loading && courses.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : visibleCourses.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'profile.noLanguages',
              {},
              { defaultValue: 'No languages picked up yet — head to Lessons to choose one.' },
            )}
          </p>
        ) : (
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
            {visibleCourses.map((c) => (
              <div
                key={c.id}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 4),
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <span className={cm.cn('text-3xl')} aria-hidden="true">
                      {c.flag}
                    </span>
                    <div>
                      <p className={cm.cn(cm.fontWeight('bold'))}>{c.language_name}</p>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.textPrimary,
                          cm.fontWeight('semibold'),
                        )}
                      >
                        {t(
                          'profile.langLevel',
                          { level: c.level ?? '' },
                          { defaultValue: 'Level {{level}}' },
                        )}
                      </p>
                    </div>
                  </div>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t(
                      'profile.langLessonCount',
                      { count: c.lesson_count ?? 0 },
                      { defaultValue: '{{count}} lessons' },
                    )}
                  </p>
                </div>
                <div
                  className={cm.cn(
                    cm.w('full'),
                    'h-2 rounded-full bg-surface-container-high overflow-hidden',
                  )}
                >
                  <div
                    className={cm.cn(
                      'h-full rounded-full bg-gradient-to-r from-primary to-primary-light',
                    )}
                    style={{ width: `${Number(c.progress_percent ?? 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Achievements. */}
      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('nav.achievements', {}, { defaultValue: 'Achievements' })}
        </h2>
        {achievements.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'profile.noAchievements',
              {},
              { defaultValue: 'Complete a lesson to start earning achievements.' },
            )}
          </p>
        ) : (
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-2 md:grid-cols-4')}
            data-testid="profile-achievements"
          >
            {achievements.map((a) => (
              <div
                key={a.key}
                data-testid={`achievement-${a.key}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 text-center',
                )}
              >
                <div
                  className={cm.cn(
                    cm.w(14),
                    cm.h(14),
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.roundedFull,
                    'bg-gradient-to-br from-secondary to-secondary-dark text-white shadow-md shadow-secondary/30',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined')}
                    aria-hidden="true"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {a.icon}
                  </span>
                </div>
                <p className={cm.cn(cm.fontWeight('bold'))}>
                  {t(`profile.achievement.${a.key}`, {}, { defaultValue: a.label })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Profile
