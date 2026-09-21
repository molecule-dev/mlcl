import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import {
  useAuth,
  useAuthClient,
  useChangePassword,
  useHttpClient,
  useTranslation,
} from '@molecule/app-react'
import { NotificationsSection } from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import {
  Alert,
  Button,
  Input,
  LanguagePicker,
  Modal,
  Spinner,
  ThemeToggle,
} from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = ['profile', 'preferences', 'api_keys', 'security'] as const
type Section = (typeof SECTIONS)[number]

interface Preferences {
  display_name: string | null
  quote_currency: string
  locale: string
  refresh_seconds: number
  theme: string
  notify_email: boolean
  notify_push: boolean
  notify_sms: boolean
}

const DEFAULT_PREFS: Preferences = {
  display_name: '',
  quote_currency: 'USD',
  locale: 'en',
  refresh_seconds: 15,
  theme: 'system',
  notify_email: true,
  notify_push: false,
  notify_sms: false,
}

/** Resolve a saved preference locale to one the i18n bond has registered.
 *
 * Older preference rows stored BCP-47 tags like "en-US"; the i18n bond
 * registers base codes ("en"), and `setLocale` THROWS on an unregistered
 * code — the `void setLocale(...)` rejection then surfaces as an unhandled
 * pageerror on every visit to /settings. Exact match wins, else the base
 * language ("en-US" → "en"), else null (leave the current locale alone). */
function resolveSavedLocale(
  saved: string | null | undefined,
  locales: ReadonlyArray<{ code: string }>,
): string | null {
  if (!saved) return null
  const codes = new Set(locales.map((l) => l.code))
  if (codes.has(saved)) return saved
  const base = saved.split('-')[0]
  return codes.has(base) ? base : null
}

export function Settings() {
  const cm = getClassMap()
  const { t, locale, setLocale, locales } = useTranslation()
  const http = useHttpClient()
  const [section, setSection] = useState<Section>('profile')
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/preferences')
      .then((res) => {
        if (cancelled) return
        const data = unwrapSingle<Preferences>(res)
        if (data) {
          // Normalize the stored locale to a registered one BEFORE touching
          // either state — an unregistered code would make setLocale throw.
          const savedLocale = resolveSavedLocale(data.locale, locales)
          setPrefs({ ...DEFAULT_PREFS, ...data, locale: savedLocale ?? locale })
          // Apply the saved locale to the i18n bond so the UI reflects it.
          if (savedLocale && savedLocale !== locale) {
            void setLocale(savedLocale).catch(() => {
              // Unregistered locale (pruned / unknown) — keep the default.
            })
          }
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(t('settings.loadError', {}, { defaultValue: 'Failed to load preferences.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, t])

  // Mirror the active i18n locale into prefs so saving persists it.
  useEffect(() => {
    setPrefs((p) => (p.locale === locale ? p : { ...p, locale }))
  }, [locale])

  const updatePref = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }))
  }

  const savePrefs = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await http.put('/api/preferences', prefs)
      void track({
        name: 'settings.updated',
        properties: { quote_currency: prefs.quote_currency, locale: prefs.locale },
      })
      setSavedAt(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.maxW('7xl'),
        cm.mxAuto,
        cm.grid({ cols: 12, gap: 'lg' }),
        'lg:px-10',
      )}
    >
      <aside className={cm.cn('col-span-12 md:col-span-3')}>
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <nav
          className={cm.cn('space-y-1')}
          aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
        >
          {SECTIONS.map((s) => {
            const isActive = section === s
            return (
              <button
                key={s}
                type="button"
                data-testid={`settings-nav-${s}`}
                onClick={() => setSection(s)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block w-full text-left rounded-md',
                  isActive
                    ? cm.cn('bg-primary-container', cm.textPrimary)
                    : cm.cn(
                        'text-on-surface-variant',
                        'hover:bg-surface-container hover:text-on-surface',
                      ),
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {t(
                  `settings.section.${s}`,
                  {},
                  { defaultValue: s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) },
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      <main className={cm.cn('col-span-12 md:col-span-9 space-y-4')}>
        {loading ? (
          <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
            {t('settings.loading', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : null}

        {!loading && section === 'profile' && (
          <>
            <AccountEmailCard />
            <form
              onSubmit={savePrefs}
              data-testid="settings-profile-form"
              className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}
            >
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('nav.profile', {}, { defaultValue: 'Profile' })}
              </h2>
              <label className="block">
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('form.displayName', {}, { defaultValue: 'Display name' })}
                </span>
                <input
                  type="text"
                  data-testid="settings-display-name"
                  value={prefs.display_name ?? ''}
                  onChange={(e) => updatePref('display_name', e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'w-full border border-outline-variant rounded-md',
                  )}
                />
              </label>
              <SubmitRow saving={saving} savedAt={savedAt} error={error} t={t} cm={cm} />
            </form>
          </>
        )}

        {!loading && section === 'preferences' && (
          <form
            onSubmit={savePrefs}
            data-testid="settings-preferences-form"
            className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('nav.preferences', {}, { defaultValue: 'Preferences' })}
            </h2>
            <label className="block">
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
              >
                {t('settings.preferences.currency', {}, { defaultValue: 'Quote currency' })}
              </span>
              <input
                type="text"
                data-testid="settings-quote-currency"
                value={prefs.quote_currency}
                onChange={(e) => updatePref('quote_currency', e.target.value.toUpperCase())}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'w-full border border-outline-variant rounded-md uppercase',
                )}
              />
            </label>
            <div data-testid="settings-locale" data-mol-id="settings-language">
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
              >
                {t('settings.preferences.locale', {}, { defaultValue: 'Locale' })}
              </span>
              <LanguagePicker />
            </div>
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

            <label className="block">
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
              >
                {t('settings.preferences.refresh', {}, { defaultValue: 'Price refresh (seconds)' })}
              </span>
              <input
                type="number"
                min="5"
                data-testid="settings-refresh"
                value={prefs.refresh_seconds}
                onChange={(e) => updatePref('refresh_seconds', Number(e.target.value))}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'w-full border border-outline-variant rounded-md tabular-nums',
                )}
              />
            </label>
            <fieldset className="space-y-2">
              <legend className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
              </legend>
              <Toggle
                label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                value={prefs.notify_email}
                onChange={(v) => updatePref('notify_email', v)}
                testId="settings-notify-email"
              />
              <Toggle
                label={t('settings.preferences.push', {}, { defaultValue: 'Push' })}
                value={prefs.notify_push}
                onChange={(v) => updatePref('notify_push', v)}
                testId="settings-notify-push"
              />
              <Toggle
                label={t('settings.preferences.sms', {}, { defaultValue: 'SMS' })}
                value={prefs.notify_sms}
                onChange={(v) => updatePref('notify_sms', v)}
                testId="settings-notify-sms"
              />
            </fieldset>
            <SubmitRow saving={saving} savedAt={savedAt} error={error} t={t} cm={cm} />
          </form>
        )}

        {!loading && section === 'api_keys' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.apiKeys.heading', {}, { defaultValue: 'Exchange API keys' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.apiKeys.body',
                {},
                {
                  defaultValue:
                    'Read-only keys to import transaction history. Connect via OAuth from /pricing once subscribed.',
                },
              )}
            </p>
            <ul className={cm.cn('space-y-2')}>
              {['Coinbase', 'Kraken', 'Binance.US'].map((ex) => (
                <li
                  key={ex}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 2),
                    'border-b border-outline-variant last:border-b-0',
                  )}
                >
                  <span>{ex}</span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'uppercase tracking-wide text-on-surface-variant',
                    )}
                  >
                    {t('settings.apiKeys.comingSoon', {}, { defaultValue: 'Coming soon' })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!loading && section === 'security' && (
          <>
            <SecurityAuthCard />
            <section
              className={cm.cn(cm.card(), cm.sp('p', 5))}
              data-mol-id="settings-push-notifications"
            >
              {/* Real browser push registration (requests permission + registers/
                  unregisters the push subscription via @molecule/app-push) — the
                  Preferences "Push" flag is only a server-side routing preference. */}
              <NotificationsSection />
            </section>
            <SecurityDevicesCard />
            <SecurityDangerCard />
          </>
        )}
      </main>
    </div>
  )
}

function SubmitRow({
  saving,
  savedAt,
  error,
  t,
  cm,
}: {
  saving: boolean
  savedAt: number | null
  error: string | null
  t: ReturnType<typeof useTranslation>['t']
  cm: ReturnType<typeof getClassMap>
}) {
  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('pt', 2))}>
      <button
        type="submit"
        data-testid="settings-save"
        disabled={saving}
        className={cm.cn(
          cm.sp('px', 5),
          cm.sp('py', 2),
          cm.fontWeight('semibold'),
          'bg-primary text-on-primary rounded-md disabled:opacity-50',
        )}
      >
        {saving
          ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
          : t('common.save', {}, { defaultValue: 'Save' })}
      </button>
      {error ? (
        <span className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}>{error}</span>
      ) : savedAt ? (
        <span data-testid="settings-saved" className={cm.cn(cm.textSize('sm'), 'text-success')}>
          {t('common.saved', {}, { defaultValue: 'Saved' })}
        </span>
      ) : null}
    </div>
  )
}

function Toggle({
  label,
  value,
  onChange,
  testId,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  testId?: string
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
      <input
        type="checkbox"
        data-testid={testId}
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className={cm.cn('h-4 w-4 rounded')}
      />
      <span className={cm.cn(cm.textSize('sm'))}>{label}</span>
    </label>
  )
}

interface AccountUser {
  id?: string
  email?: string | null
  name?: string | null
  oauthServer?: string | null
}

interface SettingsDevice {
  id: string
  name?: string | null
  platform?: string | null
  lastSeen?: string | null
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean
}

interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

/**
 * Account identity card — edit the signed-in user's email. PATCHes
 * `/api/users/:id` on blur and refreshes the auth cache so a reload
 * reflects the new value.
 */
function AccountEmailCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const authClient = useAuthClient<AccountUser>()
  const http = useHttpClient()

  const [email, setEmail] = useState(authClient.getState().user?.email ?? '')
  const [name, setName] = useState(authClient.getState().user?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Refresh the canonical user record so the field reflects the latest
  // server value; best-effort — the cached email remains the fallback.
  useEffect(() => {
    let cancelled = false
    http
      .get('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const data = unwrapSingle<AccountUser & { props?: AccountUser }>(res)
        const next = data?.props ?? data
        if (next?.id) {
          authClient.setUser(next)
          setEmail((curr) => curr || next.email || '')
          setName((curr) => curr || next.name || '')
        }
      })
      .catch(() => {
        // /api/users/me refresh is best-effort; the cached email stays shown.
      })
    return () => {
      cancelled = true
    }
  }, [http, authClient])

  const saveEmail = async () => {
    const current = authClient.getState().user
    if (!current?.id || !email || email === current.email) return
    setSaving(true)
    setError(null)
    try {
      await http.patch(`/api/users/${current.id}`, { email })
      authClient.setUser({ ...current, email })
      setSavedAt(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setEmail(current.email ?? '')
    } finally {
      setSaving(false)
    }
  }

  // The user resource's update handler accepts `name` — PATCH it on blur and
  // refresh the auth cache so a reload reflects the new display name.
  const saveName = async () => {
    const current = authClient.getState().user
    if (!current?.id || name === (current.name ?? '')) return
    setSaving(true)
    setError(null)
    try {
      await http.patch(`/api/users/${current.id}`, { name })
      authClient.setUser({ ...current, name })
      setSavedAt(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setName(current.name ?? '')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </h2>
        {saving ? <Spinner size="xs" /> : null}
      </div>
      <label className="block">
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
        >
          {t('settings.name', {}, { defaultValue: 'Name' })}
        </span>
        <Input
          type="text"
          testId="settings-name"
          value={name}
          onChange={(e) => setName((e.target as HTMLInputElement).value)}
          onBlur={saveName}
          autoComplete="name"
          size="sm"
        />
      </label>
      <label className="block">
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
        >
          {t('settings.email', {}, { defaultValue: 'Email' })}
        </span>
        <Input
          type="email"
          testId="settings-email"
          value={email}
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
          onBlur={saveEmail}
          autoComplete="email"
          size="sm"
        />
      </label>
      {error ? (
        <span className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}>{error}</span>
      ) : savedAt ? (
        <span
          data-testid="settings-email-saved"
          className={cm.cn(cm.textSize('sm'), 'text-success')}
        >
          {t('common.saved', {}, { defaultValue: 'Saved' })}
        </span>
      ) : null}
    </section>
  )
}

/**
 * Authentication card — change password (modal) + two-factor toggle.
 * Auto-hides for OAuth-only accounts since neither applies.
 */
function SecurityAuthCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<AccountUser>()
  const http = useHttpClient()
  const { status, error, changePassword, reset } = useChangePassword()

  const [showModal, setShowModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState('')

  // Read the persisted 2FA status from /api/users/me on mount.
  useEffect(() => {
    let cancelled = false
    http
      .get('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const data = unwrapSingle<
          AccountUser & { props?: { twoFactorEnabled?: boolean }; twoFactorEnabled?: boolean }
        >(res)
        const next = (data?.props ?? data) as { twoFactorEnabled?: boolean } | null
        setTwoFactorEnabled(Boolean(next?.twoFactorEnabled))
      })
      .catch(() => {
        // Status read is best-effort; defaults to disabled.
      })
    return () => {
      cancelled = true
    }
  }, [http])

  // OAuth-only accounts have no password / 2FA to manage.
  if (user?.oauthServer) return null

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await changePassword(currentPassword, newPassword)
      setShowModal(false)
      setCurrentPassword('')
      setNewPassword('')
      reset()
    } catch (_error) {
      // Failure is surfaced via the hook's `error` state inside the modal.
    }
  }

  const closeTf = () => {
    setTfModal(null)
    setTfSetup(null)
    setTfToken('')
    setTfError('')
  }

  // Enable → request a TOTP secret + QR (action:'setup'); the user then
  // scans it and submits a 6-digit code to confirm enrollment.
  const startEnable = async () => {
    if (!user?.id) return
    setTfError('')
    setTfLoading(true)
    setTfModal('enable')
    try {
      const res = await http.post(`/api/users/${user.id}/verify-two-factor`, { action: 'setup' })
      setTfSetup(unwrapSingle<TwoFactorSetup>(res))
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t(
              'settings.twoFactorUnavailable',
              {},
              {
                defaultValue: 'Two-factor authentication is not available for this app.',
              },
            ),
      )
    } finally {
      setTfLoading(false)
    }
  }

  // Confirm enable (action:'enable') or turn off (action:'disable') with a
  // current authenticator code. 200 = success, 403 = invalid code.
  const submitTf = async (action: 'enable' | 'disable') => {
    if (!user?.id) return
    setTfError('')
    setTfLoading(true)
    try {
      await http.post(`/api/users/${user.id}/verify-two-factor`, { action, token: tfToken })
      setTwoFactorEnabled(action === 'enable')
      closeTf()
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t('settings.twoFactorInvalidCode', {}, { defaultValue: 'Invalid code' }),
      )
    } finally {
      setTfLoading(false)
    }
  }

  return (
    <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('settings.authentication', {}, { defaultValue: 'Authentication' })}
      </h2>
      <div className="space-y-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowModal(true)}
          data-mol-id="settings-change-password"
        >
          {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
        </Button>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <span className={cm.textSize('sm')}>
            {t('settings.twoFactor', {}, { defaultValue: 'Two-factor authentication' })}
            {twoFactorEnabled ? (
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('ml', 2))}>
                {t('settings.twoFactorOn', {}, { defaultValue: 'On' })}
              </span>
            ) : null}
          </span>
          {twoFactorEnabled ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTfError('')
                setTfToken('')
                setTfModal('disable')
              }}
              data-mol-id="two-factor-disable"
            >
              {t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={startEnable}
              data-mol-id="two-factor-enable"
            >
              {t('settings.twoFactorEnable', {}, { defaultValue: 'Enable' })}
            </Button>
          )}
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false)
          reset()
        }}
        title={t('settings.changePasswordModal.title', {}, { defaultValue: 'Change password' })}
      >
        {error ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {error.message ||
              t(
                'settings.changePasswordModal.error',
                {},
                { defaultValue: 'Failed to change password.' },
              )}
          </Alert>
        ) : null}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <label className="block">
            <span
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
            >
              {t(
                'settings.changePasswordModal.currentPassword',
                {},
                { defaultValue: 'Current password' },
              )}
            </span>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
              autoComplete="current-password"
              required
            />
          </label>
          <label className="block">
            <span
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
            >
              {t('settings.changePasswordModal.newPassword', {}, { defaultValue: 'New password' })}
            </span>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
              autoComplete="new-password"
              required
            />
          </label>
          <Button type="submit" fullWidth loading={status === 'pending'}>
            {status === 'pending'
              ? t('settings.changePasswordModal.changing', {}, { defaultValue: 'Changing…' })
              : t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </Button>
        </form>
      </Modal>

      <Modal
        open={tfModal !== null}
        onClose={closeTf}
        title={
          tfModal === 'disable'
            ? t(
                'settings.twoFactorDisableTitle',
                {},
                {
                  defaultValue: 'Disable two-factor authentication',
                },
              )
            : t(
                'settings.twoFactorEnableTitle',
                {},
                {
                  defaultValue: 'Enable two-factor authentication',
                },
              )
        }
      >
        {tfError ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {tfError}
          </Alert>
        ) : null}
        {tfModal === 'enable' && tfSetup?.QRImageUrl ? (
          <div className={cm.cn('space-y-3', cm.sp('mb', 4))}>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.twoFactorScan',
                {},
                {
                  defaultValue:
                    'Scan this QR code with your authenticator app, then enter the 6-digit code.',
                },
              )}
            </p>
            <img
              src={tfSetup.QRImageUrl}
              alt={t('settings.twoFactorQrAlt', {}, { defaultValue: 'Two-factor QR code' })}
              className={cm.cn('mx-auto max-w-xs')}
            />
            {tfSetup.secret ? (
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant text-center break-all',
                )}
              >
                {tfSetup.secret}
              </p>
            ) : null}
          </div>
        ) : null}
        {tfModal === 'enable' && tfLoading && !tfSetup ? (
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('py', 6))}>
            <Spinner size="sm" />
          </div>
        ) : null}
        {tfModal === 'disable' || tfSetup ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submitTf(tfModal === 'disable' ? 'disable' : 'enable')
            }}
            className="space-y-4"
          >
            <label className="block">
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
              >
                {t('settings.twoFactorCode', {}, { defaultValue: 'Authentication code' })}
              </span>
              <Input
                type="text"
                value={tfToken}
                onChange={(e) => setTfToken((e.target as HTMLInputElement).value)}
                autoComplete="one-time-code"
                required
              />
            </label>
            <Button
              type="submit"
              color={tfModal === 'disable' ? 'error' : undefined}
              fullWidth
              loading={tfLoading}
            >
              {tfModal === 'disable'
                ? t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })
                : t('settings.twoFactorVerify', {}, { defaultValue: 'Verify & enable' })}
            </Button>
          </form>
        ) : null}
      </Modal>
    </section>
  )
}

/**
 * Devices card — lists the user's registered devices (GET /api/devices) and
 * lets the user revoke (sign out) any device other than the current one.
 *
 * Revoking deletes the device row (DELETE /api/devices/:id); the API's
 * authorization layer enforces server-side session revocation, so the removed
 * device is actually signed out — not just hidden from the list. The current
 * device (`isCurrent`) is labelled "This device" and is not revocable here
 * (use Sign out for the current session). Recreates molecule v1's behaviour.
 */
function SecurityDevicesCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [devices, setDevices] = useState<SettingsDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await http.get('/api/devices')
      setDevices(unwrapList<SettingsDevice>(res))
    } catch (_error) {
      // Devices endpoint is optional; the card renders empty when unavailable.
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void load()
  }, [load])

  const revoke = async (id: string) => {
    setRevokingId(id)
    try {
      await http.delete(`/api/devices/${id}`)
      setConfirmingId(null)
      await load()
    } catch (_error) {
      // Best-effort — keep the row so the user can retry the revoke.
    } finally {
      setRevokingId(null)
    }
  }

  const trailing = (device: SettingsDevice) => {
    if (device.isCurrent) {
      return (
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t('settings.thisDevice', {}, { defaultValue: 'This device' })}
        </span>
      )
    }
    if (confirmingId === device.id) {
      return (
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <Button
            variant="ghost"
            size="sm"
            disabled={revokingId === device.id}
            onClick={() => setConfirmingId(null)}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </Button>
          <Button
            color="error"
            size="sm"
            loading={revokingId === device.id}
            onClick={() => revoke(device.id)}
            data-mol-id="device-revoke-confirm"
          >
            {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
          </Button>
        </div>
      )
    }
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirmingId(device.id)}
        data-mol-id="device-revoke"
      >
        {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
      </Button>
    )
  }

  return (
    <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t('settings.devices', {}, { defaultValue: 'Devices' })}
        </h2>
        {loading ? <Spinner size="xs" /> : null}
      </div>
      {devices.length > 0 ? (
        <ul className="space-y-2">
          {devices.map((device) => (
            <li
              key={device.id}
              className={cm.cn(cm.sp('py', 2), 'border-b border-outline-variant last:border-b-0')}
            >
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <span className={cm.textSize('sm')}>
                  {device.name ||
                    device.platform ||
                    t('settings.unknown', {}, { defaultValue: 'Unknown device' })}
                  {device.platform && device.name ? (
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'uppercase tracking-wide text-on-surface-variant',
                        cm.sp('ml', 2),
                      )}
                    >
                      {device.platform}
                    </span>
                  ) : null}
                </span>
                {trailing(device)}
              </div>
              {confirmingId === device.id ? (
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                  {t(
                    'settings.revokeDeviceWarning',
                    {},
                    {
                      defaultValue: "This device's access will be revoked shortly. Sign it out?",
                    },
                  )}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : !loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('settings.noDevices', {}, { defaultValue: 'No devices registered.' })}
        </p>
      ) : null}
    </section>
  )
}

/**
 * Danger zone — delete account. Confirms the user's password, DELETEs
 * `/api/users/:id`, signs out, and returns to /login.
 */
function SecurityDangerCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth<AccountUser>()
  const http = useHttpClient()

  const [showModal, setShowModal] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      await http.delete(`/api/users/${user.id}`, { data: { password } })
      await logout()
      navigate('/login')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.failedToDeleteAccount', {}, { defaultValue: 'Failed to delete account.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
      </h2>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t(
          'settings.deleteAccountModal.warning',
          {},
          {
            defaultValue:
              'This permanently deletes your account and all associated data. This cannot be undone.',
          },
        )}
      </p>
      <Button
        color="error"
        variant="outline"
        size="sm"
        onClick={() => setShowModal(true)}
        data-mol-id="settings-delete-account"
      >
        {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
      </Button>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false)
          setError(null)
        }}
        title={t('settings.deleteAccountModal.title', {}, { defaultValue: 'Delete account' })}
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 4))}>
          {t(
            'settings.deleteAccountModal.warning',
            {},
            {
              defaultValue:
                'This permanently deletes your account and all associated data. This cannot be undone.',
            },
          )}
        </p>
        {error ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {error}
          </Alert>
        ) : null}
        <form onSubmit={handleDelete} className="space-y-4">
          <label className="block">
            <span
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
            >
              {t(
                'settings.deleteAccountModal.password',
                {},
                { defaultValue: 'Confirm your password' },
              )}
            </span>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
              autoComplete="current-password"
              required
            />
          </label>
          <Button type="submit" color="error" fullWidth loading={loading}>
            {loading
              ? t('settings.deleteAccountModal.deleting', {}, { defaultValue: 'Deleting…' })
              : t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
          </Button>
        </form>
      </Modal>
    </section>
  )
}
