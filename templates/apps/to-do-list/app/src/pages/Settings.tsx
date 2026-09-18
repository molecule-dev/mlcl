import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useChangePassword, useHttpClient, useTranslation } from '@molecule/app-react'
import { NotificationsSection } from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker } from '@molecule/app-ui-react'

import { ThemeToggle } from '../components/ThemeToggle.js'
import {
  type AppDevice,
  type AppUser,
  deleteDevice,
  getUser,
  listDevices,
  updateUser,
} from '../lib/api.js'

const SECTIONS = ['account', 'preferences', 'shortcuts'] as const
type Section = (typeof SECTIONS)[number]

const SHORTCUTS: { id: string; keys: string; description: string }[] = [
  { id: 'commandPalette', keys: '⌘K', description: 'Quick add task / open command palette' },
  { id: 'quickAdd', keys: 'Q', description: 'Quick add task' },
  { id: 'goToday', keys: 'G T', description: 'Go to Today' },
  { id: 'goInbox', keys: 'G I', description: 'Go to Inbox' },
  { id: 'goUpcoming', keys: 'G U', description: 'Go to Upcoming' },
  { id: 'goProject', keys: 'G P', description: 'Go to a project' },
  { id: 'saveTask', keys: '⌘ Enter', description: 'Save task' },
  { id: 'closePanel', keys: 'Esc', description: 'Close panel' },
]

const PREF_KEY = 'todo.preferences.v1'

interface LocalPreferences {
  startOfWeek: 'Sunday' | 'Monday'
  timeFormat: '12h' | '24h'
  timezone: string
}

function loadPrefs(): LocalPreferences {
  if (typeof window === 'undefined') {
    return {
      startOfWeek: 'Monday',
      timeFormat: '12h',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }
  }
  try {
    const raw = window.localStorage.getItem(PREF_KEY)
    if (raw) return { ...JSON.parse(raw) } as LocalPreferences
  } catch (_error) {
    // localStorage unavailable or JSON corrupt; fall back to defaults
  }
  return {
    startOfWeek: 'Monday',
    timeFormat: '12h',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
}

function savePrefs(prefs: LocalPreferences): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PREF_KEY, JSON.stringify(prefs))
  } catch (_error) {
    // quota exceeded; preferences are best-effort and can be lost safely
  }
}

interface SessionUser {
  id?: string
  name?: string | null
  email?: string | null
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const auth = useAuth<SessionUser>()
  const [section, setSection] = useState<Section>('account')

  const sessionUser = auth.user
  const userId = sessionUser?.id

  const [profile, setProfile] = useState<AppUser | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSavedAt, setProfileSavedAt] = useState<number | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [prefs, setPrefs] = useState<LocalPreferences>(() => loadPrefs())

  // Track which fields the user has actually edited so a slow profile
  // refresh doesn't clobber an in-progress typed change.
  const editedRef = useRef<{ name: boolean; email: boolean }>({ name: false, email: false })

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    getUser(http, userId)
      .then((u) => {
        if (cancelled || !u) return
        setProfile(u)
        if (!editedRef.current.name) setName(u.name ?? '')
        if (!editedRef.current.email) setEmail(u.email ?? '')
      })
      .catch(() => {
        if (!cancelled)
          setProfileError(
            t('nav.couldNotLoadProfile', {}, { defaultValue: 'Could not load profile.' }),
          )
      })
    return () => {
      cancelled = true
    }
  }, [http, userId, t])

  const onSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || savingProfile) return
    setSavingProfile(true)
    setProfileError(null)
    try {
      const patch: Record<string, string> = {}
      if (name.trim() && name.trim() !== (profile?.name ?? '')) patch.name = name.trim()
      if (email.trim() && email.trim() !== (profile?.email ?? '')) patch.email = email.trim()
      if (Object.keys(patch).length === 0) {
        setProfileSavedAt(Date.now())
        return
      }
      const updated = await updateUser(http, userId, patch)
      if (updated) {
        setProfile(updated)
        editedRef.current = { name: false, email: false }
        setProfileSavedAt(Date.now())
      } else {
        setProfileError(
          t('common.couldNotSaveChanges', {}, { defaultValue: 'Could not save changes.' }),
        )
      }
    } catch (_error) {
      setProfileError(
        t('common.couldNotSaveChanges', {}, { defaultValue: 'Could not save changes.' }),
      )
    } finally {
      setSavingProfile(false)
    }
  }

  const onPrefChange = (next: Partial<LocalPreferences>) => {
    const merged = { ...prefs, ...next }
    setPrefs(merged)
    savePrefs(merged)
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('settings.eyebrow', {}, { defaultValue: 'Personalize' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
          {t(
            'settings.subheading',
            {},
            { defaultValue: 'Account, preferences, and keyboard shortcuts.' },
          )}
        </p>
      </header>
      <div className={cm.grid({ cols: 12, gap: 'lg' })}>
        <aside className={cm.cn('col-span-12 md:col-span-3')}>
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
                  onClick={() => setSection(s)}
                  data-mol-id={`settings-tab-${s}`}
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
                    { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        <main className={cm.cn('col-span-12 md:col-span-9 space-y-4')}>
          {section === 'account' && (
            <form onSubmit={onSaveProfile} className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.account.heading', {}, { defaultValue: 'Account' })}
              </h2>
              <Field
                label={t('form.displayName', {}, { defaultValue: 'Display name' })}
                name="name"
                value={name}
                onChange={(v) => {
                  editedRef.current.name = true
                  setName(v)
                }}
              />
              <Field
                label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                name="email"
                type="email"
                value={email}
                onChange={(v) => {
                  editedRef.current.email = true
                  setEmail(v)
                }}
              />
              {profileError && (
                <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{profileError}</p>
              )}
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', justify: 'between' }))}>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <button
                    type="submit"
                    disabled={savingProfile || !userId}
                    data-mol-id="settings-save-profile"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'bg-primary text-on-primary rounded-md disabled:opacity-40',
                    )}
                  >
                    {savingProfile
                      ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                      : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                  </button>
                  {profileSavedAt && Date.now() - profileSavedAt < 5000 && (
                    <span className={cm.cn(cm.textSize('xs'), 'text-emerald-700')}>
                      {t('common.saved', {}, { defaultValue: 'Saved' })}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => auth.logout()}
                  data-mol-id="settings-logout"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-md border border-outline-variant text-on-surface-variant hover:bg-error/10 hover:text-error hover:border-error',
                  )}
                >
                  {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
                </button>
              </div>
            </form>
          )}

          {section === 'account' && <SecuritySection />}

          {section === 'account' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
              <NotificationsSection />
            </section>
          )}

          {section === 'account' && <DeviceList />}

          {section === 'account' && <DangerZone />}

          {section === 'preferences' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('nav.preferences', {}, { defaultValue: 'Preferences' })}
              </h2>
              <div>
                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'block mb-1 text-on-surface-variant uppercase tracking-wider',
                  )}
                  htmlFor="pref-theme"
                >
                  {t('nav.theme', {}, { defaultValue: 'Theme' })}
                </label>
                <ThemeToggle />
              </div>
              <div>
                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'block mb-1 text-on-surface-variant uppercase tracking-wider',
                  )}
                >
                  {t('footer.language', {}, { defaultValue: 'Language' })}
                </label>
                <LanguagePicker />
              </div>
              <SelectField
                label={t('settings.preferences.startOfWeek', {}, { defaultValue: 'Start of week' })}
                name="startOfWeek"
                value={prefs.startOfWeek}
                onChange={(v) =>
                  onPrefChange({ startOfWeek: v as LocalPreferences['startOfWeek'] })
                }
                options={[
                  { value: 'Monday', label: 'Monday' },
                  { value: 'Sunday', label: 'Sunday' },
                ]}
              />
              <SelectField
                label={t('settings.preferences.timeFormat', {}, { defaultValue: 'Time format' })}
                name="timeFormat"
                value={prefs.timeFormat}
                onChange={(v) => onPrefChange({ timeFormat: v as LocalPreferences['timeFormat'] })}
                options={[
                  { value: '12h', label: '12-hour (3:00 PM)' },
                  { value: '24h', label: '24-hour (15:00)' },
                ]}
              />
              <Field
                label={t('form.timezone', {}, { defaultValue: 'Timezone' })}
                name="timezone"
                value={prefs.timezone}
                onChange={(v) => onPrefChange({ timezone: v })}
              />
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'settings.preferences.localNote',
                  {},
                  { defaultValue: 'Preferences are saved in this browser.' },
                )}
              </p>
            </section>
          )}

          {section === 'shortcuts' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
                {t('settings.shortcuts.heading', {}, { defaultValue: 'Keyboard shortcuts' })}
              </h2>
              <ul className={cm.cn('space-y-2')}>
                {SHORTCUTS.map((s) => (
                  <li
                    key={s.keys}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('py', 1),
                    )}
                  >
                    <span className={cm.cn(cm.textSize('sm'))}>
                      {t(`settings.shortcut.${s.id}`, {}, { defaultValue: s.description })}
                    </span>
                    <code
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        'font-mono border border-outline-variant rounded',
                      )}
                    >
                      {s.keys}
                    </code>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  name,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  name: string
  type?: string
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn('block')}>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        name={name}
        data-mol-id={`settings-input-${name}`}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  name,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  name: string
  options: { value: string; label: string }[]
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn('block')}>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        name={name}
        data-mol-id={`settings-select-${name}`}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md bg-surface',
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/**
 * Change-password card. Wraps `useChangePassword()` (auth client →
 * POST /users/me/password), mirroring the shared AuthSection behaviour.
 */
function SecuritySection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { status, error, changePassword, reset } = useChangePassword()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changedAt, setChangedAt] = useState<number | null>(null)
  const submitting = status === 'pending'

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || !currentPassword || !newPassword) return
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setChangedAt(Date.now())
      reset()
    } catch (_error) {
      // The failure is surfaced via the hook's `error` state rendered below;
      // re-throwing here would have no additional benefit.
    }
  }

  return (
    <form onSubmit={onSubmit} className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('settings.security.heading', {}, { defaultValue: 'Password' })}
      </h2>
      <Field
        label={t('settings.currentPassword', {}, { defaultValue: 'Current password' })}
        name="current-password"
        type="password"
        value={currentPassword}
        onChange={setCurrentPassword}
      />
      <Field
        label={t('settings.newPassword', {}, { defaultValue: 'New password' })}
        name="new-password"
        type="password"
        value={newPassword}
        onChange={setNewPassword}
      />
      {error && (
        <p className={cm.cn(cm.textSize('sm'), 'text-error')}>
          {error.message ||
            t(
              'settings.couldNotChangePassword',
              {},
              { defaultValue: 'Could not change password.' },
            )}
        </p>
      )}
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
        <button
          type="submit"
          disabled={submitting || !currentPassword || !newPassword}
          data-mol-id="settings-change-password"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md disabled:opacity-40',
          )}
        >
          {submitting
            ? t('settings.changingPassword', {}, { defaultValue: 'Changing…' })
            : t('settings.changePassword', {}, { defaultValue: 'Change password' })}
        </button>
        {changedAt && Date.now() - changedAt < 5000 && (
          <span className={cm.cn(cm.textSize('xs'), 'text-emerald-700')}>
            {t('settings.passwordChanged', {}, { defaultValue: 'Password changed' })}
          </span>
        )}
      </div>
    </form>
  )
}

/**
 * Signed-in devices card. Lists the user's devices (GET /api/devices),
 * flagging the current one and letting the user revoke (sign out) any
 * other device — mirrors the shared DevicesSection.
 *
 * Revoking deletes the device row (DELETE /api/devices/:id), after an
 * inline confirm, then refetches the list. The API enforces server-side
 * session revocation when the row is deleted, so the device is actually
 * signed out — not just hidden. The current device is labelled "This
 * device" and has no revoke control (use Sign out for the current session).
 */
function DeviceList() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [devices, setDevices] = useState<AppDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const items = await listDevices(http)
      setDevices(items)
    } catch (_error) {
      // The devices endpoint is optional; the card simply renders the
      // empty state when it is unavailable.
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
      await deleteDevice(http, id)
      setConfirmingId(null)
      await load()
    } catch (_error) {
      // Best-effort — keep the row so the user can retry the revoke.
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('settings.devices.heading', {}, { defaultValue: 'Devices' })}
      </h2>
      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : devices.length === 0 ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('settings.noDevices', {}, { defaultValue: 'No devices signed in.' })}
        </p>
      ) : (
        <ul className={cm.cn('space-y-2')}>
          {devices.map((d) => (
            <li key={d.id} data-mol-id={`settings-device-${d.id}`}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                  cm.textSize('sm'),
                  cm.sp('py', 1),
                )}
              >
                <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <span
                    className="material-symbols-outlined text-on-surface-variant"
                    aria-hidden="true"
                  >
                    devices
                  </span>
                  <span>
                    {d.name || t('settings.unknownDevice', {}, { defaultValue: 'Unknown device' })}
                  </span>
                </span>
                {d.isCurrent ? (
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      cm.roundedFull,
                      'bg-primary-container text-primary',
                    )}
                  >
                    {t('settings.thisDevice', {}, { defaultValue: 'This device' })}
                  </span>
                ) : (
                  <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    {d.updatedAt && (
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {new Date(d.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                    {confirmingId === d.id ? (
                      <>
                        <button
                          type="button"
                          disabled={revokingId === d.id}
                          onClick={() => setConfirmingId(null)}
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 1),
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            'rounded-md border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-40',
                          )}
                        >
                          {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                        </button>
                        <button
                          type="button"
                          disabled={revokingId === d.id}
                          onClick={() => revoke(d.id)}
                          data-mol-id={`settings-device-revoke-confirm-${d.id}`}
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 1),
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            'rounded-md bg-error text-on-error disabled:opacity-40',
                          )}
                        >
                          {revokingId === d.id
                            ? t('settings.signingOutDevice', {}, { defaultValue: 'Signing out…' })
                            : t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingId(d.id)}
                        data-mol-id={`settings-device-revoke-${d.id}`}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'rounded-md border border-outline-variant text-on-surface-variant hover:bg-error/10 hover:text-error hover:border-error',
                        )}
                      >
                        {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                      </button>
                    )}
                  </span>
                )}
              </div>
              {confirmingId === d.id && (
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                  {t(
                    'settings.revokeDeviceWarning',
                    {},
                    { defaultValue: "This device's access will be revoked shortly. Sign it out?" },
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Delete-account danger zone. Requires the user to confirm with their
 * password, then DELETE /api/users/:id → logout → /login — mirrors the
 * shared LogOutDeleteSection delete flow.
 */
function DangerZone() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const auth = useAuth<SessionUser>()
  const navigate = useNavigate()
  const userId = auth.user?.id

  const [confirming, setConfirming] = useState(false)
  const [password, setPassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || deleting || !password) return
    setDeleting(true)
    setError(null)
    try {
      await http.delete(`/api/users/${userId}`, { data: { password } })
      await auth.logout()
      navigate('/login')
    } catch (_error) {
      setError(
        t(
          'settings.couldNotDeleteAccount',
          {},
          { defaultValue: 'Could not delete account. Check your password and try again.' },
        ),
      )
      setDeleting(false)
    }
  }

  return (
    <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3 border border-error/40')}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-error')}>
        {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
      </h2>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t(
          'settings.deleteAccountWarning',
          {},
          {
            defaultValue:
              'Permanently delete your account and all of your tasks, projects, and labels. This cannot be undone.',
          },
        )}
      </p>
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          data-mol-id="settings-delete-account"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-md border border-error text-error hover:bg-error/10',
          )}
        >
          {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
        </button>
      ) : (
        <form onSubmit={onDelete} className={cm.cn('space-y-3')}>
          <Field
            label={t('settings.confirmPassword', {}, { defaultValue: 'Confirm your password' })}
            name="delete-password"
            type="password"
            value={password}
            onChange={setPassword}
          />
          {error && <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p>}
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <button
              type="submit"
              disabled={deleting || !password}
              data-mol-id="settings-delete-account-confirm"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-md bg-error text-on-error disabled:opacity-40',
              )}
            >
              {deleting
                ? t('settings.deletingAccount', {}, { defaultValue: 'Deleting…' })
                : t('settings.deleteAccountConfirm', {}, { defaultValue: 'Permanently delete' })}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false)
                setPassword('')
                setError(null)
              }}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-md border border-outline-variant text-on-surface-variant hover:bg-surface-container',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
