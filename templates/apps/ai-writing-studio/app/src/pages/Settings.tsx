import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { error as logError } from '@molecule/app-logger'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

const TONES = ['Professional', 'Casual', 'Academic', 'Creative', 'Technical', 'Persuasive'] as const
type Tone = (typeof TONES)[number]

interface IntegrationRow {
  key: string
  label: string
  icon: string
  connected: boolean
  credentialId: string | null
}

interface PreferencesRow {
  default_tone: Tone
  auto_save: boolean
  ai_suggestions: boolean
  notify_email: boolean
}

const DEFAULT_PREFS: PreferencesRow = {
  default_tone: 'Professional',
  auto_save: true,
  ai_suggestions: true,
  notify_email: true,
}

function isTone(value: string): value is Tone {
  return (TONES as readonly string[]).includes(value)
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user, logout } = useAuth<UserProfile>()
  const [integrations, setIntegrations] = useState<IntegrationRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<PreferencesRow>(DEFAULT_PREFS)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<{ integrations: IntegrationRow[] }>('/integrations')
      .then((res) => {
        if (cancelled) return
        setIntegrations(res.data?.integrations ?? [])
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setIntegrations([])
        setError(
          t('settings.loadIntegrationsError', {}, { defaultValue: 'Could not load integrations.' }),
        )
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  useEffect(() => {
    let cancelled = false
    http
      .get<PreferencesRow>('/preferences')
      .then((res) => {
        if (cancelled || !res.data) return
        const tone = isTone(res.data.default_tone) ? res.data.default_tone : 'Professional'
        setPrefs({
          default_tone: tone,
          auto_save: Boolean(res.data.auto_save),
          ai_suggestions: Boolean(res.data.ai_suggestions),
          notify_email: Boolean(res.data.notify_email),
        })
      })
      .catch(() => {
        // Defaults already in state.
      })
    return () => {
      cancelled = true
    }
  }, [http])

  async function toggleIntegration(row: IntegrationRow) {
    setBusyKey(row.key)
    try {
      if (row.connected && row.credentialId) {
        await http.delete(`/integrations/${row.credentialId}`)
        setIntegrations((prev) =>
          (prev ?? []).map((r) =>
            r.key === row.key ? { ...r, connected: false, credentialId: null } : r,
          ),
        )
      } else {
        const res = await http.post<{ credentialId: string; connected: boolean }>(
          '/integrations/connect',
          { provider: row.key },
        )
        const credentialId = res.data?.credentialId ?? null
        setIntegrations((prev) =>
          (prev ?? []).map((r) =>
            r.key === row.key ? { ...r, connected: true, credentialId } : r,
          ),
        )
      }
    } catch (error) {
      logError('settings.toggleIntegration', error)
      setError(
        t('settings.toggleIntegrationFailed', {}, { defaultValue: 'Integration update failed.' }),
      )
    } finally {
      setBusyKey(null)
    }
  }

  async function savePreferences() {
    setSavingPrefs(true)
    setError(null)
    try {
      await http.put('/preferences', prefs)
      setSavedAt(Date.now())
    } catch (error) {
      logError('settings.savePreferences', error)
      setError(
        t('settings.savePrefsFailed', {}, { defaultValue: 'Could not save your preferences.' }),
      )
    } finally {
      setSavingPrefs(false)
    }
  }

  async function handleSignOut() {
    try {
      // [M1-1] The persistent credential is the httpOnly `token` cookie. The
      // auth client's logout() only POSTs to the logout route when it still
      // holds the in-memory bearer token — which is gone after any full page
      // load (in-memory storage resets; the cookie alone restores the session).
      // So clear the cookie server-side explicitly via the bonded, credentialed
      // HTTP client; otherwise the cookie survives sign-out and silently
      // re-authenticates on the next load. The route is `POST /users/logout`.
      await http.post('/users/logout').catch(() => undefined)
      await logout()
    } finally {
      navigate('/login')
    }
  }

  return (
    <div data-mol-id="settings-page" className={cm.cn(cm.sp('p', 8), 'bg-background min-h-screen')}>
      <div className={cm.cn('max-w-4xl', cm.mxAuto, cm.stack(8))}>
        <div>
          <h1
            className={cm.cn(
              'text-3xl font-extrabold tracking-tight font-serif text-on-background',
            )}
          >
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textMuted)}>
            {t(
              'settings.subtitle',
              { appName: APP_NAME },
              { defaultValue: 'Tune {{appName}} to match how you write.' },
            )}
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            data-mol-id="settings-error"
            className={cm.cn(
              cm.sp('p', 4),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container',
            )}
          >
            {error}
          </div>
        ) : null}

        <section
          data-mol-id="settings-section-writing"
          className={cm.cn(cm.sp('p', 6), 'rounded-xl bg-surface border border-outline-variant')}
        >
          <h2
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('mb', 4),
              'text-lg font-extrabold tracking-tight font-serif',
            )}
          >
            <span className="material-symbols-outlined text-primary" aria-hidden="true">
              edit_note
            </span>
            {t('settings.writing.title', {}, { defaultValue: 'Writing preferences' })}
          </h2>
          <div className={cm.stack(5)}>
            <div>
              <label
                htmlFor="default-tone"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  cm.sp('mb', 2),
                  'block text-on-surface',
                )}
              >
                {t('settings.writing.tone', {}, { defaultValue: 'Default tone preset' })}
              </label>
              <select
                id="default-tone"
                data-mol-id="settings-tone"
                value={prefs.default_tone}
                onChange={(e) => setPrefs((p) => ({ ...p, default_tone: e.target.value as Tone }))}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-lg bg-surface-container-low border border-outline-variant text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors',
                )}
              >
                {TONES.map((tn) => (
                  <option key={tn} value={tn}>
                    {t(`settings.writing.tone.${tn.toLowerCase()}`, {}, { defaultValue: tn })}
                  </option>
                ))}
              </select>
            </div>
            <SettingToggle
              dataMolId="settings-auto-save"
              label={t(
                'settings.writing.autoSave',
                {},
                { defaultValue: 'Autosave every 30 seconds' },
              )}
              description={t(
                'settings.writing.autoSaveBody',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} keeps a snapshot of your draft so you can recover from any tab.',
                },
              )}
              checked={prefs.auto_save}
              onChange={(next) => setPrefs((p) => ({ ...p, auto_save: next }))}
            />
            <SettingToggle
              dataMolId="settings-ai-suggestions"
              label={t(
                'settings.writing.aiSuggestions',
                {},
                { defaultValue: 'Inline AI suggestions while typing' },
              )}
              description={t(
                'settings.writing.aiSuggestionsBody',
                {},
                {
                  defaultValue:
                    'Shows refinements as you write. Suggestions are always opt-in per sentence.',
                },
              )}
              checked={prefs.ai_suggestions}
              onChange={(next) => setPrefs((p) => ({ ...p, ai_suggestions: next }))}
            />
            <SettingToggle
              dataMolId="settings-notify-email"
              label={t(
                'settings.writing.notifyEmail',
                {},
                { defaultValue: 'Email me weekly writing summaries' },
              )}
              description={t(
                'settings.writing.notifyEmailBody',
                {},
                { defaultValue: 'A short Sunday digest of streaks, drafts, and SEO improvements.' },
              )}
              checked={prefs.notify_email}
              onChange={(next) => setPrefs((p) => ({ ...p, notify_email: next }))}
            />
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
              <button
                type="button"
                data-mol-id="settings-save"
                disabled={savingPrefs}
                onClick={savePreferences}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-full bg-primary text-on-primary hover:bg-primary-dark transition-colors disabled:opacity-60',
                )}
              >
                {savingPrefs
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('settings.save', {}, { defaultValue: 'Save preferences' })}
              </button>
              {savedAt !== null && !savingPrefs ? (
                <span
                  data-mol-id="settings-saved"
                  className={cm.cn(cm.textSize('sm'), 'text-primary')}
                >
                  {t('common.saved', {}, { defaultValue: 'Saved' })}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <section
          data-mol-id="settings-section-integrations"
          className={cm.cn(cm.sp('p', 6), 'rounded-xl bg-surface border border-outline-variant')}
        >
          <h2
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('mb', 4),
              'text-lg font-extrabold tracking-tight font-serif',
            )}
          >
            <span className="material-symbols-outlined text-primary" aria-hidden="true">
              extension
            </span>
            {t('settings.integrations.title', {}, { defaultValue: 'Publishing integrations' })}
          </h2>
          {integrations === null ? (
            <p
              data-mol-id="settings-integrations-loading"
              className={cm.cn(cm.textSize('sm'), cm.textMuted)}
            >
              {t('settings.integrationsLoading', {}, { defaultValue: 'Loading integrations…' })}
            </p>
          ) : integrations.length === 0 ? (
            <p
              data-mol-id="settings-integrations-empty"
              className={cm.cn(cm.textSize('sm'), cm.textMuted, 'font-serif italic')}
            >
              {t(
                'settings.integrationsEmpty',
                {},
                { defaultValue: 'No integrations available yet.' },
              )}
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant">
              {integrations.map((it) => (
                <li
                  key={it.key}
                  data-mol-id={`settings-integration-${it.key}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 4),
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                    <span className="material-symbols-outlined text-primary" aria-hidden="true">
                      {it.icon}
                    </span>
                    <span
                      className={cm.cn(cm.fontWeight('semibold'), 'font-serif text-on-surface')}
                    >
                      {t(`settings.integration.${it.key}`, {}, { defaultValue: it.label })}
                    </span>
                  </div>
                  <button
                    type="button"
                    data-mol-id={`settings-integration-toggle-${it.key}`}
                    disabled={busyKey === it.key}
                    onClick={() => toggleIntegration(it)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('semibold'),
                      cm.textSize('xs'),
                      cm.roundedFull,
                      'uppercase tracking-widest border transition-colors disabled:opacity-60',
                      it.connected
                        ? 'bg-success-container text-on-success-container border-success-container'
                        : 'bg-surface text-on-surface-variant border-outline-variant hover:border-primary/30 hover:text-primary',
                    )}
                  >
                    {busyKey === it.key
                      ? t('settings.integration.updating', {}, { defaultValue: 'Updating…' })
                      : it.connected
                        ? t('common.disconnect', {}, { defaultValue: 'Disconnect' })
                        : t('common.connect', {}, { defaultValue: 'Connect' })}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          data-mol-id="settings-section-language"
          className={cm.cn(cm.sp('p', 6), 'rounded-xl bg-surface border border-outline-variant')}
        >
          <h2
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('mb', 2),
              'text-lg font-extrabold tracking-tight font-serif',
            )}
          >
            <span className="material-symbols-outlined text-primary" aria-hidden="true">
              language
            </span>
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
        <section
          data-mol-id="settings-section-account"
          className={cm.cn(cm.sp('p', 6), 'rounded-xl bg-surface border border-outline-variant')}
        >
          <h2
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('mb', 4),
              'text-lg font-extrabold tracking-tight font-serif',
            )}
          >
            <span className="material-symbols-outlined text-primary" aria-hidden="true">
              person
            </span>
            {t('settings.account', {}, { defaultValue: 'Account' })}
          </h2>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
            )}
          >
            <div>
              <p
                data-mol-id="settings-email"
                className={cm.cn(cm.fontWeight('semibold'), 'font-serif text-on-surface')}
              >
                {user?.email ??
                  t('settings.account.unknownEmail', {}, { defaultValue: 'Email unavailable' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                {t(
                  'settings.account.profileHint',
                  {},
                  { defaultValue: 'Manage your plan from the Billing tab.' },
                )}
              </p>
            </div>
            <button
              type="button"
              data-mol-id="settings-sign-out"
              onClick={handleSignOut}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors',
              )}
            >
              {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

interface SettingToggleProps {
  label: string
  description: string
  checked: boolean
  onChange: (next: boolean) => void
  dataMolId?: string
}

function SettingToggle({ label, description, checked, onChange, dataMolId }: SettingToggleProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }))}>
      <div className={cm.cn('flex-1')}>
        <p className={cm.cn(cm.fontWeight('semibold'), 'font-serif text-on-surface')}>{label}</p>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'mt-1 leading-relaxed')}>
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        data-mol-id={dataMolId}
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cm.cn(
          'relative h-6 w-11 rounded-full transition-colors flex-shrink-0 mt-1',
          checked ? 'bg-primary' : 'bg-surface-container-high',
        )}
      >
        <span
          className={cm.cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-surface shadow transition-transform',
            checked ? 'translate-x-5' : '',
          )}
        />
      </button>
    </div>
  )
}

export default Settings
export { Settings as SettingsPage }
