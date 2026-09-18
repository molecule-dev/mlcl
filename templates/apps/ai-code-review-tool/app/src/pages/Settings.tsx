import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { error as logError } from '@molecule/app-logger'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import {
  AccountSection,
  AuthSection,
  DevicesSection,
  LogOutDeleteSection,
  NotificationsSection,
  SettingsContainer,
  ThisDeviceSection,
} from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiCredentialRow {
  id: string
  provider: 'github' | 'gitlab'
  scopes_json: string[] | null
  expires_at: string | null
}

const INTEGRATION_DESCRIPTIONS: Record<
  'github' | 'gitlab',
  { label: string; description: string; icon: string }
> = {
  github: {
    label: 'GitHub',
    description: 'Connect a GitHub workspace to review PRs on push.',
    icon: 'hub',
  },
  gitlab: {
    label: 'GitLab',
    description: 'Connect a GitLab token to review merge requests.',
    icon: 'merge_type',
  },
}

const STATUS_TINT = {
  connected: { bg: 'bg-emerald-500/15', fg: 'text-emerald-600', label: 'Connected' },
  available: { bg: 'bg-slate-400/15', fg: 'text-slate-500', label: 'Connect' },
} as const

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user } = useAuth<UserProfile>()
  const [credentials, setCredentials] = useState<ApiCredentialRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingProvider, setSavingProvider] = useState<'github' | 'gitlab' | null>(null)

  const loadCredentials = () => {
    setLoading(true)
    setError(null)
    http
      .get('/api/api-credentials')
      .catch(() => null)
      .then((res) => setCredentials(unwrapList<ApiCredentialRow>(res)))
      .catch(() =>
        setError(t('settings.loadError', {}, { defaultValue: 'Failed to load settings.' })),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/api-credentials')
      .catch(() => null)
      .then((res) => {
        if (!cancelled) setCredentials(unwrapList<ApiCredentialRow>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('settings.loadError', {}, { defaultValue: 'Failed to load settings.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const integrationStatus = useMemo(() => {
    return (Object.keys(INTEGRATION_DESCRIPTIONS) as Array<'github' | 'gitlab'>).map((provider) => {
      const existing = credentials.find((c) => c.provider === provider)
      return { provider, existing }
    })
  }, [credentials])

  const handleConnect = async (provider: 'github' | 'gitlab') => {
    setSavingProvider(provider)
    try {
      await http.post('/api/api-credentials', {
        provider,
        encrypted_token: `pending-${provider}-${Date.now()}`,
        scopes_json: ['repo'],
      })
      loadCredentials()
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      setError(t('settings.connectError', {}, { defaultValue: 'Failed to connect provider.' }))
    } finally {
      setSavingProvider(null)
    }
  }

  const handleDisconnect = async (provider: 'github' | 'gitlab', id: string) => {
    setSavingProvider(provider)
    try {
      await http.delete(`/api/api-credentials/${id}`)
      loadCredentials()
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      setError(
        t('settings.disconnectError', {}, { defaultValue: 'Failed to disconnect provider.' }),
      )
    } finally {
      setSavingProvider(null)
    }
  }

  const ownerName = user?.name || user?.email || t('nav.you', {}, { defaultValue: 'You' })
  const ownerEmail = user?.email || ''

  return (
    <div className={cm.cn(cm.flex1, cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary font-mono',
          )}
        >
          {t(
            'settings.eyebrow',
            { appName: APP_NAME },
            { defaultValue: '{{appName}} · workspace' },
          )}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 1),
            'tracking-tight',
          )}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'settings.subheading',
            {},
            { defaultValue: 'Integrations, API keys, team members, and notifications.' },
          )}
        </p>
      </header>

      {error ? <p className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-error')}>{error}</p> : null}

      <section
        className={cm.cn(
          'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
        )}
      >
        <SettingsContainer onClose={() => navigate('/dashboard')}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <span
              className="material-symbols-outlined text-on-surface-variant text-[20px]"
              aria-hidden="true"
            >
              manage_accounts
            </span>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight')}>
              {t('settings.section.account', {}, { defaultValue: 'Account & security' })}
            </h2>
          </div>
          <AccountSection />
          <AuthSection />
          <NotificationsSection />
          <DevicesSection />
          <ThisDeviceSection />
          <LogOutDeleteSection />
        </SettingsContainer>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 5),
          'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
          <span
            className="material-symbols-outlined text-on-surface-variant text-[20px]"
            aria-hidden="true"
          >
            hub
          </span>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
          </h2>
        </div>
        {loading ? (
          <p className={cm.cn(cm.sp('py', 4), cm.textMuted)}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant/30">
            {integrationStatus.map(({ provider, existing }) => {
              const meta = INTEGRATION_DESCRIPTIONS[provider]
              const status = existing ? 'connected' : 'available'
              const tint = STATUS_TINT[status]
              const busy = savingProvider === provider
              return (
                <li
                  key={provider}
                  className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('py', 3))}
                >
                  <span
                    className="material-symbols-outlined text-on-surface-variant text-[18px]"
                    aria-hidden="true"
                  >
                    {meta.icon}
                  </span>
                  <div className={cm.cn('flex-1 min-w-0')}>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-on-surface',
                      )}
                    >
                      {t(
                        `settings.integration.${provider}.label`,
                        {},
                        { defaultValue: meta.label },
                      )}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        `settings.integration.${provider}.description`,
                        {},
                        { defaultValue: meta.description },
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      existing ? handleDisconnect(provider, existing.id) : handleConnect(provider)
                    }
                    className={cm.cn(
                      'px-3 py-1.5 rounded-md text-[10px] font-extrabold uppercase tracking-widest font-mono disabled:opacity-50',
                      tint.bg,
                      tint.fg,
                    )}
                  >
                    {busy
                      ? t('settings.saving', {}, { defaultValue: 'Saving…' })
                      : existing
                        ? t('common.disconnect', {}, { defaultValue: 'Disconnect' })
                        : t(`settings.status.${status}`, {}, { defaultValue: tint.label })}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 5),
          'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
          <span
            className="material-symbols-outlined text-on-surface-variant text-[20px]"
            aria-hidden="true"
          >
            key
          </span>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('settings.section.apiKeys', {}, { defaultValue: 'API keys' })}
          </h2>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.apiKeys.integrationsNote',
            {},
            {
              defaultValue: 'Provider access tokens are managed in the Integrations section above.',
            },
          )}
        </p>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 5),
          'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
          <span
            className="material-symbols-outlined text-on-surface-variant text-[20px]"
            aria-hidden="true"
          >
            group
          </span>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('nav.team', {}, { defaultValue: 'Team' })}
          </h2>
        </div>
        <ul className="divide-y divide-outline-variant/30">
          <li className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('py', 3))}>
            <span
              className={cm.cn(
                'w-9 h-9 rounded-full bg-surface-variant inline-flex items-center justify-center text-[12px] font-bold uppercase text-on-surface',
              )}
              aria-hidden="true"
            >
              {String(ownerName).slice(0, 2)}
            </span>
            <div className={cm.cn('flex-1 min-w-0')}>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
                {t(
                  'settings.team.owner',
                  { name: ownerName },
                  { defaultValue: '{{name}} — Owner' },
                )}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{ownerEmail}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className={cm.cn(
                'px-3 py-1.5 rounded-md text-[10px] font-extrabold uppercase tracking-widest font-mono bg-surface-container-low text-on-surface-variant',
              )}
            >
              {t('nav.profile', {}, { defaultValue: 'Profile' })}
            </button>
          </li>
        </ul>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 5),
          'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
          <span
            className="material-symbols-outlined text-on-surface-variant text-[20px]"
            aria-hidden="true"
          >
            language
          </span>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('footer.language', {}, { defaultValue: 'Language' })}
          </h2>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 3))}>
          {t(
            'common.chooseTheLanguage',
            {},
            { defaultValue: 'Choose the language used throughout the app.' },
          )}
        </p>
        <LanguagePicker />
      </section>

      <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
        <div className={cm.sp('mb', 6)}>
          <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
          </h3>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'common.toggleLightDark',
              {},
              { defaultValue: 'Toggle between light and dark mode.' },
            )}
          </p>
        </div>
        <ThemeToggle />
      </section>
      <section
        className={cm.cn(
          cm.sp('p', 5),
          'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
          <span
            className="material-symbols-outlined text-on-surface-variant text-[20px]"
            aria-hidden="true"
          >
            notifications
          </span>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight')}>
            {/* Not "Notifications": NotificationsSection above already owns that
                heading and holds the actual delivery preferences. This card only
                links to the inbox, so two headings announced identically left it
                ambiguous which one a screen-reader user was landing on. */}
            {t('settings.notificationCenter', {}, { defaultValue: 'Notification center' })}
          </h2>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 3))}>
          {t(
            'settings.notifications.description',
            {},
            {
              defaultValue: 'Visit the notifications page to view and manage delivery preferences.',
            },
          )}
        </p>
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-full bg-primary-dark text-white hover:opacity-90 transition-opacity shadow-sm',
          )}
        >
          {t('settings.notifications.openCta', {}, { defaultValue: 'Open notifications' })}
        </button>
      </section>
    </div>
  )
}
