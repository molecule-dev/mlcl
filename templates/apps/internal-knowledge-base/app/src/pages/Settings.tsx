import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, Switch, ThemeToggle } from '@molecule/app-ui-react'

import { unwrapSingle } from '../lib/unwrap.js'

interface ToggleSetting {
  key: string
  defaultLabel: string
  defaultDescription: string
  defaultValue: boolean
}

const NOTIFICATIONS: ToggleSetting[] = [
  {
    key: 'mentions',
    defaultLabel: 'Mentions',
    defaultDescription: 'Email me when I am @mentioned in an article or comment.',
    defaultValue: true,
  },
  {
    key: 'reviewRequests',
    defaultLabel: 'Review requests',
    defaultDescription: 'Tell me when an editor asks me to review a draft.',
    defaultValue: true,
  },
  {
    key: 'comments',
    defaultLabel: 'Comments on my articles',
    defaultDescription: 'Email me when someone comments on something I wrote.',
    defaultValue: true,
  },
  {
    key: 'pageChanges',
    defaultLabel: 'Page changes',
    defaultDescription: 'Notify me when an article I authored is edited by someone else.',
    defaultValue: false,
  },
  {
    key: 'digest',
    defaultLabel: 'Weekly digest',
    defaultDescription: 'A Monday-morning summary of what moved across the workspace.',
    defaultValue: true,
  },
]

const READING: ToggleSetting[] = [
  {
    key: 'serif',
    defaultLabel: 'Serif body',
    defaultDescription: 'Render article bodies in Georgia for long-form readability.',
    defaultValue: true,
  },
  {
    key: 'tocAuto',
    defaultLabel: 'Auto-generated TOC',
    defaultDescription: 'Build a sticky table of contents from H2/H3 headings.',
    defaultValue: true,
  },
  {
    key: 'codeMono',
    defaultLabel: 'Monospace code blocks',
    defaultDescription: 'JetBrains Mono for code, on a dark surface.',
    defaultValue: true,
  },
  {
    key: 'darkMode',
    defaultLabel: 'Match system theme',
    defaultDescription: 'Switch between light and dark to match your OS.',
    defaultValue: true,
  },
]

interface MeProps {
  id: string
  name: string | null
  email: string
  twoFactorEnabled?: boolean
}

interface MeResponse {
  props: MeProps
}

interface Preferences {
  notifications: Record<string, boolean>
  reading: Record<string, boolean>
}

function defaultPreferences(): Preferences {
  return {
    notifications: Object.fromEntries(NOTIFICATIONS.map((n) => [n.key, n.defaultValue])),
    reading: Object.fromEntries(READING.map((n) => [n.key, n.defaultValue])),
  }
}

function readPreferences(raw: unknown): Preferences {
  const defaults = defaultPreferences()
  if (!raw || typeof raw !== 'object') return defaults
  const p = raw as { notifications?: Record<string, boolean>; reading?: Record<string, boolean> }
  return {
    notifications: { ...defaults.notifications, ...(p.notifications ?? {}) },
    reading: { ...defaults.reading, ...(p.reading ?? {}) },
  }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { logout, user, setUser } = useAuth<MeProps>()
  // Seed from the already-restored auth user (populated during session
  // restore before this page mounts) so the switches render their persisted
  // state on first paint — the freshly-mounted fetches below would otherwise
  // leave them at defaults for a beat after a reload.
  const initialMe = user ?? null
  const [me, setMe] = useState<MeProps | null>(initialMe)
  const [prefs, setPrefs] = useState<Preferences>(defaultPreferences)
  const [nameDraft, setNameDraft] = useState(initialMe?.name ?? '')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSuccess, setNameSuccess] = useState(false)
  const [emailDraft, setEmailDraft] = useState(initialMe?.email ?? '')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState(false)
  // Email is the account-recovery anchor, so the backend refuses to change it
  // without re-authentication: the PATCH must carry `currentPassword`. Blur
  // opens the confirm modal instead of firing the request directly.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [twoFactorModal, setTwoFactorModal] = useState<null | 'enable' | 'disable'>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get('/users/me')
      .then((res) => {
        if (cancelled) return
        const u = unwrapSingle<MeResponse>(res)
        if (!u?.props) return
        setMe(u.props)
        setNameDraft(u.props.name ?? '')
        setEmailDraft(u.props.email ?? '')
      })
      .catch(() => {})
    // Preferences live in an app-owned server-side slice — the platform
    // user resource never returns `oauthData`, so PATCH /users/:id cannot
    // persist them. GET /settings returns the stored slice ({} when the
    // user has never saved); the client merges over its defaults.
    http
      .get('/settings')
      .then((res) => {
        if (cancelled) return
        const slice = (res as { data?: { preferences?: unknown } }).data ?? {}
        setPrefs(readPreferences(slice.preferences))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http])

  const persistPreferences = async (next: Preferences) => {
    const previous = prefs
    setPrefs(next)
    try {
      // Server-side merge: PATCH the changed slice, adopt the merged result.
      const res = await http.patch<{ preferences?: unknown }>('/settings', {
        notifications: next.notifications,
        reading: next.reading,
      })
      const merged = (res as { data?: { preferences?: unknown } }).data?.preferences
      if (merged) setPrefs(readPreferences(merged))
    } catch (_error) {
      // Revert on failure
      setPrefs(previous)
    }
  }

  const persistName = async () => {
    if (!me || nameSaving) return
    if (nameDraft === (me.name ?? '')) return
    setNameError(null)
    setNameSuccess(false)
    setNameSaving(true)
    try {
      await http.patch(`/users/${me.id}`, { name: nameDraft })
      const updated = { ...me, name: nameDraft }
      setMe(updated)
      setUser(updated)
      setNameSuccess(true)
    } catch (err) {
      setNameError(
        err instanceof Error
          ? err.message
          : t('settings.name.updateFailed', {}, { defaultValue: 'Could not update name' }),
      )
      setNameDraft(me.name ?? '')
    } finally {
      setNameSaving(false)
    }
  }

  const persistEmail = () => {
    if (!me || emailSaving) return
    const next = emailDraft.trim()
    if (!next || next === me.email) return
    setEmailError(null)
    setEmailSuccess(false)
    // The backend's re-auth gate (email is the recovery anchor) requires
    // `currentPassword` on the PATCH, so collect it in a modal first.
    setPendingEmail(next)
  }

  const commitEmail = async (currentPassword: string): Promise<boolean> => {
    if (!me || !pendingEmail) return false
    setEmailSaving(true)
    setEmailError(null)
    try {
      await http.patch(`/users/${me.id}`, { email: pendingEmail, currentPassword })
      setMe({ ...me, email: pendingEmail })
      setEmailDraft(pendingEmail)
      setPendingEmail(null)
      setEmailSuccess(true)
      return true
    } catch (err) {
      setEmailError(
        err instanceof Error
          ? err.message
          : t('settings.email.updateFailed', {}, { defaultValue: 'Could not update email' }),
      )
      return false
    } finally {
      setEmailSaving(false)
    }
  }

  const twoFactorEnabled = Boolean(me?.twoFactorEnabled)

  const headerSubtitle = useMemo(() => {
    return t(
      'settings.subtitle',
      {},
      { defaultValue: 'Tune notifications, the reading canvas, and your account.' },
    )
  }, [t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'mx-auto w-full max-w-3xl space-y-8')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('extrabold'),
            'uppercase tracking-widest text-secondary',
          )}
        >
          {t('settings.eyebrow', {}, { defaultValue: 'Workspace preferences' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 1),
            cm.textSize('3xl'),
            cm.fontWeight('extrabold'),
            'tracking-tight',
          )}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
          {headerSubtitle}
        </p>
      </header>

      <SettingsSection
        title={t('settings.account', {}, { defaultValue: 'Account' })}
        description={t('settings.account.description', {}, { defaultValue: 'How you sign in.' })}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('py', 3),
          )}
        >
          <div className={cm.cn('min-w-0 flex-1')}>
            <label
              htmlFor="settings-name"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('extrabold'),
                'block text-on-surface',
              )}
            >
              {t('settings.name', {}, { defaultValue: 'Name' })}
            </label>
            <input
              id="settings-name"
              type="text"
              value={nameDraft}
              disabled={nameSaving || !me}
              autoComplete="name"
              onChange={(e) => {
                setNameSuccess(false)
                setNameDraft(e.target.value)
              }}
              onBlur={persistName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void persistName()
                }
              }}
              className={cm.cn(
                cm.sp('mt', 2),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'w-full rounded-lg border border-outline bg-surface text-on-surface',
              )}
            />
            {nameError ? (
              <p role="alert" className={cm.cn(cm.sp('mt', 1), cm.textSize('xs'), 'text-error')}>
                {nameError}
              </p>
            ) : null}
            {nameSuccess ? (
              <p className={cm.cn(cm.sp('mt', 1), cm.textSize('xs'), 'text-success')}>
                {t('settings.name.saved', {}, { defaultValue: 'Name updated.' })}
              </p>
            ) : null}
          </div>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('py', 3),
          )}
        >
          <div className={cm.cn('min-w-0 flex-1')}>
            <label
              htmlFor="settings-email"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('extrabold'),
                'block text-on-surface',
              )}
            >
              {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            </label>
            <input
              id="settings-email"
              type="email"
              value={emailDraft}
              disabled={emailSaving || !me}
              onChange={(e) => {
                setEmailSuccess(false)
                setEmailDraft(e.target.value)
              }}
              onBlur={persistEmail}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void persistEmail()
                }
              }}
              className={cm.cn(
                cm.sp('mt', 2),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'w-full rounded-lg border border-outline bg-surface text-on-surface',
              )}
            />
            {emailError ? (
              <p role="alert" className={cm.cn(cm.sp('mt', 1), cm.textSize('xs'), 'text-error')}>
                {emailError}
              </p>
            ) : null}
            {emailSuccess ? (
              <p className={cm.cn(cm.sp('mt', 1), cm.textSize('xs'), 'text-success')}>
                {t('settings.email.saved', {}, { defaultValue: 'Email updated.' })}
              </p>
            ) : null}
          </div>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('py', 3),
          )}
        >
          <div className={cm.cn('min-w-0 flex-1')}>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('extrabold'), 'text-on-surface')}>
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </p>
            <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
              {'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'rounded-full border border-outline text-on-surface hover:bg-surface-container',
            )}
          >
            {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </button>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('py', 3),
          )}
        >
          <div className={cm.cn('min-w-0 flex-1')}>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('extrabold'), 'text-on-surface')}>
              {t('settings.twoFactor', {}, { defaultValue: 'Two-factor authentication' })}
            </p>
            <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
              {twoFactorEnabled
                ? t('settings.twofa.enabled', {}, { defaultValue: 'Enabled' })
                : t('settings.twofa.disabled', {}, { defaultValue: 'Disabled' })}
            </p>
          </div>
          <button
            type="button"
            disabled={!me}
            onClick={() => setTwoFactorModal(twoFactorEnabled ? 'disable' : 'enable')}
            data-mol-id="two-factor-toggle"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'rounded-full border border-outline text-on-surface hover:bg-surface-container disabled:opacity-50',
            )}
          >
            {twoFactorEnabled
              ? t('settings.twofa.disable', {}, { defaultValue: 'Disable' })
              : t('settings.twofa.enable', {}, { defaultValue: 'Enable' })}
          </button>
        </div>
      </SettingsSection>

      <SettingsSection
        title={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        description={t(
          'settings.notifications.description',
          {},
          { defaultValue: 'Choose what reaches your inbox.' },
        )}
      >
        {NOTIFICATIONS.map((n) => (
          <ToggleRow
            key={n.key}
            label={t(`settings.notifications.${n.key}.label`, {}, { defaultValue: n.defaultLabel })}
            description={t(
              `settings.notifications.${n.key}.description`,
              {},
              { defaultValue: n.defaultDescription },
            )}
            value={prefs.notifications[n.key] ?? n.defaultValue}
            onChange={(v) =>
              persistPreferences({
                ...prefs,
                notifications: { ...prefs.notifications, [n.key]: v },
              })
            }
          />
        ))}
      </SettingsSection>

      <SettingsSection
        title={t('settings.reading.title', {}, { defaultValue: 'Reading & writing' })}
        description={t(
          'settings.reading.description',
          {},
          { defaultValue: 'How articles render for you.' },
        )}
      >
        {READING.map((n) => (
          <ToggleRow
            key={n.key}
            label={t(`settings.reading.${n.key}.label`, {}, { defaultValue: n.defaultLabel })}
            description={t(
              `settings.reading.${n.key}.description`,
              {},
              { defaultValue: n.defaultDescription },
            )}
            value={prefs.reading[n.key] ?? n.defaultValue}
            onChange={(v) =>
              persistPreferences({ ...prefs, reading: { ...prefs.reading, [n.key]: v } })
            }
          />
        ))}
      </SettingsSection>

      <SettingsSection
        title={t('settings.language.title', {}, { defaultValue: 'Language' })}
        description={t(
          'common.chooseTheLanguage',
          {},
          { defaultValue: 'Choose the language used throughout the app.' },
        )}
      >
        <div className={cm.cn(cm.sp('py', 2))}>
          <LanguagePicker />
        </div>
      </SettingsSection>

      <SettingsSection
        title={t('nav.appearance', {}, { defaultValue: 'Appearance' })}
        description={t(
          'common.toggleLightDark',
          {},
          { defaultValue: 'Toggle between light and dark mode.' },
        )}
      >
        <div className={cm.cn(cm.sp('py', 2))}>
          <ThemeToggle />
        </div>
      </SettingsSection>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl border-l-4 border-l-error bg-error/5 ring-1 ring-error/20',
        )}
      >
        <h2 className={cm.cn(cm.fontWeight('extrabold'), 'text-error')}>
          {t('nav.dangerZone', {}, { defaultValue: 'Danger zone' })}
        </h2>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.danger.description',
            {},
            {
              defaultValue:
                'Deleting your workspace removes all articles, comments, and version history. There is no recovery.',
            },
          )}
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className={cm.cn(
            cm.sp('mt', 4),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('extrabold'),
            cm.textSize('sm'),
            'rounded-full bg-error text-white shadow-sm transition-transform hover:-translate-y-0.5',
          )}
        >
          {t('settings.danger.action', {}, { defaultValue: 'Delete workspace' })}
        </button>
      </section>

      {showPasswordModal && me ? (
        <PasswordModal userId={me.id} onClose={() => setShowPasswordModal(false)} />
      ) : null}

      {pendingEmail && me ? (
        <EmailConfirmModal
          pendingEmail={pendingEmail}
          saving={emailSaving}
          error={emailError}
          onClose={() => {
            setPendingEmail(null)
            setEmailDraft(me.email)
          }}
          onConfirm={commitEmail}
        />
      ) : null}

      {twoFactorModal && me ? (
        <TwoFactorModal
          userId={me.id}
          mode={twoFactorModal}
          onClose={() => setTwoFactorModal(null)}
          onSuccess={(enabled) => {
            const updated = { ...me, twoFactorEnabled: enabled }
            setMe(updated)
            setUser(updated)
            setTwoFactorModal(null)
          }}
        />
      ) : null}

      {showDeleteModal && me ? (
        <DeleteModal
          userId={me.id}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={async () => {
            try {
              await logout()
            } catch (_error) {
              // logout failure is non-fatal here; navigate to /login regardless
            }
            navigate('/login')
          }}
        />
      ) : null}
    </div>
  )
}

interface SectionProps {
  title: string
  description: string
  children: React.ReactNode
}

function SettingsSection({ title, description, children }: SectionProps) {
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant',
      )}
    >
      <header className={cm.cn(cm.sp('pb', 4), 'border-b border-outline-variant')}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('extrabold'))}>{title}</h2>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
          {description}
        </p>
      </header>
      <div className={cm.cn(cm.sp('mt', 4), 'space-y-1')}>{children}</div>
    </section>
  )
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }), cm.sp('py', 3))}
    >
      <div className={cm.cn('min-w-0 flex-1')}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('extrabold'), 'text-on-surface')}>
          {label}
        </p>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
          {description}
        </p>
      </div>
      <Switch
        aria-label={label}
        checked={value}
        onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
      />
    </div>
  )
}

function PasswordModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (newPassword.length < 8) {
      setError(
        t(
          'settings.password.tooShort',
          {},
          { defaultValue: 'New password must be at least 8 characters.' },
        ),
      )
      return
    }
    if (newPassword !== confirm) {
      setError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setBusy(true)
    try {
      await http.patch(`/users/${userId}/password`, { currentPassword: oldPassword, newPassword })
      setDone(true)
      setTimeout(onClose, 1500)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.password.changeFailed', {}, { defaultValue: 'Could not change password' }),
      )
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      role="presentation"
      className={cm.cn('fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('settings.changePassword', {}, { defaultValue: 'Change password' })}
        className={cm.cn(
          cm.sp('p', 6),
          'w-full max-w-md space-y-4 rounded-2xl bg-surface ring-1 ring-outline-variant',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('extrabold'))}>
          {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
        </h2>
        {done ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-success')}>
            {t('auth.resetPassword.passwordUpdated', {}, { defaultValue: 'Password updated.' })}
          </p>
        ) : (
          <form onSubmit={submit} className={cm.cn('space-y-3')}>
            <Field
              id="settings-old-password"
              label={t('settings.password.current', {}, { defaultValue: 'Current password' })}
              type="password"
              autoComplete="current-password"
              value={oldPassword}
              onChange={setOldPassword}
            />
            <Field
              id="settings-new-password"
              label={t('settings.password.new', {}, { defaultValue: 'New password' })}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={setNewPassword}
            />
            <Field
              id="settings-confirm-password"
              label={t(
                'auth.signup.confirmNewPassword',
                {},
                { defaultValue: 'Confirm new password' },
              )}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={setConfirm}
            />
            {error ? (
              <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
                {error}
              </p>
            ) : null}
            <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
              <button
                type="button"
                onClick={onClose}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-full text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                disabled={busy}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('extrabold'),
                  'rounded-full bg-primary text-white shadow-sm disabled:opacity-50',
                )}
              >
                {busy
                  ? t('settings.password.saving', {}, { defaultValue: 'Updating\u2026' })
                  : t('settings.changePassword', {}, { defaultValue: 'Change password' })}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/**
 * Re-auth gate for the email change: the backend refuses PATCH /users/:id
 * with an `email` unless the request also carries the account's current
 * password (the email is the account-recovery anchor). Collect it here,
 * then commit.
 */
function EmailConfirmModal({
  pendingEmail,
  saving,
  error,
  onClose,
  onConfirm,
}: {
  pendingEmail: string
  saving: boolean
  error: string | null
  onClose: () => void
  onConfirm: (currentPassword: string) => Promise<boolean>
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (!password) {
      setLocalError(
        t(
          'user.error.currentPasswordRequired',
          {},
          { defaultValue: 'Enter your current password to continue.' },
        ),
      )
      return
    }
    await onConfirm(password)
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      role="presentation"
      className={cm.cn('fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('settings.email.confirmTitle', {}, { defaultValue: 'Confirm email change' })}
        className={cm.cn(
          cm.sp('p', 6),
          'w-full max-w-md space-y-4 rounded-2xl bg-surface ring-1 ring-outline-variant',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('extrabold'))}>
          {t('settings.email.confirmTitle', {}, { defaultValue: 'Confirm email change' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.email.confirmBody',
            { email: pendingEmail },
            {
              defaultValue:
                'Change your sign-in email to {{email}}? Enter your current password to confirm.',
            },
          )}
        </p>
        <form onSubmit={submit} className={cm.cn('space-y-3')}>
          <Field
            id="settings-email-password"
            label={t('settings.password.current', {}, { defaultValue: 'Current password' })}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
          />
          {error || localError ? (
            <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
              {error || localError}
            </p>
          ) : null}
          <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
            <button
              type="button"
              onClick={onClose}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-full text-on-surface-variant hover:bg-surface-container',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={saving}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('extrabold'),
                'rounded-full bg-primary text-white shadow-sm disabled:opacity-50',
              )}
            >
              {saving
                ? t('articleEditor.saving', {}, { defaultValue: 'Saving\u2026' })
                : t('settings.email.confirm', {}, { defaultValue: 'Update email' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

function TwoFactorModal({
  userId,
  mode,
  onClose,
  onSuccess,
}: {
  userId: string
  mode: 'enable' | 'disable'
  onClose: () => void
  onSuccess: (enabled: boolean) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Enabling starts by requesting a fresh TOTP secret + QR code from the
  // user resource's verify-two-factor endpoint. Disabling skips straight to
  // code entry (verified against the active secret). If the app's API has no
  // two-factor provider bonded the setup call 500s and we surface it inline.
  useEffect(() => {
    if (mode !== 'enable') return
    let cancelled = false
    setBusy(true)
    setError(null)
    http
      .post(`/users/${userId}/verify-two-factor`, { action: 'setup' })
      .then((res) => {
        if (cancelled) return
        const data = unwrapSingle<TwoFactorSetup>(res)
        if (data) setSetup(data)
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t(
                'settings.twofa.unavailable',
                {},
                { defaultValue: 'Two-factor authentication is not available for this app.' },
              ),
        )
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode, userId, http, t])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await http.post(`/users/${userId}/verify-two-factor`, { action: mode, token })
      onSuccess(mode === 'enable')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.twofa.invalidCode', {}, { defaultValue: 'Invalid code' }),
      )
      setBusy(false)
    }
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      role="presentation"
      className={cm.cn('fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('settings.twoFactor', {}, { defaultValue: 'Two-factor authentication' })}
        className={cm.cn(
          cm.sp('p', 6),
          'w-full max-w-md space-y-4 rounded-2xl bg-surface ring-1 ring-outline-variant',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('extrabold'))}>
          {mode === 'disable'
            ? t(
                'settings.twofa.disableTitle',
                {},
                { defaultValue: 'Disable two-factor authentication' },
              )
            : t(
                'settings.twofa.enableTitle',
                {},
                { defaultValue: 'Enable two-factor authentication' },
              )}
        </h2>
        {mode === 'enable' && setup?.QRImageUrl ? (
          <div className={cm.cn('space-y-3')}>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.twofa.scan',
                {},
                {
                  defaultValue:
                    'Scan this QR code with your authenticator app, then enter the 6-digit code.',
                },
              )}
            </p>
            <img
              src={setup.QRImageUrl}
              alt={t('settings.twofa.qrAlt', {}, { defaultValue: 'Two-factor QR code' })}
              className={cm.cn('mx-auto h-44 w-44')}
            />
            {setup.secret ? (
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  'break-all text-center text-on-surface-variant',
                )}
              >
                {setup.secret}
              </p>
            ) : null}
          </div>
        ) : null}
        {error ? (
          <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
            {error}
          </p>
        ) : null}
        {mode === 'disable' || setup ? (
          <form onSubmit={submit} className={cm.cn('space-y-3')}>
            <Field
              id="settings-2fa-token"
              label={t('settings.twofa.code', {}, { defaultValue: 'Authentication code' })}
              value={token}
              onChange={setToken}
              autoComplete="one-time-code"
            />
            <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
              <button
                type="button"
                onClick={onClose}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-full text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                disabled={busy}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('extrabold'),
                  'rounded-full text-white shadow-sm disabled:opacity-50',
                  mode === 'disable' ? 'bg-error' : 'bg-primary',
                )}
              >
                {mode === 'disable'
                  ? t('settings.twofa.disable', {}, { defaultValue: 'Disable' })
                  : t('settings.twofa.verify', {}, { defaultValue: 'Verify & enable' })}
              </button>
            </div>
          </form>
        ) : busy ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loading', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function DeleteModal({
  userId,
  onClose,
  onDeleted,
}: {
  userId: string
  onClose: () => void
  onDeleted: () => void | Promise<void>
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (confirmText !== 'DELETE') {
      setError(t('settings.danger.confirmInvalid', {}, { defaultValue: 'Type DELETE to confirm.' }))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await http.delete(`/users/${userId}`)
      await onDeleted()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.danger.deleteFailed', {}, { defaultValue: 'Could not delete account' }),
      )
      setBusy(false)
    }
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      role="presentation"
      className={cm.cn('fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.dangerZone', {}, { defaultValue: 'Danger zone' })}
        className={cm.cn(
          cm.sp('p', 6),
          'w-full max-w-md space-y-4 rounded-2xl bg-surface ring-1 ring-outline-variant',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('extrabold'), 'text-error')}>
          {t('settings.danger.title', {}, { defaultValue: 'Delete workspace' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.danger.confirm',
            {},
            {
              defaultValue:
                'This deletes your account and every article you authored. Type DELETE to confirm.',
            },
          )}
        </p>
        <Field
          id="settings-delete-confirm"
          label={t('settings.danger.confirmLabel', {}, { defaultValue: 'Confirmation' })}
          value={confirmText}
          onChange={setConfirmText}
        />
        {error ? (
          <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
            {error}
          </p>
        ) : null}
        <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
          <button
            type="button"
            onClick={onClose}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-full text-on-surface-variant hover:bg-surface-container',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('extrabold'),
              'rounded-full bg-error text-white shadow-sm disabled:opacity-50',
            )}
          >
            {busy
              ? t('settings.danger.deleting', {}, { defaultValue: 'Deleting\u2026' })
              : t('settings.danger.action', {}, { defaultValue: 'Delete workspace' })}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  autoComplete?: string
}) {
  const cm = getClassMap()
  return (
    <div>
      <label
        htmlFor={id}
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('extrabold'),
          'block text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className={cm.cn(
          cm.sp('mt', 1),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          'w-full rounded-lg border border-outline bg-surface text-on-surface',
        )}
      />
    </div>
  )
}

export default Settings
