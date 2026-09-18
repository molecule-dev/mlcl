import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageBody, PageHeader } from '../components/PageHeader.js'
import { StatCard } from '../components/StatCard.js'
import { StreakBadge } from '../components/StreakBadge.js'

interface Achievement {
  id: string
  label: string
  description: string
  icon: string
  unlocked: boolean
}

interface ProfilePayload {
  profile: {
    id: string
    name: string
    email: string
    initials: string
    created_at: string
    streak_days: number
  }
  kpis: {
    active_subjects: number
    total_hours: number
    quizzes_taken: number
    decks: number
    badges_total: number
    badges_unlocked: number
  }
  achievements: Achievement[]
}

const formatYear = (iso: string): string => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return String(d.getFullYear())
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [data, setData] = useState<ProfilePayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<ProfilePayload>('/api/profile')
      .then((res) => {
        if (cancelled) return
        setData(res.data ?? null)
        setError(null)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('nav.couldNotLoadProfile', {}, { defaultValue: 'Could not load profile.' }),
        )
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const profile = data?.profile
  const kpis = data?.kpis
  const achievements = data?.achievements ?? []

  return (
    <div
      data-mol-id="page-profile"
      className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}
    >
      <PageHeader
        eyebrow={t('settings.account', {}, { defaultValue: 'Account' })}
        title={t('profile.title', {}, { defaultValue: 'Your profile' })}
        subtitle={t(
          'profile.subtitle',
          {},
          { defaultValue: 'A snapshot of your learning identity.' },
        )}
      />

      <PageBody>
        {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}

        {data === null && !error ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('nav.loadingProfile', {}, { defaultValue: 'Loading profile…' })}
          </p>
        ) : profile && kpis ? (
          <>
            <section className={'grid gap-6 lg:grid-cols-[280px_1fr]'}>
              <div
                className={cm.cn(
                  cm.sp('p', 8),
                  'flex flex-col items-center text-center rounded-3xl bg-gradient-to-br from-primary to-primary-container text-white',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-28 w-28 rounded-full bg-surface/20 backdrop-blur-md text-4xl font-extrabold tracking-tight ring-4 ring-white/30',
                  )}
                >
                  {profile.initials}
                </div>
                <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'mt-4')}>
                  {profile.name || profile.email}
                </p>
                <p className={cm.cn(cm.textSize('sm'), 'serif-text italic text-primary-fixed/90')}>
                  {profile.email}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'serif-text italic text-primary-fixed/80 mt-1',
                  )}
                >
                  {t(
                    'profile.member',
                    { year: formatYear(profile.created_at) },
                    { defaultValue: 'Member since {{year}}' },
                  )}
                </p>
                <StreakBadge
                  days={profile.streak_days}
                  active={profile.streak_days > 0}
                  className={'mt-5'}
                />
              </div>
              <div
                className={cm.cn(
                  cm.sp('p', 8),
                  'rounded-3xl bg-surface-container-lowest border border-outline-variant/15 flex flex-col gap-6',
                )}
              >
                <div className={'grid grid-cols-2 gap-4'}>
                  <StatCard
                    tone="primary"
                    icon="auto_stories"
                    label={t('profile.kpi.subjects', {}, { defaultValue: 'Active subjects' })}
                    value={kpis.active_subjects}
                  />
                  <StatCard
                    tone="success"
                    icon="schedule"
                    label={t('profile.kpi.hours', {}, { defaultValue: 'Total hours' })}
                    value={kpis.total_hours}
                  />
                  <StatCard
                    tone="info"
                    icon="quiz"
                    label={t('profile.kpi.quizzes', {}, { defaultValue: 'Quizzes taken' })}
                    value={kpis.quizzes_taken}
                  />
                  <StatCard
                    tone="warning"
                    icon="emoji_events"
                    label={t('profile.kpi.badges', {}, { defaultValue: 'Badges earned' })}
                    value={`${kpis.badges_unlocked} / ${kpis.badges_total}`}
                  />
                </div>
              </div>
            </section>

            <section>
              <h3
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface mb-4')}
              >
                {t('nav.achievements', {}, { defaultValue: 'Achievements' })}
              </h3>
              {achievements.length === 0 ? (
                <p
                  className={cm.cn(cm.textSize('sm'), 'serif-text italic text-on-surface-variant')}
                >
                  {t(
                    'profile.achievements.empty',
                    {},
                    { defaultValue: 'Complete sessions to start unlocking badges.' },
                  )}
                </p>
              ) : (
                <div className={'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'}>
                  {achievements.map((a) => (
                    <div
                      key={a.id}
                      className={cm.cn(
                        cm.sp('p', 5),
                        cm.flex({ align: 'start', gap: 'md' }),
                        'rounded-2xl border border-outline-variant/15 bg-surface-container-lowest',
                        !a.unlocked && 'opacity-50',
                      )}
                    >
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          'h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary-container text-white shadow',
                        )}
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">
                          {a.icon}
                        </span>
                      </div>
                      <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                        <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                          {a.label}
                          {!a.unlocked ? (
                            <span
                              className={cm.cn(
                                cm.textSize('xs'),
                                cm.fontWeight('semibold'),
                                cm.sp('ml', 2),
                                'uppercase tracking-wider text-on-surface-variant',
                              )}
                            >
                              {t('profile.locked', {}, { defaultValue: 'Locked' })}
                            </span>
                          ) : null}
                        </p>
                        <p
                          className={cm.cn(cm.textSize('sm'), 'serif-text text-on-surface-variant')}
                        >
                          {a.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </PageBody>
    </div>
  )
}
