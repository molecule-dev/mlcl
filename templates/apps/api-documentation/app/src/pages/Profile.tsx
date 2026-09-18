import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface ProfileData {
  display_name?: string | null
  handle?: string | null
  bio?: string | null
  github?: string | null
  twitter?: string | null
  time_zone?: string | null
  joined?: string | null
  api_calls_30d?: number | null
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
    setLoading(true)
    http
      .get('/api/profile')
      .then((res) => {
        if (!cancelled) setProfile(unwrapSingle<ProfileData>(res))
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
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  if (error) {
    return <div className={cm.cn(cm.sp('p', 8), 'text-error')}>{error}</div>
  }

  const p: ProfileData = profile ?? {}
  const displayName =
    p.display_name ?? t('profile.namePlaceholder', {}, { defaultValue: 'Developer' })
  const initial = (displayName.charAt(0) || 'D').toUpperCase()

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn(
            'text-[11px] font-bold uppercase tracking-widest text-emerald-400 font-mono mb-2',
          )}
        >
          {t('profile.eyebrow', {}, { defaultValue: 'PROFILE' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('profile.heading', {}, { defaultValue: 'Developer profile' })}
        </h1>
      </header>

      <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-lowest rounded-2xl')}>
        <div className={cm.flex({ align: 'center', gap: 'lg' })}>
          <div
            className={cm.cn(
              cm.w(20),
              cm.h(20),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-emerald-500 text-white text-3xl font-extrabold',
            )}
            aria-hidden="true"
          >
            {initial}
          </div>
          <div>
            <h2 className={cm.cn(cm.textSize('2xl'), 'font-extrabold')}>{displayName}</h2>
            {p.handle ? (
              <p className={cm.cn('text-sm text-emerald-400 font-mono mt-1')}>@{p.handle}</p>
            ) : null}
          </div>
        </div>
        {p.bio ? (
          <p
            className={cm.cn(
              cm.textSize('base'),
              cm.sp('mt', 6),
              'text-on-surface-variant leading-relaxed max-w-2xl',
            )}
          >
            {p.bio}
          </p>
        ) : (
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 6), 'text-on-surface-variant')}>
            {t(
              'profile.bioEmpty',
              {},
              { defaultValue: 'Add a short bio to introduce yourself to teammates.' },
            )}
          </p>
        )}
      </section>

      <section className={cm.cn(cm.grid({ cols: 2, gap: 'lg' }))}>
        <div className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl')}>
          <h3
            className={cm.cn(
              'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant font-mono mb-4',
            )}
          >
            {t('profile.linksHeading', {}, { defaultValue: 'EXTERNAL_LINKS' })}
          </h3>
          <div className={cm.cn('space-y-3')}>
            {p.github ? (
              <Field
                label={t('oauth.github', {}, { defaultValue: 'GitHub' })}
                value={`github.com/${p.github}`}
              />
            ) : null}
            {p.twitter ? (
              <Field
                label={t('oauth.twitter', {}, { defaultValue: 'Twitter' })}
                value={`@${p.twitter}`}
              />
            ) : null}
            {p.time_zone ? (
              <Field
                label={t('profile.timeZone', {}, { defaultValue: 'Time zone' })}
                value={p.time_zone}
              />
            ) : null}
            {p.joined ? (
              <Field label={t('profile.joined', {}, { defaultValue: 'Joined' })} value={p.joined} />
            ) : null}
            {!p.github && !p.twitter && !p.time_zone && !p.joined ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('profile.linksEmpty', {}, { defaultValue: 'No external links set.' })}
              </p>
            ) : null}
          </div>
        </div>

        <div className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl')}>
          <h3
            className={cm.cn(
              'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant font-mono mb-4',
            )}
          >
            {t('profile.usageHeading', {}, { defaultValue: 'API_USAGE_30D' })}
          </h3>
          <p className={cm.cn(cm.textSize('4xl'), 'font-extrabold tabular-nums text-emerald-400')}>
            {(p.api_calls_30d ?? 0).toLocaleString()}
          </p>
          <p className={cm.cn('text-xs text-on-surface-variant mt-2 font-mono')}>
            {t('profile.usageMeta', {}, { defaultValue: 'requests · last 30 days' })}
          </p>
        </div>
      </section>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div>
      <p
        className={cm.cn(
          'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-mono',
        )}
      >
        {label}
      </p>
      <p className={cm.cn('text-sm font-mono mt-0.5')}>{value}</p>
    </div>
  )
}
