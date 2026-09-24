/**
 * Settings — profile load/save against /api/profile/me, preferences
 * persisted via PATCH /api/profile/me preferences key (the molecule
 * profile endpoint stores it under `oauthData.preferences`).
 *
 * Security tab: change password (PATCH /api/users/:id/password) and a
 * link to billing.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton, LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { authClient } from '../bonds/index.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface ProfileMe {
  user: {
    id: string
    email: string | null
    name: string | null
    initial: string | null
    preferences: Record<string, unknown>
  }
  plan: {
    planKey: string
    name: string
    isFree: boolean
  }
  counts: {
    eventTypes: number
    bookings: number
    upcomingBookings: number
  }
}

const TABS = [
  { key: 'profile', label: 'Profile', icon: 'person' },
  { key: 'preferences', label: 'Preferences', icon: 'tune' },
  { key: 'security', label: 'Security', icon: 'shield' },
] as const

const PREFERENCE_KEYS = [
  {
    key: 'requireConfirmation',
    defaultLabel: 'Require my confirmation before bookings are final',
    initial: false,
  },
  {
    key: 'allowReschedule',
    defaultLabel: 'Let invitees reschedule up to 1 hour before',
    initial: true,
  },
  {
    key: 'brandedConfirmation',
    defaultLabel: 'Branded confirmation emails',
    initial: true,
  },
] as const

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('profile')
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local', [])

  const [profile, setProfile] = useState<ProfileMe | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [preferences, setPreferences] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PREFERENCE_KEYS.map((p) => [p.key, p.initial])),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSavedAt, setPwdSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get<ProfileMe>('/api/profile/me')
      .then((res) => {
        if (cancelled) return
        const data = unwrapSingle<ProfileMe>(res)
        if (!data) {
          setError(t('settings.loadError', {}, { defaultValue: 'Could not load your profile.' }))
          return
        }
        setProfile(data)
        setName(data.user.name ?? '')
        setEmail(data.user.email ?? '')
        setPreferences((prev) => ({
          ...prev,
          ...Object.fromEntries(
            PREFERENCE_KEYS.map((p) => [
              p.key,
              typeof data.user.preferences?.[p.key] === 'boolean'
                ? (data.user.preferences[p.key] as boolean)
                : prev[p.key],
            ]),
          ),
        }))
      })
      .catch(() => {
        if (cancelled) return
        setError(t('settings.loadError', {}, { defaultValue: 'Could not load your profile.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      // Merge over the full stored preferences object — PATCH replaces it
      // wholesale, and other pages (Integrations, Notifications) persist
      // their own keys into the same object.
      const res = await http.patch<ProfileMe['user']>('/api/profile/me', {
        name,
        email,
        preferences: { ...(profile?.user.preferences ?? {}), ...preferences },
      })
      const next = unwrapSingle<ProfileMe['user']>(res)
      if (next) {
        setProfile((prev) => (prev ? { ...prev, user: { ...prev.user, ...next } } : prev))
        setName(next.name ?? '')
        setEmail(next.email ?? '')
      }
      setSavedAt(new Date())
    } catch (err) {
      const status = (err as { response?: { data?: { error?: string } } })?.response
      setSaveError(
        status?.data?.error ??
          t('common.couldNotSaveChanges', {}, { defaultValue: 'Could not save changes.' }),
      )
    } finally {
      setSaving(false)
    }
  }, [http, name, email, preferences, profile, t, saving])

  const handlePasswordChange = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!profile?.user?.id) return
      if (newPwd.length < 8) {
        setPwdError(
          t(
            'settings.security.weakPassword',
            {},
            {
              defaultValue: 'New password must be at least 8 characters.',
            },
          ),
        )
        return
      }
      setPwdSaving(true)
      setPwdError(null)
      try {
        await http.patch(`/api/users/${encodeURIComponent(profile.user.id)}/password`, {
          currentPassword: currentPwd,
          newPassword: newPwd,
        })
        setCurrentPwd('')
        setNewPwd('')
        setPwdSavedAt(new Date())
      } catch (err) {
        const status = (err as { response?: { data?: { error?: string } } })?.response
        setPwdError(
          status?.data?.error ??
            t(
              'settings.security.passwordError',
              {},
              {
                defaultValue:
                  'Could not change password — check your current password and try again.',
              },
            ),
        )
      } finally {
        setPwdSaving(false)
      }
    },
    [http, profile, currentPwd, newPwd, t],
  )

  const handleSignOutEverywhere = useCallback(async () => {
    try {
      await authClient.logout?.()
    } finally {
      window.location.href = '/login'
    }
  }, [])

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('p', 8), 'max-w-[1200px] mx-auto')}>
      <header className={cm.stack(2)}>
        <p className={cm.cn(cm.textSize('xs'), 'font-bold uppercase tracking-widest text-primary')}>
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
      </header>

      {error ? (
        <p
          role="alert"
          data-testid="settings-error"
          className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
        >
          {error}
        </p>
      ) : null}

      <section className={cm.cn(cm.grid({ gap: 'xl' }), 'grid-cols-1 lg:grid-cols-12 items-start')}>
        <aside
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            cm.sp('p', 4),
            'gap-1 lg:col-span-3 bg-surface-container-lowest rounded-3xl shadow-sm sticky top-8',
          )}
        >
          {TABS.map((tabDef) => (
            <button
              key={tabDef.key}
              type="button"
              data-testid={`settings-tab-${tabDef.key}`}
              onClick={() => setTab(tabDef.key)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl text-left transition-colors',
                tab === tabDef.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
              )}
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                {tabDef.icon}
              </span>
              {t(`settings.tab.${tabDef.key}`, {}, { defaultValue: tabDef.label })}
            </button>
          ))}
          <Link
            to="/settings/billing"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-xl text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              credit_card
            </span>
            {t('settings.tab.billing', {}, { defaultValue: 'Billing' })}
          </Link>
        </aside>

        <div className={cm.cn(cm.stack(6), 'lg:col-span-9')}>
          {loading ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('nav.loadingProfile', {}, { defaultValue: 'Loading profile…' })}
            </p>
          ) : tab === 'profile' ? (
            <div
              className={cm.cn(
                cm.sp('p', 8),
                cm.stack(5),
                'bg-surface-container-lowest rounded-3xl shadow-sm',
              )}
            >
              <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
                {t('nav.profile', {}, { defaultValue: 'Profile' })}
              </h2>
              <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
                <label className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('form.fullName', {}, { defaultValue: 'Full name' })}
                  </span>
                  <input
                    data-testid="settings-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none',
                    )}
                  />
                </label>
                <label className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                  </span>
                  <input
                    data-testid="settings-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none',
                    )}
                  />
                </label>
                <div className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('form.timezone', {}, { defaultValue: 'Timezone' })}
                  </span>
                  <p
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'bg-surface rounded-xl border border-outline-variant text-on-surface-variant',
                    )}
                  >
                    {tz}
                  </p>
                </div>
                {profile?.plan ? (
                  <div className={cm.stack(2)}>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'font-bold uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('nav.plan', {}, { defaultValue: 'Plan' })}
                    </span>
                    <p
                      data-testid="settings-plan"
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.fontWeight('semibold'),
                        cm.textSize('sm'),
                        'bg-surface rounded-xl border border-outline-variant',
                      )}
                    >
                      {profile.plan.name}
                    </p>
                  </div>
                ) : null}
              </div>
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <button
                  type="button"
                  data-testid="settings-save"
                  onClick={handleSave}
                  disabled={saving}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'bg-primary text-on-primary rounded-full disabled:opacity-50',
                  )}
                >
                  {saving
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                </button>
                {savedAt ? (
                  <span
                    data-testid="settings-saved-at"
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-success font-bold uppercase tracking-widest',
                    )}
                  >
                    {t(
                      'common.savedAt',
                      { time: savedAt.toLocaleTimeString() },
                      {
                        defaultValue: 'Saved at {{time}}',
                      },
                    )}
                  </span>
                ) : null}
                {saveError ? (
                  <span
                    role="alert"
                    data-testid="settings-save-error"
                    className={cm.cn(cm.textSize('xs'), 'text-error font-bold')}
                  >
                    {saveError}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {tab === 'preferences' ? (
            <div
              className={cm.cn(
                cm.sp('p', 8),
                cm.stack(5),
                'bg-surface-container-lowest rounded-3xl shadow-sm',
              )}
            >
              <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
                {t('settings.preferences.heading', {}, { defaultValue: 'Booking defaults' })}
              </h2>
              <div
                className={cm.cn(
                  cm.stack(3),
                  cm.sp('p', 4),
                  'bg-surface rounded-xl border border-outline-variant',
                )}
              >
                <h3
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'tracking-tight text-on-surface',
                  )}
                >
                  {t('footer.language', {}, { defaultValue: 'Language' })}
                </h3>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'common.chooseTheLanguage',
                    {},
                    { defaultValue: 'Choose the language used throughout the app.' },
                  )}
                </p>
                <LanguagePicker />
              </div>
              {PREFERENCE_KEYS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  data-testid={`pref-${p.key}`}
                  onClick={() => setPreferences((prev) => ({ ...prev, [p.key]: !prev[p.key] }))}
                  aria-pressed={preferences[p.key]}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('p', 4),
                    cm.w('full'),
                    'gap-4 bg-surface rounded-xl border border-outline-variant text-left hover:border-primary/40 transition-colors',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-on-surface',
                    )}
                  >
                    {t(`settings.preferences.${p.key}`, {}, { defaultValue: p.defaultLabel })}
                  </span>
                  <span
                    className={cm.cn(
                      cm.w(10),
                      'h-6 rounded-full relative transition-colors',
                      preferences[p.key] ? 'bg-primary' : 'bg-outline-variant',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.w(5),
                        cm.h(5),
                        cm.roundedFull,
                        'absolute top-0.5 bg-white shadow-sm transition-transform',
                        preferences[p.key] ? 'translate-x-4' : 'translate-x-0.5',
                      )}
                    />
                  </span>
                </button>
              ))}
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <button
                  type="button"
                  data-testid="settings-save-prefs"
                  onClick={handleSave}
                  disabled={saving}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'bg-primary text-on-primary rounded-full disabled:opacity-50',
                  )}
                >
                  {saving
                    ? t('settings.saving', {}, { defaultValue: 'Saving…' })
                    : t('settings.save', {}, { defaultValue: 'Save preferences' })}
                </button>
                {savedAt ? (
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-success font-bold uppercase tracking-widest',
                    )}
                  >
                    {t(
                      'common.savedAt',
                      { time: savedAt.toLocaleTimeString() },
                      {
                        defaultValue: 'Saved at {{time}}',
                      },
                    )}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {tab === 'security' ? (
            <div
              className={cm.cn(
                cm.sp('p', 8),
                cm.stack(5),
                'bg-surface-container-lowest rounded-3xl shadow-sm',
              )}
            >
              <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
                {t('nav.security', {}, { defaultValue: 'Security' })}
              </h2>
              <form onSubmit={handlePasswordChange} className={cm.stack(3)}>
                <label className={cm.stack(1)}>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('settings.security.currentPwd', {}, { defaultValue: 'Current password' })}
                  </span>
                  <input
                    type="password"
                    data-testid="security-current-pwd"
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    autoComplete="current-password"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none',
                    )}
                  />
                </label>
                <label className={cm.stack(1)}>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('settings.security.newPwd', {}, { defaultValue: 'New password' })}
                  </span>
                  <input
                    type="password"
                    data-testid="security-new-pwd"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none',
                    )}
                  />
                </label>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <button
                    type="submit"
                    data-testid="security-change-pwd"
                    disabled={pwdSaving || !currentPwd || newPwd.length < 8}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'bg-primary text-on-primary rounded-full disabled:opacity-50',
                    )}
                  >
                    {pwdSaving
                      ? t('common.updatingEllipsis', {}, { defaultValue: 'Updating…' })
                      : t(
                          'auth.resetPassword.updatePassword',
                          {},
                          { defaultValue: 'Update password' },
                        )}
                  </button>
                  {pwdSavedAt ? (
                    <span
                      data-testid="security-saved-at"
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-success font-bold uppercase tracking-widest',
                      )}
                    >
                      {t(
                        'settings.security.savedAt',
                        { time: pwdSavedAt.toLocaleTimeString() },
                        {
                          defaultValue: 'Updated at {{time}}',
                        },
                      )}
                    </span>
                  ) : null}
                  {pwdError ? (
                    <span
                      role="alert"
                      data-testid="security-error"
                      className={cm.cn(cm.textSize('xs'), 'text-error font-bold')}
                    >
                      {pwdError}
                    </span>
                  ) : null}
                </div>
              </form>
              <ConfirmButton
                label={t('settings.logOut', {}, { defaultValue: 'Sign out' })}
                confirmLabel={t(
                  'settings.security.confirmSignOut',
                  {},
                  { defaultValue: 'Sign out from this device? You will be redirected to login.' },
                )}
                onConfirm={handleSignOutEverywhere}
                disarmSeconds={6}
                className="self-start"
                data-mol-id="security-sign-out"
              />
            </div>
          ) : null}
        </div>
      </section>
      <section
        className={cm.cn(cm.sp('p', 8), 'bg-surface-container-lowest rounded-3xl shadow-sm')}
      >
        <div className={cm.sp('mb', 6)}>
          <h3 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
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
  )
}

export default Settings
