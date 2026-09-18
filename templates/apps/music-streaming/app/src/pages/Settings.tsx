import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useBillingStatus } from '@molecule/app-billing-react'
import {
  useAuth,
  useAuthClient,
  useChangePassword,
  useDevice,
  useHttpClient,
  usePush,
  useTranslation,
} from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Input, LanguagePicker, Modal, ThemeToggle } from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = [
  'account',
  'appearance',
  'playback',
  'social',
  'notifications',
  'devices',
  'language',
] as const
type Section = (typeof SECTIONS)[number]

type AudioQuality = 'lossless' | 'high' | 'normal'

/** Client mirror of the API's `user_preferences` row (GET/PATCH /api/preferences). */
interface Preferences {
  country: string | null
  audio_quality: AudioQuality
  crossfade: boolean
  gapless: boolean
  normalize: boolean
  allow_explicit: boolean
  public_profile: boolean
  public_listening: boolean
  allow_followers: boolean
  share_listening: boolean
  notify_new_releases: boolean
  notify_weekly_recap: boolean
  notify_follower_activity: boolean
  notify_concert_nearby: boolean
}

const DEFAULT_PREFERENCES: Preferences = {
  country: null,
  audio_quality: 'lossless',
  crossfade: true,
  gapless: true,
  normalize: true,
  allow_explicit: true,
  public_profile: true,
  public_listening: false,
  allow_followers: true,
  share_listening: false,
  notify_new_releases: true,
  notify_weekly_recap: true,
  notify_follower_activity: false,
  notify_concert_nearby: true,
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [section, setSection] = useState<Section>('account')
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES)

  // Hydrate persisted preferences once — the toggles below PATCH the same
  // endpoint so settings survive reloads and other devices.
  useEffect(() => {
    let cancelled = false
    http
      .get('/api/preferences')
      .then((res) => {
        if (cancelled) return
        const row = unwrapSingle<Partial<Preferences>>(res)
        if (row && typeof row === 'object') {
          setPrefs((prev) => ({ ...prev, ...row }))
        }
      })
      .catch(() => {
        /* endpoint unavailable — keep local defaults */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const updatePref = <K extends keyof Preferences>(key: K, value: Preferences[K]): void => {
    const prevValue = prefs[key]
    setPrefs((prev) => ({ ...prev, [key]: value }))
    http.patch('/api/preferences', { [key]: value }).catch(() => {
      // Persist failed — revert the optimistic flip so the UI stays honest.
      setPrefs((prev) => ({ ...prev, [key]: prevValue }))
    })
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.grid({ cols: 12, gap: 'lg' }))}>
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
                  { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      <main className={cm.cn('col-span-12 md:col-span-9 space-y-4')}>
        {section === 'account' && (
          <AccountSettings
            country={prefs.country}
            onCountryChange={(value) => updatePref('country', value)}
          />
        )}

        {section === 'appearance' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.appearance.description',
                {},
                { defaultValue: 'Toggle between light and dark mode.' },
              )}
            </p>
            <ThemeToggle />
          </section>
        )}

        {section === 'playback' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.playback.heading', {}, { defaultValue: 'Playback' })}
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
                {t('settings.playback.audioQuality', {}, { defaultValue: 'Streaming quality' })}
              </span>
              <select
                value={prefs.audio_quality}
                onChange={(e) => updatePref('audio_quality', e.target.value as AudioQuality)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'w-full border border-outline-variant rounded-md bg-surface',
                )}
              >
                <option value="lossless">
                  {t('settings.playback.quality.lossless', {}, { defaultValue: 'Lossless (FLAC)' })}
                </option>
                <option value="high">
                  {t('settings.playback.quality.high', {}, { defaultValue: 'High (320 kbps)' })}
                </option>
                <option value="normal">
                  {t('settings.playback.quality.normal', {}, { defaultValue: 'Normal (160 kbps)' })}
                </option>
              </select>
            </label>
            <Toggle
              label={t(
                'settings.playback.crossfade',
                {},
                { defaultValue: 'Crossfade between tracks' },
              )}
              checked={prefs.crossfade}
              onChange={(v) => updatePref('crossfade', v)}
            />
            <Toggle
              label={t('settings.playback.gapless', {}, { defaultValue: 'Gapless playback' })}
              checked={prefs.gapless}
              onChange={(v) => updatePref('gapless', v)}
            />
            <Toggle
              label={t('settings.playback.normalize', {}, { defaultValue: 'Normalize volume' })}
              checked={prefs.normalize}
              onChange={(v) => updatePref('normalize', v)}
            />
            <Toggle
              label={t(
                'settings.playback.allowExplicit',
                {},
                { defaultValue: 'Allow explicit content' },
              )}
              checked={prefs.allow_explicit}
              onChange={(v) => updatePref('allow_explicit', v)}
            />
          </section>
        )}

        {section === 'social' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.social.heading', {}, { defaultValue: 'Social' })}
            </h2>
            <Toggle
              label={t(
                'settings.social.publicProfile',
                {},
                { defaultValue: 'Public profile (followers can see playlists)' },
              )}
              checked={prefs.public_profile}
              onChange={(v) => updatePref('public_profile', v)}
            />
            <Toggle
              label={t(
                'settings.social.publicListening',
                {},
                { defaultValue: "Show what I'm listening to in real time" },
              )}
              checked={prefs.public_listening}
              onChange={(v) => updatePref('public_listening', v)}
            />
            <Toggle
              label={t(
                'settings.social.allowFollowers',
                {},
                { defaultValue: 'Allow new followers' },
              )}
              checked={prefs.allow_followers}
              onChange={(v) => updatePref('allow_followers', v)}
            />
            <Toggle
              label={t(
                'settings.social.shareListening',
                {},
                { defaultValue: 'Share listening history with friends' },
              )}
              checked={prefs.share_listening}
              onChange={(v) => updatePref('share_listening', v)}
            />
          </section>
        )}

        {section === 'notifications' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            </h2>
            <PushToggle />
            <Toggle
              label={t(
                'settings.notifications.newReleases',
                {},
                { defaultValue: 'New releases from artists I follow' },
              )}
              checked={prefs.notify_new_releases}
              onChange={(v) => updatePref('notify_new_releases', v)}
            />
            <Toggle
              label={t(
                'settings.notifications.weeklyRecap',
                {},
                { defaultValue: 'Weekly listening recap' },
              )}
              checked={prefs.notify_weekly_recap}
              onChange={(v) => updatePref('notify_weekly_recap', v)}
            />
            <Toggle
              label={t(
                'settings.notifications.followerActivity',
                {},
                { defaultValue: 'When followers add me' },
              )}
              checked={prefs.notify_follower_activity}
              onChange={(v) => updatePref('notify_follower_activity', v)}
            />
            <Toggle
              label={t(
                'settings.notifications.concertNearby',
                {},
                { defaultValue: 'Concerts by my artists nearby' },
              )}
              checked={prefs.notify_concert_nearby}
              onChange={(v) => updatePref('notify_concert_nearby', v)}
            />
          </section>
        )}

        {section === 'devices' && <DevicesSettings />}

        {section === 'language' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
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
          </section>
        )}
      </main>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={cm.cn(cm.h(4), cm.w(4))}
      />
      <span className={cm.cn(cm.textSize('sm'))}>{label}</span>
    </label>
  )
}

/**
 * Wired account panel — edits the current user's display name + email
 * (PATCH /api/users/:id, refreshed from /api/users/me), country
 * (PATCH /api/preferences via the parent), changes the password (modal,
 * hidden for OAuth-only users) and deletes the account (password-confirm
 * modal → DELETE /api/users/:id → logout → /login). The plan row shows
 * the real billing status.
 */
function AccountSettings({
  country,
  onCountryChange,
}: {
  country: string | null
  onCountryChange: (country: string) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const authClient = useAuthClient<UserProfile>()
  const { user, logout, setUser } = useAuth<UserProfile>()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { status, error: pwError, changePassword, reset } = useChangePassword()
  const { data: billing } = useBillingStatus()
  const [countryDraft, setCountryDraft] = useState(country ?? '')

  // Keep the draft in sync when the parent's preferences hydrate.
  useEffect(() => {
    setCountryDraft(country ?? '')
  }, [country])

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [showPwModal, setShowPwModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Refresh the current user from the canonical endpoint on mount and
  // push it into the auth cache so reloads see fresh data. Best-effort.
  useEffect(() => {
    let cancelled = false
    http
      .get('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const body = (res as { data?: unknown }).data ?? res
        const next = ((body as { props?: UserProfile }).props ?? body) as UserProfile | undefined
        if (next && typeof next === 'object' && next.id) {
          setUser(next)
          setName((curr) => (curr === (user?.name ?? '') ? (next.name ?? curr) : curr))
          setEmail((curr) => (curr === (user?.email ?? '') ? (next.email ?? curr) : curr))
        }
      })
      .catch(() => {
        /* refresh is best-effort — cached profile is the fallback */
      })
    return () => {
      cancelled = true
    }
  }, [http, setUser, user?.name, user?.email])

  const isOAuthUser = Boolean((user as unknown as { oauthServer?: unknown })?.oauthServer)

  const persist = async (patch: Partial<Pick<UserProfile, 'name' | 'email'>>): Promise<void> => {
    const current = authClient.getState().user
    if (!current?.id) return
    setSaving(true)
    setSaveError('')
    try {
      await http.patch(`/api/users/${current.id}`, patch)
      setUser({ ...current, ...patch })
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : t(
              'settings.failedToUpdateProfile',
              {},
              { defaultValue: 'Failed to update your profile.' },
            ),
      )
      setName(current.name ?? '')
      setEmail(current.email ?? '')
    } finally {
      setSaving(false)
    }
  }

  const handleNameBlur = (): void => {
    const current = authClient.getState().user
    if (!name || name === (current?.name ?? '')) return
    void persist({ name })
  }

  const handleEmailBlur = (): void => {
    const current = authClient.getState().user
    if (!email || email === (current?.email ?? '')) return
    void persist({ email })
  }

  const handleChangePassword = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    try {
      await changePassword(currentPassword, newPassword)
      setShowPwModal(false)
      setCurrentPassword('')
      setNewPassword('')
      reset()
    } catch (_error) {
      /* error surfaced via pwError in the modal */
    }
  }

  const handleDelete = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    const current = authClient.getState().user
    setDeleting(true)
    setDeleteError('')
    try {
      await http.delete(`/api/users/${current?.id}`, { data: { password: deletePassword } })
      await logout()
      navigate('/login')
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : t('settings.failedToDeleteAccount', {}, { defaultValue: 'Failed to delete account.' }),
      )
    } finally {
      setDeleting(false)
    }
  }

  const labelClass = cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))
  const inputClass = cm.cn(
    cm.sp('px', 3),
    cm.sp('py', 2),
    'w-full border border-outline-variant rounded-md',
  )

  return (
    <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t('settings.account.heading', {}, { defaultValue: 'Account' })}
        </h2>
        {saving ? (
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t('common.saving', {}, { defaultValue: 'Saving…' })}
          </span>
        ) : null}
      </div>

      {saveError ? <p className={cm.cn(cm.textSize('xs'), 'text-error')}>{saveError}</p> : null}

      <label className="block">
        <span className={labelClass}>
          {t('form.displayName', {}, { defaultValue: 'Display name' })}
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>{t('settings.email', {}, { defaultValue: 'Email' })}</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={handleEmailBlur}
          className={inputClass}
        />
      </label>

      <div>
        <span className={labelClass}>{t('nav.plan', {}, { defaultValue: 'Plan' })}</span>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'border border-outline-variant rounded-md',
          )}
        >
          <span>
            {billing?.name ?? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </span>
          <Link
            to="/subscription"
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.textPrimary)}
          >
            {t('settings.managePlan', {}, { defaultValue: 'Manage plan' })}
          </Link>
        </div>
      </div>

      <label className="block">
        <span className={labelClass}>
          {t('settings.account.country', {}, { defaultValue: 'Country' })}
        </span>
        <input
          type="text"
          value={countryDraft}
          onChange={(e) => setCountryDraft(e.target.value)}
          onBlur={() => {
            if (countryDraft !== (country ?? '')) onCountryChange(countryDraft)
          }}
          className={inputClass}
        />
      </label>

      {!isOAuthUser ? (
        <div className={cm.cn(cm.sp('pt', 2))}>
          <Button variant="outline" size="sm" onClick={() => setShowPwModal(true)}>
            {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </Button>
        </div>
      ) : null}

      <div className={cm.cn(cm.sp('pt', 4), 'border-t border-outline-variant space-y-2')}>
        <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-error')}>
          {t('settings.dangerZone', {}, { defaultValue: 'Danger zone' })}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDeleteModal(true)}
          data-mol-id="user-menu-delete-account"
        >
          {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
        </Button>
      </div>

      <Modal
        open={showPwModal}
        onClose={() => {
          setShowPwModal(false)
          reset()
        }}
        title={t('settings.changePasswordModal.title', {}, { defaultValue: 'Change password' })}
      >
        {pwError ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {pwError.message ||
              t(
                'settings.changePasswordModal.error',
                {},
                { defaultValue: 'Failed to change password.' },
              )}
          </Alert>
        ) : null}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="current-pw" className={labelClass}>
              {t(
                'settings.changePasswordModal.currentPassword',
                {},
                { defaultValue: 'Current password' },
              )}
            </label>
            <Input
              id="current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label htmlFor="new-pw" className={labelClass}>
              {t('settings.changePasswordModal.newPassword', {}, { defaultValue: 'New password' })}
            </label>
            <Input
              id="new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" fullWidth loading={status === 'pending'}>
            {status === 'pending'
              ? t('settings.changePasswordModal.changing', {}, { defaultValue: 'Changing…' })
              : t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </Button>
        </form>
      </Modal>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('settings.deleteAccountModal.title', {}, { defaultValue: 'Delete account' })}
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 4))}>
          {t(
            'settings.deleteAccountModal.warning',
            {},
            {
              defaultValue:
                'This permanently deletes your account and all your data. This cannot be undone.',
            },
          )}
        </p>
        {deleteError ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {deleteError}
          </Alert>
        ) : null}
        <form onSubmit={handleDelete} className="space-y-4">
          <div>
            <label htmlFor="delete-pw" className={labelClass}>
              {t(
                'settings.deleteAccountModal.password',
                {},
                { defaultValue: 'Confirm your password' },
              )}
            </label>
            <Input
              id="delete-pw"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword((e.target as HTMLInputElement).value)}
              required
            />
          </div>
          <Button type="submit" color="error" fullWidth loading={deleting}>
            {deleting
              ? t('settings.deleteAccountModal.deleting', {}, { defaultValue: 'Deleting…' })
              : t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
          </Button>
        </form>
      </Modal>
    </section>
  )
}

/**
 * Wired push-notification toggle — requests browser permission +
 * registers/unregisters the push subscription via `@molecule/app-push`.
 */
function PushToggle() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { permission, requestPermission, register, unregister } = usePush({ checkOnMount: true })
  const [enabled, setEnabled] = useState(permission === 'granted')

  useEffect(() => {
    setEnabled(permission === 'granted')
  }, [permission])

  const handleToggle = async (next: boolean): Promise<void> => {
    try {
      if (next) {
        await requestPermission()
        await register()
        setEnabled(true)
      } else {
        await unregister()
        setEnabled(false)
      }
    } catch (_error) {
      /* permission denied / service worker unavailable — leave state unchanged */
    }
  }

  return (
    <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => {
          void handleToggle(e.target.checked)
        }}
        className={cm.cn(cm.h(4), cm.w(4))}
      />
      <span className={cm.cn(cm.textSize('sm'))}>
        {t(
          'settings.pushNotifications',
          {},
          { defaultValue: 'Enable push notifications on this device' },
        )}
      </span>
    </label>
  )
}

interface DeviceRow {
  id: string
  name?: string | null
  platform?: string | null
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean
}

/**
 * Devices panel — lists the user's registered devices (GET /api/devices),
 * lets the user revoke (sign out) any device other than the current one
 * (DELETE /api/devices/:id → refetch; the API enforces server-side session
 * revocation when the row is deleted), and shows details about the current
 * device (`@molecule/app-device`). The current device is labelled
 * "This device" and is not revocable here.
 */
function DevicesSettings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { deviceInfo } = useDevice()
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await http.get('/api/devices')
      setDevices(unwrapList<DeviceRow>(res))
    } catch (_error) {
      /* devices endpoint is optional — render empty when unavailable */
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void load()
  }, [load])

  const revoke = async (id: string): Promise<void> => {
    setRevokingId(id)
    try {
      await http.delete(`/api/devices/${id}`)
      setConfirmingId(null)
      await load()
    } catch (_error) {
      /* best-effort — keep the row so the user can retry the revoke */
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('settings.devices', {}, { defaultValue: 'Devices' })}
      </h2>

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : devices.length > 0 ? (
        <ul className="space-y-2">
          {devices.map((d) => {
            const label =
              d.name ||
              d.platform ||
              t('settings.unknownDevice', {}, { defaultValue: 'Unknown device' })
            const confirming = confirmingId === d.id
            return (
              <li key={d.id} className="space-y-1">
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.textSize('sm'),
                  )}
                >
                  <span>
                    {label}
                    {d.isCurrent ? (
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                          cm.sp('ml', 2),
                        )}
                      >
                        {t('settings.thisDevice', {}, { defaultValue: 'This device' })}
                      </span>
                    ) : d.name && d.platform ? (
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                          cm.sp('ml', 2),
                        )}
                      >
                        {d.platform}
                      </span>
                    ) : null}
                  </span>
                  {d.isCurrent ? null : confirming ? (
                    <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={revokingId === d.id}
                        onClick={() => setConfirmingId(null)}
                      >
                        {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                      </Button>
                      <Button
                        color="error"
                        size="sm"
                        loading={revokingId === d.id}
                        onClick={() => {
                          void revoke(d.id)
                        }}
                        data-mol-id="device-revoke-confirm"
                      >
                        {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                      </Button>
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmingId(d.id)}
                      data-mol-id="device-revoke"
                    >
                      {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                    </Button>
                  )}
                </div>
                {confirming ? (
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
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
            )
          })}
        </ul>
      ) : (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('settings.noDevices', {}, { defaultValue: 'No other devices found.' })}
        </p>
      )}

      <div className={cm.cn(cm.sp('pt', 4), 'border-t border-outline-variant space-y-2')}>
        <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {t('settings.thisDevice', {}, { defaultValue: 'This device' })}
        </h3>
        <dl className={cm.cn(cm.textSize('sm'), 'space-y-1')}>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <dt className="text-on-surface-variant">
              {t('settings.platform', {}, { defaultValue: 'Platform' })}
            </dt>
            <dd>{deviceInfo.os.name || t('settings.unknown', {}, { defaultValue: 'Unknown' })}</dd>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <dt className="text-on-surface-variant">
              {t('settings.browser', {}, { defaultValue: 'Browser' })}
            </dt>
            <dd>
              {deviceInfo.browser.name || t('settings.unknown', {}, { defaultValue: 'Unknown' })}
            </dd>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <dt className="text-on-surface-variant">
              {t('settings.network', {}, { defaultValue: 'Network' })}
            </dt>
            <dd>
              {navigator.onLine
                ? t('settings.online', {}, { defaultValue: 'Online' })
                : t('settings.offline', {}, { defaultValue: 'Offline' })}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
