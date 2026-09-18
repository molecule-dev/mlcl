/**
 * Integrations — toggle which integrations are enabled. Selections
 * persist to /api/profile/me preferences so they survive reloads. The
 * actual OAuth flow per-provider is wired by the host's Pro plan;
 * a callout makes that explicit.
 */

import { useCallback, useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface Integration {
  key: string
  name: string
  category: 'calendar' | 'video' | 'payments'
  blurb: string
  icon: string
  tint: string
}

interface ProfileResponse {
  user: {
    preferences?: { integrations?: Record<string, boolean> } & Record<string, unknown>
  }
}

const INTEGRATIONS: Integration[] = [
  {
    key: 'google-calendar',
    name: 'Google Calendar',
    category: 'calendar',
    blurb: 'Two-way sync — writes new bookings and reads existing events.',
    icon: 'event_available',
    tint: '#4285f4',
  },
  {
    key: 'outlook',
    name: 'Outlook',
    category: 'calendar',
    blurb: 'Read & write Office 365 calendars, including delegated mailboxes.',
    icon: 'mail',
    tint: '#0078d4',
  },
  {
    key: 'apple-calendar',
    name: 'Apple Calendar',
    category: 'calendar',
    blurb: 'CalDAV bridge for iCloud — pulls busy times across all your devices.',
    icon: 'event',
    // Mid-gray (Apple graphite) — near-black #1d1d1f was invisible in dark mode.
    tint: '#6e6e73',
  },
  {
    key: 'google-meet',
    name: 'Google Meet',
    category: 'video',
    blurb: 'Auto-generates a Meet link for every confirmed booking.',
    icon: 'videocam',
    tint: '#34a853',
  },
  {
    key: 'zoom',
    name: 'Zoom',
    category: 'video',
    blurb: 'Adds a Zoom link to every meeting and respects host availability.',
    icon: 'video_camera_front',
    tint: '#2D8CFF',
  },
  {
    key: 'stripe',
    name: 'Stripe',
    category: 'payments',
    blurb: 'Charge invitees up-front for paid sessions — refunds on cancellation.',
    icon: 'payments',
    tint: '#635bff',
  },
]

const CATEGORIES = [
  { key: 'calendar', label: 'Calendars' },
  { key: 'video', label: 'Video' },
  { key: 'payments', label: 'Payments' },
] as const

export function Integrations() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [connected, setConnected] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/profile/me')
      .then((res) => unwrapSingle<ProfileResponse>(res))
      .then((profile) => {
        if (cancelled) return
        const ints = profile?.user?.preferences?.integrations ?? {}
        setConnected(ints)
      })
      .catch(() => {
        if (cancelled) return
        setError(t('integrations.loadError', {}, { defaultValue: 'Could not load integrations.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const toggle = useCallback(
    async (key: string) => {
      const next = { ...connected, [key]: !connected[key] }
      setConnected(next)
      setSaving(true)
      setError(null)
      try {
        const profileRes = await http.get('/api/profile/me')
        const profile = unwrapSingle<ProfileResponse>(profileRes)
        const prevPrefs = profile?.user?.preferences ?? {}
        await http.patch('/api/profile/me', {
          preferences: { ...prevPrefs, integrations: next },
        })
      } catch (error) {
        logError('integrations.save', error)
        setConnected(connected)
        setError(
          t('integrations.saveError', {}, { defaultValue: 'Could not save integration state.' }),
        )
      } finally {
        setSaving(false)
      }
    },
    [http, connected, t],
  )

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('p', 8), 'max-w-[1200px] mx-auto')}>
      <header className={cm.stack(2)}>
        <p className={cm.cn(cm.textSize('xs'), 'font-bold uppercase tracking-widest text-primary')}>
          {t('nav.connections', {}, { defaultValue: 'Connections' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('medium'),
            'text-on-surface-variant/80 max-w-2xl',
          )}
        >
          {t(
            'integrations.subtitle',
            {},
            {
              defaultValue:
                'Toggle the integrations you use. Calendar/video sync runs after OAuth is wired through your provider settings.',
            },
          )}
        </p>
        {saving ? (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            data-testid="integrations-error"
            className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
          >
            {error}
          </p>
        ) : null}
      </header>

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : null}

      {CATEGORIES.map((cat) => (
        <section key={cat.key} className={cm.stack(4)}>
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              'font-bold uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t(`integrations.category.${cat.key}`, {}, { defaultValue: cat.label })}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}
          >
            {INTEGRATIONS.filter((i) => i.category === cat.key).map((i) => {
              const isConnected = !!connected[i.key]
              return (
                <div
                  key={i.key}
                  data-testid={`integration-${i.key}`}
                  className={cm.cn(
                    cm.sp('p', 6),
                    cm.flex({ direction: 'col' }),
                    'gap-5 bg-surface-container-lowest rounded-2xl shadow-sm hover:-translate-y-0.5 transition-transform',
                  )}
                >
                  <div className={cm.flex({ justify: 'between', align: 'start' })}>
                    <div
                      className={cm.cn(
                        cm.sp('p', 3),
                        cm.roundedFull,
                        cm.flex({ align: 'center', justify: 'center' }),
                        'shadow-sm',
                      )}
                      style={{ backgroundColor: `${i.tint}1f`, color: i.tint }}
                    >
                      <span
                        className={'material-symbols-outlined text-xl'}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                        aria-hidden="true"
                      >
                        {i.icon}
                      </span>
                    </div>
                    <span
                      data-testid={`integration-${i.key}-status`}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.roundedFull,
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest',
                        isConnected
                          ? 'bg-success-container text-on-success-container'
                          : 'bg-surface-container text-on-surface-variant',
                      )}
                    >
                      {isConnected
                        ? t('integrations.connected', {}, { defaultValue: 'Connected' })
                        : t('integrations.notConnected', {}, { defaultValue: 'Not connected' })}
                    </span>
                  </div>
                  <div className={cm.stack(2)}>
                    <h3 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
                      {i.name}
                    </h3>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-on-surface-variant leading-relaxed',
                      )}
                    >
                      {t(`integrations.${i.key}.blurb`, {}, { defaultValue: i.blurb })}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid={`integration-${i.key}-toggle`}
                    onClick={() => toggle(i.key)}
                    className={cm.cn(
                      cm.sp('py', 3),
                      cm.roundedFull,
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'transition-colors',
                      isConnected
                        ? 'border border-error/40 text-error hover:bg-error-container/30'
                        : 'text-white hover:shadow-md hover:shadow-primary/30',
                    )}
                    style={
                      !isConnected
                        ? {
                            background:
                              'linear-gradient(135deg, var(--color-primary), var(--color-primary-gradient-to))',
                          }
                        : undefined
                    }
                  >
                    {isConnected
                      ? t('integrations.disconnect', {}, { defaultValue: 'Disconnect' })
                      : t('common.connect', {}, { defaultValue: 'Connect' })}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

export default Integrations
