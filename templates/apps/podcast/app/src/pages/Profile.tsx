import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface ProfileData {
  id: string
  name: string | null
  email: string | null
  planKey: string | null
  subscriptions: number
  queueItems: number
  savedEpisodes: number
  listenedMinutes: number
  episodesCompleted: number
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/profile/me')
      .then((res) => {
        if (cancelled) return
        const data = unwrapSingle<ProfileData>(res)
        setProfile(data)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('nav.failedToLoadProfile', {}, { defaultValue: 'Failed to load profile.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('nav.loadingProfile', {}, { defaultValue: 'Loading profile…' })}
      </p>
    )
  }
  if (error || !profile) {
    return (
      <p
        className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}
        data-testid="profile-error"
      >
        {error ?? t('profile.unknownError', {}, { defaultValue: 'Profile unavailable.' })}
      </p>
    )
  }

  const displayName =
    profile.name?.trim() ||
    profile.email?.split('@')[0] ||
    t('profile.fallbackName', {}, { defaultValue: 'Listener' })
  const initial = displayName.charAt(0).toUpperCase()
  const planLabel = profile.planKey
    ? t(`plans.${profile.planKey}`, {}, { defaultValue: profile.planKey })
    : t('plans.free', {}, { defaultValue: 'Free' })
  const hours = Math.floor(profile.listenedMinutes / 60)
  const minutes = profile.listenedMinutes % 60

  return (
    <div
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}
      data-testid="profile-page"
    >
      <header>
        <p className={'text-[11px] font-bold uppercase tracking-widest text-primary mb-2'}>
          {t('profile.eyebrow', {}, { defaultValue: 'YOUR PROFILE' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('profile.heading', {}, { defaultValue: 'Listening profile' })}
        </h1>
      </header>

      <section
        className={cm.cn(
          cm.sp('p', 8),
          'relative overflow-hidden rounded-[2rem] shadow-2xl shadow-on-surface/10',
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--color-primary), var(--color-primary-container))',
          color: 'var(--color-on-primary)',
        }}
      >
        <div
          className={'absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-surface/10 blur-3xl'}
          aria-hidden="true"
        />
        <div
          className={'absolute right-12 top-12 w-20 h-20 rounded-full bg-surface/15 blur-2xl'}
          aria-hidden="true"
        />

        <div className="relative z-10">
          <div className={cm.flex({ align: 'center', gap: 'lg' })}>
            <div
              className={cm.cn(
                cm.w(20),
                cm.h(20),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-surface/20 backdrop-blur-md text-3xl font-extrabold',
              )}
              aria-hidden="true"
            >
              {initial}
            </div>
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight" data-testid="profile-name">
                {displayName}
              </h2>
              <p className={'text-sm opacity-80 mt-1'}>
                {profile.email ?? ''}
                {' · '}
                {t('profile.planPrefix', { plan: planLabel }, { defaultValue: '{{plan}} plan' })}
              </p>
            </div>
          </div>

          <div className={cm.cn(cm.grid({ cols: 4, gap: 'md' }), cm.sp('mt', 8))}>
            {[
              {
                label: t('profile.minutesLabel', {}, { defaultValue: 'Listening time' }),
                value: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
              },
              {
                label: t('profile.showsLabel', {}, { defaultValue: 'Subscribed' }),
                value: profile.subscriptions,
                testid: 'stat-subscriptions',
              },
              {
                label: t('common.saved', {}, { defaultValue: 'Saved' }),
                value: profile.savedEpisodes,
                testid: 'stat-saved',
              },
              {
                label: t('common.completed', {}, { defaultValue: 'Completed' }),
                value: profile.episodesCompleted,
                testid: 'stat-completed',
              },
            ].map((stat) => (
              <div key={stat.label} className={'bg-surface/10 backdrop-blur-md rounded-xl p-3'}>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                  {stat.label}
                </p>
                <p
                  className={'text-2xl font-extrabold tabular-nums mt-1'}
                  data-testid={stat.testid}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl')}>
        <h3
          className={'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-2'}
        >
          {t('status.upNext', {}, { defaultValue: 'Up next' })}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'profile.queueSummary',
            { count: profile.queueItems },
            { defaultValue: '{{count}} episodes waiting in your queue.' },
          )}
        </p>
      </section>
    </div>
  )
}
