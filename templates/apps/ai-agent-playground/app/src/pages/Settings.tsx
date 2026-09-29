// Pattern source: ai-chatbot-builder/components/SettingsProfileSection.tsx +
// SettingsAccessSection.tsx — workspace-wide preferences, API keys, defaults.
import { useCallback, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { PageHeader } from '../components/PageHeader.js'

const PROVIDERS = ['anthropic', 'openai', 'google'] as const

interface ApiCredential {
  id: string
  provider: string
  hint: string
  hasKey: boolean
  label?: string | null
  updated_at?: string
}

interface UserPreferences {
  defaultProvider?: string
  defaultModel?: string
  timezone?: string
}

interface OwnedRow {
  id: string
}

const STATUS_TONE_PRESENT = 'text-emerald-500 border-emerald-500/40'
const STATUS_TONE_MISSING = 'text-tertiary border-outline-variant/30'

interface UserPreferencesRow {
  data?: UserPreferences
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserProfile & { data?: UserPreferences }>()

  const userId = user?.id ?? ''

  const [credentials, setCredentials] = useState<ApiCredential[]>([])
  const [prefs, setPrefs] = useState<UserPreferences>({})
  const [defaultProvider, setDefaultProvider] = useState('anthropic')
  const [defaultModel, setDefaultModel] = useState('claude-sonnet-4-7')
  const [timezone, setTimezone] = useState('UTC')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [confirmingPurge, setConfirmingPurge] = useState(false)
  // Inline rotate-key editor (provider currently being edited + its input).
  // Replaces the old window.prompt flow — native prompt() is silent-nullptr
  // under headless browsers and offers no inline validation or cancel.
  const [rotatingProvider, setRotatingProvider] = useState<string | null>(null)
  const [rotateValue, setRotateValue] = useState('')

  const loadPrefs = useCallback(async () => {
    try {
      const res = await http.get<UserPreferencesRow>('/user-preferences')
      const next = (res.data?.data as UserPreferences | undefined) ?? {}
      setPrefs(next)
      setDefaultProvider(next.defaultProvider ?? 'anthropic')
      setDefaultModel(next.defaultModel ?? 'claude-sonnet-4-7')
      setTimezone(next.timezone ?? 'UTC')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [http])

  useEffect(() => {
    void loadPrefs()
  }, [loadPrefs])

  const loadCredentials = useCallback(async () => {
    try {
      const res = await http.get<ApiCredential[]>('/api-credentials')
      setCredentials(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [http])

  useEffect(() => {
    void loadCredentials()
  }, [loadCredentials])

  const credentialByProvider = useMemo(() => {
    const map = new Map<string, ApiCredential>()
    for (const cred of credentials) {
      map.set(cred.provider, cred)
    }
    return map
  }, [credentials])

  async function patchUser(data: UserPreferences): Promise<void> {
    if (!userId) return
    try {
      const next = { ...prefs, ...data }
      await http.patch('/user-preferences', { data: next })
      setPrefs(next)
      track({ name: 'preferences.updated', properties: { userId, keys: Object.keys(data) } })
      setInfo(t('settings.savedToast', {}, { defaultValue: 'Preferences saved.' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function startRotate(provider: string): void {
    setRotatingProvider(provider)
    setRotateValue('')
  }

  function cancelRotate(): void {
    setRotatingProvider(null)
    setRotateValue('')
  }

  async function confirmRotate(provider: string): Promise<void> {
    const next = rotateValue.trim()
    if (!next) return
    try {
      await http.put('/api-credentials', { provider, key: next })
      setRotatingProvider(null)
      setRotateValue('')
      await loadCredentials()
      setInfo(t('settings.keySavedToast', { provider }, { defaultValue: `${provider} key saved.` }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function purgeWorkspace(): Promise<void> {
    setConfirmingPurge(false)
    try {
      // The danger-zone copy promises agents, datasets, AND execution logs
      // are wiped — keep the behavior honest by clearing all three.
      const [agentsRes, datasetsRes] = await Promise.all([
        http.get<OwnedRow[]>('/agents'),
        http.get<OwnedRow[]>('/datasets'),
      ])
      const agents = Array.isArray(agentsRes.data) ? agentsRes.data : []
      const datasets = Array.isArray(datasetsRes.data) ? datasetsRes.data : []
      for (const agent of agents) {
        await http.delete(`/agents/${agent.id}`)
      }
      track({
        name: 'workspace.purged',
        properties: { userId, agents: agents.length, datasets: datasets.length },
      })
      for (const dataset of datasets) {
        await http.delete(`/datasets/${dataset.id}`)
      }
      await http.delete('/executions')
      setInfo(
        t(
          'settings.purgedToast',
          { count: agents.length },
          { defaultValue: `Purged ${agents.length} agents.` },
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div data-mol-id="page-settings">
      <PageHeader
        subtitle={t(
          'settings.subtitle',
          {},
          { defaultValue: 'Provider keys, defaults, and workspace preferences.' },
        )}
        title={t('nav.settings', {}, { defaultValue: 'Settings' })}
      />

      {(error || info) && (
        <div className={cm.cn(cm.sp('mb', 4))}>
          {error && (
            <p
              className={cm.cn(cm.textSize('sm'), 'text-error font-mono')}
              data-mol-id="settings-error"
              role="alert"
            >
              {error}
            </p>
          )}
          {info && !error && (
            <p
              className={cm.cn(cm.textSize('sm'), 'text-success font-mono')}
              data-mol-id="settings-info"
            >
              {info}
            </p>
          )}
        </div>
      )}

      <div className={cm.cn(cm.grid({ cols: 12, gap: 6 }))}>
        <section className="col-span-7">
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface-container-low rounded border border-outline-variant/15',
            )}
          >
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mb', 4),
                'font-mono uppercase tracking-wider text-tertiary',
              )}
            >
              {t('settings.apiKeys', {}, { defaultValue: 'Provider API Keys' })}
            </h2>
            <div className={cm.cn(cm.stack(3))}>
              {PROVIDERS.map((provider) => {
                const cred = credentialByProvider.get(provider)
                const present = !!cred?.hasKey
                return (
                  <div
                    key={provider}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('p', 3),
                      'bg-surface-container rounded',
                    )}
                    data-mol-id={`settings-credential-${provider}`}
                  >
                    <div>
                      <div
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'font-headline text-on-surface',
                        )}
                      >
                        {provider}
                      </div>
                      <div
                        className={
                          'font-mono text-[10px] text-tertiary mt-1 uppercase tracking-widest'
                        }
                      >
                        {present
                          ? `${cred?.hint} · ${cred?.updated_at ?? ''}`
                          : t('settings.noKey', {}, { defaultValue: 'no key configured' })}
                      </div>
                    </div>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          'font-mono uppercase tracking-wider rounded border bg-surface-container-low',
                          present ? STATUS_TONE_PRESENT : STATUS_TONE_MISSING,
                        )}
                      >
                        {present
                          ? t('settings.keyStatus.active', {}, { defaultValue: 'active' })
                          : t('settings.keyStatus.missing', {}, { defaultValue: 'missing' })}
                      </span>
                      {rotatingProvider === provider ? (
                        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                          <input
                            aria-label={t(
                              'settings.rotateKeyPrompt',
                              { provider },
                              { defaultValue: `Paste a new API key for ${provider}` },
                            )}
                            autoComplete="off"
                            className={cm.cn(
                              cm.sp('px', 2),
                              cm.sp('py', 1),
                              cm.textSize('xs'),
                              'w-[180px] bg-surface-container-lowest text-on-surface font-mono rounded border border-outline-variant/30 focus:border-secondary focus:outline-none',
                            )}
                            data-mol-id={`settings-credential-${provider}-key-input`}
                            onChange={(e) => setRotateValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void confirmRotate(provider)
                              if (e.key === 'Escape') cancelRotate()
                            }}
                            placeholder={t('settings.keyPlaceholder', {}, { defaultValue: 'sk-…' })}
                            type="password"
                            value={rotateValue}
                          />
                          <button
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 1),
                              cm.textSize('xs'),
                              cm.fontWeight('semibold'),
                              'btn-primary-gradient rounded text-on-primary-fixed font-mono uppercase tracking-wider disabled:opacity-40',
                            )}
                            data-mol-id={`settings-credential-${provider}-key-save`}
                            disabled={!rotateValue.trim()}
                            onClick={() => void confirmRotate(provider)}
                            type="button"
                          >
                            {t('common.save', {}, { defaultValue: 'Save' })}
                          </button>
                          <button
                            className={cm.cn(
                              cm.sp('px', 2),
                              cm.sp('py', 1),
                              cm.textSize('xs'),
                              'font-mono uppercase tracking-wider text-tertiary hover:text-on-surface rounded transition-colors',
                            )}
                            data-mol-id={`settings-credential-${provider}-key-cancel`}
                            onClick={cancelRotate}
                            type="button"
                          >
                            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                          </button>
                        </div>
                      ) : (
                        <button
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 1),
                            cm.textSize('xs'),
                            'font-mono uppercase tracking-wider text-on-surface bg-surface-container-high rounded hover:bg-surface-container-highest transition-colors',
                          )}
                          data-mol-id={`settings-credential-${provider}-rotate`}
                          onClick={() => startRotate(provider)}
                          type="button"
                        >
                          {present
                            ? t('settings.rotateKey', {}, { defaultValue: 'Rotate' })
                            : t('common.add', {}, { defaultValue: 'Add' })}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <aside className="col-span-5">
          <div
            className={cm.cn(
              cm.sp('p', 6),
              cm.sp('mb', 4),
              'bg-surface-container-low rounded border border-outline-variant/15',
            )}
          >
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mb', 4),
                'font-mono uppercase tracking-wider text-tertiary',
              )}
            >
              {t('settings.defaults', {}, { defaultValue: 'Workspace Defaults' })}
            </h2>
            <div className={cm.cn(cm.stack(4))}>
              <label className="block">
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-label text-on-surface-variant block mb-1.5',
                  )}
                >
                  {t('settings.defaultProvider', {}, { defaultValue: 'Default Provider' })}
                </span>
                <select
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('p', 3),
                    cm.textSize('sm'),
                    'bg-surface-container text-on-surface font-mono rounded border border-outline-variant/15 focus:border-secondary focus:outline-none',
                  )}
                  data-mol-id="settings-default-provider"
                  onChange={(e) => {
                    setDefaultProvider(e.target.value)
                    void patchUser({ defaultProvider: e.target.value })
                  }}
                  value={defaultProvider}
                >
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                  <option value="google">Google</option>
                </select>
              </label>
              <label className="block">
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-label text-on-surface-variant block mb-1.5',
                  )}
                >
                  {t('settings.defaultModel', {}, { defaultValue: 'Default Model' })}
                </span>
                <select
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('p', 3),
                    cm.textSize('sm'),
                    'bg-surface-container text-on-surface font-mono rounded border border-outline-variant/15 focus:border-secondary focus:outline-none',
                  )}
                  data-mol-id="settings-default-model"
                  onChange={(e) => {
                    setDefaultModel(e.target.value)
                    void patchUser({ defaultModel: e.target.value })
                  }}
                  value={defaultModel}
                >
                  <option value="claude-opus-4-7">claude-opus-4-7</option>
                  <option value="claude-sonnet-4-7">claude-sonnet-4-7</option>
                  <option value="claude-haiku-4-5">claude-haiku-4-5</option>
                  <option value="gpt-5.5">gpt-5.5</option>
                  <option value="gpt-5.3-codex">gpt-5.3-codex</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                </select>
              </label>
              <label className="block">
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-label text-on-surface-variant block mb-1.5',
                  )}
                >
                  {t('form.timezone', {}, { defaultValue: 'Timezone' })}
                </span>
                <input
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('p', 3),
                    cm.textSize('sm'),
                    'bg-surface-container text-on-surface font-mono rounded border border-outline-variant/15 focus:border-secondary focus:outline-none',
                  )}
                  data-mol-id="settings-timezone"
                  onBlur={() => void patchUser({ timezone })}
                  onChange={(e) => setTimezone(e.target.value)}
                  type="text"
                  value={timezone}
                />
              </label>
            </div>
          </div>
          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.sp('mb', 4),
              'bg-surface-container-low rounded border border-outline-variant/15',
            )}
          >
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mb', 2),
                'font-mono uppercase tracking-wider text-tertiary',
              )}
            >
              {t('footer.language', {}, { defaultValue: 'Language' })}
            </h2>
            <p
              className={cm.cn(cm.textSize('xs'), cm.sp('mb', 4), 'text-tertiary leading-relaxed')}
            >
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
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface-container-low rounded border border-error/30',
            )}
          >
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mb', 2),
                'font-mono uppercase tracking-wider text-error',
              )}
            >
              {t('settings.dangerZone', {}, { defaultValue: 'Danger Zone' })}
            </h2>
            <p
              className={cm.cn(cm.textSize('xs'), cm.sp('mb', 4), 'text-tertiary leading-relaxed')}
            >
              {t(
                'settings.dangerHint',
                {},
                {
                  defaultValue:
                    'Wipe every agent, dataset, and execution log in this workspace. Cannot be undone.',
                },
              )}
            </p>
            {confirmingPurge ? (
              <div className={cm.cn(cm.flex({ gap: 2 }))} data-mol-id="settings-purge-confirm">
                <button
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('xs'),
                    'font-mono uppercase tracking-wider rounded bg-error text-on-error',
                  )}
                  data-mol-id="settings-purge-confirm-yes"
                  onClick={purgeWorkspace}
                  type="button"
                >
                  {t('settings.purgeConfirm', {}, { defaultValue: 'Confirm purge' })}
                </button>
                <button
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('medium'),
                    cm.textSize('xs'),
                    'font-mono uppercase tracking-wider rounded border border-outline-variant/30 text-tertiary hover:text-on-surface',
                  )}
                  data-mol-id="settings-purge-confirm-cancel"
                  onClick={() => setConfirmingPurge(false)}
                  type="button"
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
              </div>
            ) : (
              <button
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'font-mono uppercase tracking-wider rounded border border-error text-error hover:bg-error hover:text-on-error transition-colors',
                )}
                data-mol-id="settings-purge"
                onClick={() => setConfirmingPurge(true)}
                type="button"
              >
                {t('settings.purgeWorkspace', {}, { defaultValue: 'Purge Workspace' })}
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Settings
