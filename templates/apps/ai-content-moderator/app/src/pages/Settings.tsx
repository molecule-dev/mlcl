import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { error as logError } from '@molecule/app-logger'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import {
  AuthSection,
  DevicesSection,
  LogOutDeleteSection,
  NotificationsSection,
  SettingsContainer,
  ThisDeviceSection,
} from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { SiftLayout } from '../components/SiftLayout.js'

const TABS = [
  { id: 'team', labelKey: 'settings.tab.team', defaultLabel: 'Team' },
  { id: 'integrations', labelKey: 'settings.tab.integrations', defaultLabel: 'Integrations' },
  { id: 'api', labelKey: 'settings.tab.api', defaultLabel: 'API & webhooks' },
  { id: 'billing', labelKey: 'settings.tab.billing', defaultLabel: 'Billing' },
] as const

type TabId = (typeof TABS)[number]['id']

interface ApiToken {
  id: string
  label: string
  createdAt: string
  last_used_at?: string | null
  /** Returned only on POST /api-tokens (one-time view). */
  token?: string
}

const INTEGRATION_DEFS = [
  { id: 'slack', name: 'Slack', icon: 'forum' },
  { id: 'pagerduty', name: 'PagerDuty', icon: 'crisis_alert' },
  { id: 'zendesk', name: 'Zendesk', icon: 'support_agent' },
  { id: 'jira', name: 'Jira', icon: 'task' },
] as const

type IntegrationId = (typeof INTEGRATION_DEFS)[number]['id']

const INTEGRATION_KEY = 'ai-content-moderator:integrations'
const WEBHOOK_KEY = 'ai-content-moderator:webhook-url'

function loadIntegrations(): Record<IntegrationId, boolean> {
  try {
    const raw = window.localStorage.getItem(INTEGRATION_KEY)
    if (!raw) throw new Error('empty')
    return { ...defaultIntegrations(), ...(JSON.parse(raw) as Record<IntegrationId, boolean>) }
  } catch (_error) {
    // localStorage unavailable or value not valid JSON — fall back to defaults
    return defaultIntegrations()
  }
}

function defaultIntegrations(): Record<IntegrationId, boolean> {
  return { slack: false, pagerduty: false, zendesk: false, jira: false }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserProfile>()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as TabId | null
  const tab: TabId = (TABS.some((tab2) => tab2.id === tabParam) ? tabParam : 'team') as TabId
  const setTab = (next: TabId) => {
    const params = new URLSearchParams(searchParams)
    params.set('tab', next)
    setSearchParams(params, { replace: false })
  }

  // API tokens
  const [tokens, setTokens] = useState<ApiToken[] | null>(null)
  const [tokenLabel, setTokenLabel] = useState('Production API key')
  const [pendingToken, setPendingToken] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [tokenBusy, setTokenBusy] = useState(false)

  // Integrations
  const [integrations, setIntegrations] = useState(() => loadIntegrations())
  const [webhookUrl, setWebhookUrl] = useState(() => {
    try {
      return window.localStorage.getItem(WEBHOOK_KEY) ?? ''
    } catch (_error) {
      // localStorage may be unavailable (private mode) — default to empty
      return ''
    }
  })
  const [feedback, setFeedback] = useState<string | null>(null)

  function loadTokens() {
    http
      .get<ApiToken[]>('/api/api-tokens')
      .then((res) => setTokens(res.data ?? []))
      .catch(() => {
        setTokenError(
          t('settings.api.loadError', {}, { defaultValue: 'Could not load API tokens.' }),
        )
        setTokens([])
      })
  }

  useEffect(() => {
    let cancelled = false
    http
      .get<ApiToken[]>('/api/api-tokens')
      .then((res) => {
        if (cancelled) return
        setTokens(res.data ?? [])
      })
      .catch(() => {
        if (cancelled) return
        setTokenError(
          t('settings.api.loadError', {}, { defaultValue: 'Could not load API tokens.' }),
        )
        setTokens([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  function persistIntegrations(next: Record<IntegrationId, boolean>) {
    setIntegrations(next)
    try {
      window.localStorage.setItem(INTEGRATION_KEY, JSON.stringify(next))
    } catch (_error) {
      // localStorage may be unavailable (private mode) — integrations survive in React state
    }
  }

  async function createToken() {
    setTokenBusy(true)
    setTokenError(null)
    setPendingToken(null)
    try {
      const res = await http.post<ApiToken>('/api/api-tokens', { label: tokenLabel })
      if (res.data?.token) setPendingToken(res.data.token)
      loadTokens()
    } catch (error) {
      logError('settings.createToken', error)
      setTokenError(
        t('settings.api.createError', {}, { defaultValue: 'Could not create API token.' }),
      )
    } finally {
      setTokenBusy(false)
    }
  }

  async function revokeToken(id: string) {
    setTokenBusy(true)
    setTokenError(null)
    try {
      await http.delete(`/api/api-tokens/${id}`)
      loadTokens()
    } catch (error) {
      logError('settings.revokeToken', error)
      setTokenError(
        t('settings.api.revokeError', {}, { defaultValue: 'Could not revoke API token.' }),
      )
    } finally {
      setTokenBusy(false)
    }
  }

  async function copyToken() {
    if (!pendingToken) return
    try {
      await navigator.clipboard.writeText(pendingToken)
      setFeedback(t('settings.api.copied', {}, { defaultValue: 'Token copied to clipboard.' }))
    } catch (_error) {
      // Clipboard API unavailable — user is shown a fallback message to copy manually
      setFeedback(
        t(
          'settings.api.copyManually',
          {},
          { defaultValue: 'Clipboard unavailable — copy the token manually.' },
        ),
      )
    }
  }

  function saveWebhook() {
    try {
      window.localStorage.setItem(WEBHOOK_KEY, webhookUrl)
      setFeedback(t('settings.api.webhookSaved', {}, { defaultValue: 'Webhook URL saved.' }))
    } catch (_error) {
      // localStorage may be unavailable — user is shown an error message
      setFeedback(
        t('settings.api.webhookSaveError', {}, { defaultValue: 'Could not save webhook locally.' }),
      )
    }
  }

  return (
    <SiftLayout>
      <header>
        <h1
          className={cm.cn('text-4xl font-bold tracking-tight font-headline text-on-surface mb-2')}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn('text-on-surface-variant')}>
          {t(
            'settings.subheading',
            {},
            { defaultValue: 'Manage your account, integrations, API access and billing.' },
          )}
        </p>
      </header>

      {feedback && (
        <div
          role="status"
          className={cm.cn(
            cm.accentCard({ tone: 'success' }),
            'rounded-lg bg-emerald-50 pr-4 py-3 text-sm text-emerald-700',
          )}
        >
          {feedback}
        </div>
      )}

      <section className={cm.cn('rounded-xl bg-surface-container-lowest shadow-sm p-6')}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
          {t('footer.language', {}, { defaultValue: 'Language' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
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
      <div
        className={cm.cn('flex gap-1 border-b border-surface-container')}
        role="tablist"
        aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
      >
        {TABS.map((t2) => (
          <button
            key={t2.id}
            type="button"
            role="tab"
            data-mol-id={`settings-tab-${t2.id}`}
            aria-selected={tab === t2.id}
            onClick={() => setTab(t2.id)}
            className={cm.cn(
              'px-5 py-3 text-sm font-bold uppercase tracking-wide transition-colors',
              tab === t2.id
                ? 'text-primary border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t(t2.labelKey, {}, { defaultValue: t2.defaultLabel })}
          </button>
        ))}
      </div>

      {tab === 'team' && (
        <>
          <section
            className={cm.cn('rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden')}
          >
            <header
              className={cm.cn(
                'px-6 py-4 border-b border-surface-container flex items-center justify-between',
              )}
            >
              <div>
                <h2 className={cm.cn('text-base font-bold text-on-surface')}>
                  {t('settings.team.heading', {}, { defaultValue: 'Workspace owner' })}
                </h2>
                <p className={cm.cn('text-xs text-on-surface-variant mt-1')}>
                  {t(
                    'settings.team.body',
                    {},
                    {
                      defaultValue:
                        'Single-tenant workspace. Profile changes apply to the signed-in user.',
                    },
                  )}
                </p>
              </div>
              <Link
                to="/profile"
                className={cm.cn(
                  'bg-gradient-to-br from-primary to-primary-container text-white font-bold text-xs uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-md transition-shadow',
                )}
              >
                {t('nav.editProfile', {}, { defaultValue: 'Edit profile' })}
              </Link>
            </header>
            <div className={cm.cn('px-6 py-5 flex items-center gap-4')}>
              <span
                className={cm.cn(
                  'w-12 h-12 rounded-full bg-primary/10 text-primary font-bold inline-flex items-center justify-center',
                )}
              >
                {(user?.name || user?.email || '?')
                  .split(/[\s@]/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase() ?? '')
                  .join('') || '?'}
              </span>
              <div className={cm.cn('flex-1 min-w-0')}>
                <p className={cm.cn('font-semibold text-on-surface')}>
                  {user?.name ||
                    t('settings.team.unnamed', {}, { defaultValue: 'Unnamed reviewer' })}
                </p>
                <p className={cm.cn('text-xs text-on-surface-variant')}>{user?.email ?? ''}</p>
              </div>
              <span
                className={cm.cn(
                  'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant px-3 py-1 rounded-full bg-surface-container-low',
                )}
              >
                {t('settings.team.role.owner', {}, { defaultValue: 'Owner' })}
              </span>
            </div>
          </section>

          <section
            className={cm.cn('rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden')}
          >
            <header className={cm.cn('px-6 py-4 border-b border-surface-container')}>
              <h2 className={cm.cn('text-base font-bold text-on-surface')}>
                {t('settings.accountSecurity.heading', {}, { defaultValue: 'Account & security' })}
              </h2>
              <p className={cm.cn('text-xs text-on-surface-variant mt-1')}>
                {t(
                  'settings.accountSecurity.body',
                  {},
                  {
                    defaultValue:
                      'Password, two-factor, push notifications, devices and account actions.',
                  },
                )}
              </p>
            </header>
            <SettingsContainer onClose={() => undefined}>
              <AuthSection />
              <NotificationsSection />
              <DevicesSection />
              <ThisDeviceSection />
              <LogOutDeleteSection />
            </SettingsContainer>
          </section>
        </>
      )}

      {tab === 'integrations' && (
        <section className={cm.cn(cm.grid({ cols: 2, gap: 6 }))}>
          {INTEGRATION_DEFS.map((integration) => {
            const enabled = integrations[integration.id]
            return (
              <article
                key={integration.id}
                className={cm.cn(
                  'rounded-xl bg-surface-container-lowest shadow-sm p-6 flex items-center gap-4',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn(
                    'material-symbols-outlined p-3 rounded-full bg-primary/10 text-primary text-[24px]',
                  )}
                >
                  {integration.icon}
                </span>
                <div className={cm.cn('flex-1')}>
                  <h3 className={cm.cn('font-bold text-on-surface')}>{integration.name}</h3>
                  <p
                    className={cm.cn(
                      'text-xs uppercase tracking-widest font-bold text-on-surface-variant mt-1',
                    )}
                  >
                    {enabled
                      ? t('status.connected', {}, { defaultValue: 'Connected' })
                      : t('settings.integrations.available', {}, { defaultValue: 'Available' })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    persistIntegrations({ ...integrations, [integration.id]: !enabled })
                    setFeedback(
                      enabled
                        ? t(
                            'settings.integrations.disconnectedToast',
                            { name: integration.name },
                            { defaultValue: `Disconnected ${integration.name}.` },
                          )
                        : t(
                            'settings.integrations.connectedToast',
                            { name: integration.name },
                            { defaultValue: `Connected ${integration.name}.` },
                          ),
                    )
                  }}
                  className={cm.cn(
                    'text-xs font-bold uppercase tracking-wide px-3 py-2 rounded-md transition-colors',
                    enabled
                      ? 'border border-outline-variant text-on-surface hover:bg-surface-container-low'
                      : 'bg-primary text-white hover:opacity-90',
                  )}
                >
                  {enabled
                    ? t('settings.integrations.disconnect', {}, { defaultValue: 'Disconnect' })
                    : t('common.connect', {}, { defaultValue: 'Connect' })}
                </button>
              </article>
            )
          })}
        </section>
      )}

      {tab === 'api' && (
        <section
          className={cm.cn('rounded-xl bg-surface-container-lowest shadow-sm p-6 space-y-6')}
        >
          <div>
            <h2 className={cm.cn('text-base font-bold text-on-surface')}>
              {t('settings.api.heading', {}, { defaultValue: 'API access' })}
            </h2>
            <p className={cm.cn('text-sm text-on-surface-variant mt-1')}>
              {t(
                'settings.api.body',
                {},
                {
                  defaultValue:
                    'Use these credentials to send content to the moderation API programmatically.',
                },
              )}
            </p>
          </div>

          {tokenError && (
            <div
              role="alert"
              className={cm.cn(
                cm.accentCard({ tone: 'error' }),
                'rounded-lg bg-red-50 pr-4 py-3 text-sm text-red-700',
              )}
            >
              {tokenError}
            </div>
          )}

          <form
            className={cm.cn('flex items-end gap-3 flex-wrap')}
            onSubmit={(event) => {
              event.preventDefault()
              createToken()
            }}
          >
            <div className={cm.cn('flex-1 min-w-[220px]')}>
              <label
                htmlFor="token-label"
                className={cm.cn(
                  'block text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label mb-2',
                )}
              >
                {t('settings.api.tokenLabel', {}, { defaultValue: 'New token label' })}
              </label>
              <input
                id="token-label"
                type="text"
                value={tokenLabel}
                onChange={(event) => setTokenLabel(event.target.value)}
                className={cm.cn(
                  'w-full bg-surface-container-low border border-surface-container rounded-md px-3 py-2 text-sm focus:border-primary focus:outline-none',
                )}
              />
            </div>
            <button
              type="submit"
              data-mol-id="create-token"
              disabled={tokenBusy || tokenLabel.trim() === ''}
              className={cm.cn(
                'bg-gradient-to-br from-primary to-primary-container text-white font-bold text-xs uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-md transition-shadow disabled:opacity-60',
              )}
            >
              {tokenBusy
                ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                : t('settings.api.create', {}, { defaultValue: 'Create token' })}
            </button>
          </form>

          {pendingToken && (
            <div className={cm.cn('rounded-lg border border-amber-300 bg-amber-50 px-4 py-3')}>
              <p
                className={cm.cn('text-xs font-bold uppercase tracking-widest text-amber-800 mb-2')}
              >
                {t(
                  'settings.api.oneTimeWarning',
                  {},
                  { defaultValue: 'Copy this token now — it will not be shown again.' },
                )}
              </p>
              <div className={cm.cn('flex items-center gap-2')}>
                <code
                  className={cm.cn(
                    'flex-1 font-mono text-sm bg-white border border-amber-200 rounded-md px-3 py-2 break-all select-all',
                  )}
                >
                  {pendingToken}
                </code>
                <button
                  type="button"
                  onClick={copyToken}
                  className={cm.cn(
                    'border border-amber-300 text-amber-800 text-xs font-bold uppercase tracking-wide px-3 py-2 rounded-md hover:bg-amber-100 transition-colors',
                  )}
                >
                  {t('common.copy', {}, { defaultValue: 'Copy' })}
                </button>
              </div>
            </div>
          )}

          <div>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label mb-2',
              )}
            >
              {t('settings.api.existing', {}, { defaultValue: 'Active tokens' })}
            </p>
            {tokens === null ? (
              <p className={cm.cn('text-sm text-on-surface-variant')}>
                {t('settings.api.loading', {}, { defaultValue: 'Loading tokens…' })}
              </p>
            ) : tokens.length === 0 ? (
              <p className={cm.cn('text-sm text-on-surface-variant')}>
                {t('settings.api.empty', {}, { defaultValue: 'No tokens yet — create one above.' })}
              </p>
            ) : (
              <ul className={cm.cn('divide-y divide-surface-container')}>
                {tokens.map((token) => (
                  <li
                    key={token.id}
                    data-mol-id={`token-row-${token.id}`}
                    className={cm.cn('py-3 flex items-center gap-3 flex-wrap')}
                  >
                    <span className={cm.cn('flex-1 min-w-[200px]')}>
                      <span className={cm.cn('block text-sm font-semibold text-on-surface')}>
                        {token.label}
                      </span>
                      <span className={cm.cn('block text-xs text-on-surface-variant')}>
                        {t(
                          'settings.api.createdOn',
                          { date: new Date(token.createdAt).toLocaleDateString() },
                          {
                            defaultValue: `Created ${new Date(token.createdAt).toLocaleDateString()}`,
                          },
                        )}
                      </span>
                    </span>
                    <button
                      type="button"
                      data-mol-id="revoke-token"
                      onClick={() => revokeToken(token.id)}
                      disabled={tokenBusy}
                      className={cm.cn(
                        'border border-red-300 text-red-600 text-xs font-bold uppercase tracking-wide px-3 py-2 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50',
                      )}
                    >
                      {t('settings.api.revoke', {}, { defaultValue: 'Revoke' })}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label
              htmlFor="webhook"
              className={cm.cn(
                'block text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label mb-2',
              )}
            >
              {t('settings.api.webhook', {}, { defaultValue: 'Webhook URL' })}
            </label>
            <div className={cm.cn('flex items-center gap-2')}>
              <input
                id="webhook"
                type="url"
                value={webhookUrl}
                onChange={(event) => setWebhookUrl(event.target.value)}
                placeholder={t(
                  'settings.api.webhookHint',
                  {},
                  { defaultValue: 'https://example.com/sift/webhook' },
                )}
                className={cm.cn(
                  'w-full font-mono text-sm bg-surface-container-low border border-surface-container rounded-md px-3 py-2 focus:border-primary focus:outline-none',
                )}
              />
              <button
                type="button"
                onClick={saveWebhook}
                className={cm.cn(
                  'border border-outline-variant text-on-surface text-xs font-bold uppercase tracking-wide px-3 py-2 rounded-md hover:bg-surface-container-low transition-colors',
                )}
              >
                {t('common.save', {}, { defaultValue: 'Save' })}
              </button>
            </div>
          </div>
        </section>
      )}

      {tab === 'billing' && (
        <section className={cm.cn('rounded-xl bg-surface-container-lowest shadow-sm p-6')}>
          <h2 className={cm.cn('text-base font-bold text-on-surface mb-1')}>
            {t('nav.planAndBilling', {}, { defaultValue: 'Plan & billing' })}
          </h2>
          <p className={cm.cn('text-sm text-on-surface-variant mb-6')}>
            {t(
              'settings.billing.body',
              {},
              {
                defaultValue: 'Pricing tiers are managed on the public pricing page.',
              },
            )}
          </p>
          <Link
            to="/pricing"
            className={cm.cn(
              'inline-flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-white font-bold text-sm uppercase tracking-wider px-4 py-3 rounded-lg hover:shadow-md transition-shadow',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-[18px]')}>
              credit_card
            </span>
            {t('settings.billing.viewPlans', {}, { defaultValue: 'View pricing' })}
          </Link>
        </section>
      )}
    </SiftLayout>
  )
}

export default Settings
