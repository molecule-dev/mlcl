import { useEffect, useState } from 'react'

import { get, post, put } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { AccountPanel } from '../components/AccountPanel.js'
import { RapportLayout } from '../components/RapportLayout.js'

const SECTIONS = [
  {
    id: 'account',
    icon: 'account_circle',
    titleKey: 'settings.section.account',
    titleDefault: 'Account',
  },
  {
    id: 'bot',
    icon: 'smart_toy',
    titleKey: 'settings.section.bot',
    titleDefault: 'Bot configuration',
  },
  {
    id: 'integrations',
    icon: 'extension',
    titleKey: 'settings.section.integrations',
    titleDefault: 'Integrations',
  },
  { id: 'api', icon: 'key', titleKey: 'settings.section.api', titleDefault: 'API access' },
  {
    id: 'language',
    icon: 'translate',
    titleKey: 'settings.section.language',
    titleDefault: 'Language',
  },
] as const

const INTEGRATIONS = [
  {
    id: 'zendesk',
    name: 'Zendesk',
    descKey: 'settings.integration.zendesk',
    descDefault: 'Two-way ticket sync with custom field mapping.',
  },
  {
    id: 'intercom',
    name: 'Intercom',
    descKey: 'settings.integration.intercom',
    descDefault: 'Sync inboxes and surface context across both tools.',
  },
  {
    id: 'slack',
    name: 'Slack',
    descKey: 'settings.integration.slack',
    descDefault: 'Notify channels on escalations or CSAT dips.',
  },
  {
    id: 'segment',
    name: 'Segment',
    descKey: 'settings.integration.segment',
    descDefault: 'Push conversation events to your warehouse.',
  },
] as const

interface SettingsRow {
  id: string
  user_id: string
  bot_tone: string
  auto_escalate: boolean
  greeting: string
  signature: string
  notify_escalations: boolean
  notify_mentions: boolean
  notify_digest: boolean
  quiet_hours: boolean
}

interface ApiTokenRow {
  id: string
  label: string
  scopes_json: string[] | null
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
  plaintext?: string
}

function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [active, setActive] = useState<(typeof SECTIONS)[number]['id']>('bot')
  const [settings, setSettings] = useState<SettingsRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [tokens, setTokens] = useState<ApiTokenRow[]>([])
  const [tokenLabel, setTokenLabel] = useState('')
  const [creatingToken, setCreatingToken] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [connectedIntegrations, setConnectedIntegrations] = useState<Record<string, boolean>>({
    zendesk: false,
    intercom: false,
    slack: false,
    segment: false,
  })

  async function loadSettings() {
    setLoading(true)
    setError(null)
    try {
      const response = await get<SettingsRow>('/api/settings')
      setSettings(response.data ?? null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.loadError', {}, { defaultValue: 'Failed to load settings' }),
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadTokens() {
    try {
      const response = await get<ApiTokenRow[]>('/api/api-tokens')
      const rows = Array.isArray(response.data) ? response.data : []
      setTokens(rows)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.tokensError', {}, { defaultValue: 'Failed to load tokens' }),
      )
    }
  }

  useEffect(() => {
    void loadSettings()
    void loadTokens()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function patch(field: keyof SettingsRow, value: unknown) {
    if (!settings) return
    setSettings({ ...settings, [field]: value } as SettingsRow)
  }

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    setError(null)
    try {
      await put('/api/settings', {
        bot_tone: settings.bot_tone,
        auto_escalate: settings.auto_escalate,
        greeting: settings.greeting,
        signature: settings.signature,
        notify_escalations: settings.notify_escalations,
        notify_mentions: settings.notify_mentions,
        notify_digest: settings.notify_digest,
        quiet_hours: settings.quiet_hours,
      })
      setSavedMessage(t('settings.savedConfirm', {}, { defaultValue: 'Settings saved' }))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.saveError', {}, { defaultValue: 'Failed to save' }),
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateToken(e: React.FormEvent) {
    e.preventDefault()
    if (!tokenLabel.trim()) return
    setCreatingToken(true)
    setError(null)
    try {
      const response = await post<ApiTokenRow>('/api/api-tokens', {
        label: tokenLabel.trim(),
        scopes: ['conversations:read', 'conversations:write'],
      })
      const created = response.data
      if (created?.plaintext) setNewToken(created.plaintext)
      setTokenLabel('')
      await loadTokens()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.tokenCreateError', {}, { defaultValue: 'Failed to create token' }),
      )
    } finally {
      setCreatingToken(false)
    }
  }

  async function handleRevokeToken(id: string) {
    setError(null)
    try {
      await post(`/api/api-tokens/${id}/revoke`, {})
      await loadTokens()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.tokenRevokeError', {}, { defaultValue: 'Failed to revoke token' }),
      )
    }
  }

  function handleToggleIntegration(id: string) {
    setConnectedIntegrations((prev) => ({ ...prev, [id]: !prev[id] }))
    setSavedMessage(
      t('settings.integrationToggled', {}, { defaultValue: 'Integration preference updated' }),
    )
  }

  return (
    <RapportLayout>
      <div data-mol-id="page-settings" className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-4xl tracking-tight text-on-background leading-tight',
          )}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.subtitle',
            { appName: APP_NAME },
            {
              defaultValue:
                "Tune {{appName}}'s voice, knowledge sources, and the tools it talks to.",
            },
          )}
        </p>
      </div>

      {savedMessage && (
        <div
          data-mol-id="settings-saved"
          role="status"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.sp('p', 3),
            'rounded-lg bg-primary/10 text-primary text-sm',
          )}
        >
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{savedMessage}</span>
        </div>
      )}

      {error && (
        <div
          data-mol-id="settings-error"
          role="alert"
          className={cm.cn(cm.sp('p', 3), 'rounded-lg bg-error/10 text-error text-sm')}
        >
          {error}
        </div>
      )}

      <div className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'lg:grid-cols-12')}>
        <nav
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 1 }),
            cm.sp('p', 3),
            'lg:col-span-3 rounded-2xl bg-surface-container-lowest shadow-sm h-fit',
          )}
          data-mol-id="settings-nav"
        >
          {SECTIONS.map((s) => {
            const isActive = active === s.id
            return (
              <button
                key={s.id}
                data-mol-id={`settings-tab-${s.id}`}
                type="button"
                onClick={() => setActive(s.id)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 3 }),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'rounded-lg transition-colors text-left',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface hover:bg-surface-container-low',
                )}
              >
                <span className="material-symbols-outlined text-lg">{s.icon}</span>
                {t(s.titleKey, {}, { defaultValue: s.titleDefault })}
              </button>
            )
          })}
        </nav>

        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 6 }),
            cm.sp('p', 8),
            'lg:col-span-9 rounded-2xl bg-surface-container-lowest shadow-sm',
          )}
        >
          {active === 'account' ? (
            <AccountPanel />
          ) : loading ? (
            <div
              data-mol-id="settings-loading"
              className={cm.cn(cm.textCenter, cm.sp('p', 8), 'text-on-surface-variant')}
            >
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </div>
          ) : !settings ? (
            <div
              data-mol-id="settings-empty"
              className={cm.cn(cm.textCenter, cm.sp('p', 8), 'text-on-surface-variant')}
            >
              {t('settings.empty', {}, { defaultValue: 'Settings not available.' })}
            </div>
          ) : active === 'bot' ? (
            <div data-mol-id="settings-section-bot">
              <h2
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('xl'),
                  'text-on-surface tracking-tight mb-4',
                )}
              >
                {t('settings.bot.title', {}, { defaultValue: 'Bot configuration' })}
              </h2>
              <form
                data-mol-id="settings-bot-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  void handleSave()
                }}
                className={cm.cn(cm.flex({ direction: 'col', gap: 4 }))}
              >
                <label className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      'text-[10px] tracking-widest uppercase text-on-surface-variant',
                    )}
                  >
                    {t('settings.bot.toneLabel', {}, { defaultValue: 'Voice & tone' })}
                  </span>
                  <select
                    data-mol-id="settings-bot-tone"
                    value={settings.bot_tone}
                    onChange={(e) => patch('bot_tone', e.target.value)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'rounded-xl bg-surface-container-low border-transparent focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none',
                    )}
                  >
                    <option value="warm">
                      {t(
                        'settings.bot.toneWarm',
                        {},
                        { defaultValue: 'Warm + attentive (recommended)' },
                      )}
                    </option>
                    <option value="brief">
                      {t('settings.bot.toneBrief', {}, { defaultValue: 'Brief + direct' })}
                    </option>
                    <option value="formal">
                      {t('settings.bot.toneFormal', {}, { defaultValue: 'Formal' })}
                    </option>
                  </select>
                </label>
                <label
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('p', 4),
                    'rounded-xl bg-surface-container-low',
                  )}
                >
                  <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.textSize('sm'),
                        'text-on-surface',
                      )}
                    >
                      {t(
                        'settings.bot.autoEscalateLabel',
                        {},
                        { defaultValue: 'Auto-escalate when sentiment drops' },
                      )}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'settings.bot.autoEscalateDesc',
                        {},
                        { defaultValue: 'Loop a human in when sentiment dips below -0.3.' },
                      )}
                    </span>
                  </div>
                  <input
                    data-mol-id="settings-bot-auto-escalate"
                    type="checkbox"
                    checked={settings.auto_escalate}
                    onChange={(e) => patch('auto_escalate', e.target.checked)}
                    className="h-5 w-5 accent-primary"
                  />
                </label>
                <label className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      'text-[10px] tracking-widest uppercase text-on-surface-variant',
                    )}
                  >
                    {t(
                      'settings.bot.greetingLabel',
                      {},
                      { defaultValue: 'First-message greeting' },
                    )}
                  </span>
                  <textarea
                    data-mol-id="settings-bot-greeting"
                    rows={3}
                    value={settings.greeting}
                    onChange={(e) => patch('greeting', e.target.value)}
                    placeholder={t(
                      'settings.bot.greetingPlaceholder',
                      {},
                      { defaultValue: 'Hi there — how can I help today?' },
                    )}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'rounded-xl bg-surface-container-low border-transparent focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none resize-none',
                    )}
                  />
                </label>
                <div className={cm.flex({ gap: 2 })}>
                  <button
                    data-mol-id="settings-bot-save"
                    type="submit"
                    disabled={saving}
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'rounded-full bg-primary text-on-primary px-5 py-2 disabled:opacity-50',
                    )}
                  >
                    {saving
                      ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                      : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                  </button>
                </div>
              </form>
            </div>
          ) : active === 'integrations' ? (
            <div data-mol-id="settings-section-integrations">
              <h2
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('xl'),
                  'text-on-surface tracking-tight mb-4',
                )}
              >
                {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
              </h2>
              <div className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'sm:grid-cols-2')}>
                {INTEGRATIONS.map((i) => (
                  <div
                    key={i.id}
                    data-mol-id={`settings-integration-${i.id}`}
                    className={cm.cn(
                      cm.flex({ direction: 'col', gap: 3 }),
                      cm.sp('p', 5),
                      'rounded-2xl bg-surface-container-low',
                    )}
                  >
                    <div className={cm.flex({ justify: 'between', align: 'center' })}>
                      <span
                        className={cm.cn(
                          cm.fontWeight('semibold'),
                          cm.textSize('base'),
                          'text-on-surface',
                        )}
                      >
                        {i.name}
                      </span>
                      {connectedIntegrations[i.id] && (
                        <span
                          data-mol-id={`settings-integration-${i.id}-status`}
                          className={cm.cn(
                            cm.fontWeight('bold'),
                            'rounded-full bg-[color:var(--color-success-container)] text-[color:var(--color-on-success-container)] px-2 py-0.5 text-[10px] tracking-widest uppercase',
                          )}
                        >
                          {t('status.connected', {}, { defaultValue: 'Connected' })}
                        </span>
                      )}
                    </div>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-on-surface-variant leading-relaxed',
                      )}
                    >
                      {t(i.descKey, {}, { defaultValue: i.descDefault })}
                    </p>
                    <button
                      data-mol-id={`settings-integration-${i.id}-toggle`}
                      type="button"
                      onClick={() => handleToggleIntegration(i.id)}
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.textSize('xs'),
                        'self-start rounded-full px-4 py-1.5 hover:scale-[1.02] transition-transform',
                        connectedIntegrations[i.id]
                          ? 'bg-surface-container-low text-on-surface border border-outline-variant'
                          : 'bg-primary text-on-primary',
                      )}
                    >
                      {connectedIntegrations[i.id]
                        ? t('common.disconnect', {}, { defaultValue: 'Disconnect' })
                        : t('common.connect', {}, { defaultValue: 'Connect' })}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : active === 'api' ? (
            <div
              data-mol-id="settings-section-api"
              className={cm.flex({ direction: 'col', gap: 4 })}
            >
              <h2
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('xl'),
                  'text-on-surface tracking-tight',
                )}
              >
                {t('settings.api.title', {}, { defaultValue: 'API access' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.api.description',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'Generate scoped tokens for integrating {{appName}} with your stack. Tokens are shown ONCE — copy immediately.',
                  },
                )}
              </p>

              <form
                data-mol-id="settings-api-form"
                onSubmit={handleCreateToken}
                className={cm.cn(cm.flex({ gap: 2 }), 'flex-wrap')}
              >
                <input
                  data-mol-id="settings-api-token-label"
                  type="text"
                  value={tokenLabel}
                  onChange={(e) => setTokenLabel(e.target.value)}
                  placeholder={t(
                    'settings.api.tokenLabelPlaceholder',
                    {},
                    { defaultValue: 'Token label (e.g. CI server)' },
                  )}
                  required
                  className={cm.cn(
                    cm.flex1,
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'min-w-[240px] rounded-xl bg-surface-container-low border-transparent focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none',
                  )}
                />
                <button
                  data-mol-id="settings-api-create"
                  type="submit"
                  disabled={creatingToken}
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'rounded-full bg-primary text-on-primary px-4 py-2 disabled:opacity-50',
                  )}
                >
                  {creatingToken
                    ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                    : t('settings.api.createCta', {}, { defaultValue: 'Create token' })}
                </button>
              </form>

              {newToken && (
                <div
                  data-mol-id="settings-api-new-token"
                  role="alert"
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 2 }),
                    cm.sp('p', 4),
                    'rounded-xl bg-on-background text-primary-fixed font-mono text-sm',
                  )}
                >
                  <span className="text-[10px] tracking-widest uppercase text-inverse-primary">
                    {t(
                      'settings.api.newToken',
                      {},
                      { defaultValue: "New token (copy now — won't be shown again)" },
                    )}
                  </span>
                  <code data-mol-id="settings-api-new-token-value" className="block break-all">
                    {newToken}
                  </code>
                  <button
                    data-mol-id="settings-api-new-token-dismiss"
                    type="button"
                    onClick={() => setNewToken(null)}
                    className="self-start text-xs text-primary-fixed underline"
                  >
                    {t('settings.api.dismissed', {}, { defaultValue: "I've copied it" })}
                  </button>
                </div>
              )}

              <div
                className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}
                data-mol-id="settings-api-token-list"
              >
                {tokens.length === 0 ? (
                  <div
                    data-mol-id="settings-api-empty"
                    className={cm.cn(cm.textCenter, cm.sp('p', 6), 'text-on-surface-variant')}
                  >
                    {t('settings.api.empty', {}, { defaultValue: 'No tokens yet.' })}
                  </div>
                ) : (
                  tokens.map((token) => (
                    <div
                      key={token.id}
                      data-mol-id={`settings-api-token-${token.id}`}
                      className={cm.cn(
                        cm.flex({ justify: 'between', align: 'center' }),
                        cm.sp('p', 4),
                        'rounded-xl bg-surface-container-low',
                      )}
                    >
                      <div className={cm.flex({ direction: 'col' })}>
                        <span
                          className={cm.cn(
                            cm.fontWeight('semibold'),
                            cm.textSize('sm'),
                            'text-on-surface',
                          )}
                        >
                          {token.label}
                        </span>
                        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {token.revoked_at
                            ? t(
                                'settings.api.revokedOn',
                                { date: new Date(token.revoked_at).toLocaleDateString() },
                                { defaultValue: 'Revoked {{date}}' },
                              )
                            : t(
                                'settings.api.createdOn',
                                { date: new Date(token.created_at).toLocaleDateString() },
                                { defaultValue: 'Created {{date}}' },
                              )}
                        </span>
                      </div>
                      {!token.revoked_at && (
                        <button
                          data-mol-id={`settings-api-revoke-${token.id}`}
                          type="button"
                          onClick={() => void handleRevokeToken(token.id)}
                          className={cm.cn(
                            cm.fontWeight('semibold'),
                            cm.textSize('xs'),
                            'rounded-full bg-error/10 text-error px-3 py-1.5',
                          )}
                        >
                          {t('common.revoke', {}, { defaultValue: 'Revoke' })}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : active === 'language' ? (
            <div
              data-mol-id="settings-section-language"
              className={cm.flex({ direction: 'col', gap: 4 })}
            >
              <h2
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('xl'),
                  'text-on-surface tracking-tight',
                )}
              >
                {t('footer.language', {}, { defaultValue: 'Language' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'common.chooseTheLanguage',
                  {},
                  { defaultValue: 'Choose the language used throughout the app.' },
                )}
              </p>
              <LanguagePicker />
            </div>
          ) : null}
        </section>
        <section
          className={cm.cn(cm.sp('p', 8), 'lg:col-span-12 bg-surface-container-low rounded-xl')}
        >
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
      </div>
    </RapportLayout>
  )
}

export default Settings
export { Settings, Settings as SettingsPage }
