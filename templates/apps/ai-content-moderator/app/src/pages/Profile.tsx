import { useEffect, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { error as logError } from '@molecule/app-logger'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SiftLayout } from '../components/SiftLayout.js'

const TIMEZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Australia/Sydney',
]

const ROLES = ['Reviewer', 'Senior moderator', 'Admin'] as const

interface SettingsState {
  timezone: string
  role: (typeof ROLES)[number]
  notify: { email: boolean; push: boolean; slack: boolean }
}

const STORAGE_KEY = 'ai-content-moderator:profile-prefs'

function loadPrefs(): SettingsState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) throw new Error('empty')
    const parsed = JSON.parse(raw) as Partial<SettingsState>
    return {
      timezone: parsed.timezone ?? TIMEZONES[0],
      role: ROLES.includes(parsed.role as (typeof ROLES)[number])
        ? (parsed.role as (typeof ROLES)[number])
        : 'Reviewer',
      notify: {
        email: parsed.notify?.email ?? true,
        push: parsed.notify?.push ?? false,
        slack: parsed.notify?.slack ?? false,
      },
    }
  } catch (_error) {
    // localStorage unavailable or corrupted — fall back to default prefs
    return {
      timezone: TIMEZONES[0],
      role: 'Reviewer',
      notify: { email: true, push: false, slack: false },
    }
  }
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user, refresh } = useAuth<UserProfile>()

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [prefs, setPrefs] = useState<SettingsState>(() => loadPrefs())
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
  }, [user])

  function persistPrefs(next: SettingsState) {
    setPrefs(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch (_error) {
      // storage may be unavailable (private mode) — prefs survive in React state for this session
    }
  }

  function avatarInitials(): string {
    const source = name || email || ''
    return source
      .split(/[\s@]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('')
  }

  async function saveProfile() {
    if (!user?.id) return
    setSaving(true)
    setError(null)
    setFeedback(null)
    try {
      await http.patch(`/api/users/${user.id}`, { name, email })
      // The auth client caches the user object in localStorage and rehydrates
      // from it on next page load. `refresh()` only refreshes the JWT, not the
      // user record, so we mirror the just-saved values back into the cache so
      // a reload sees the new name/email immediately.
      try {
        const key = 'molecule:auth:user'
        const stored = window.localStorage.getItem(key)
        if (stored) {
          const merged = { ...(JSON.parse(stored) as Record<string, unknown>), name, email }
          window.localStorage.setItem(key, JSON.stringify(merged))
        }
      } catch (_error) {
        // localStorage may be unavailable (private mode); reload will refetch from server.
      }
      try {
        await refresh?.()
      } catch (_error) {
        // refresh failures are non-fatal — the save itself already succeeded.
      }
      setFeedback(t('common.profileSavedPeriod', {}, { defaultValue: 'Profile saved.' }))
    } catch (error) {
      logError('profile.saveProfile', error)
      setError(t('common.couldNotSaveProfile', {}, { defaultValue: 'Could not save profile.' }))
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
    setFeedback(t('profile.reset', {}, { defaultValue: 'Reverted to saved values.' }))
    setError(null)
  }

  function uploadAvatar() {
    setFeedback(
      t(
        'profile.avatarHint',
        {},
        { defaultValue: 'Avatar uploads run through your S3 bucket — wire it in api/.env.' },
      ),
    )
  }

  return (
    <SiftLayout>
      <header>
        <h1
          className={cm.cn('text-4xl font-bold tracking-tight font-headline text-on-surface mb-2')}
        >
          {t('profile.heading', {}, { defaultValue: 'Your profile' })}
        </h1>
        <p className={cm.cn('text-on-surface-variant')}>
          {t(
            'profile.subheading',
            { appName: APP_NAME },
            { defaultValue: 'Update how {{appName}} reaches you and how the console behaves.' },
          )}
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            'rounded-lg border-l-4 border-red-500 bg-error-light px-4 py-3 text-sm text-error',
          )}
        >
          {error}
        </div>
      )}
      {feedback && (
        <div
          role="status"
          className={cm.cn(
            'rounded-lg border-l-4 border-emerald-500 bg-success-light px-4 py-3 text-sm text-success',
          )}
        >
          {feedback}
        </div>
      )}

      <section className={cm.cn(cm.grid({ cols: 12, gap: 6 }))}>
        <article
          className={cm.cn(
            'col-span-12 lg:col-span-8 rounded-xl bg-surface-container-lowest shadow-sm p-6 space-y-6',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-5')}>
            <span
              className={cm.cn(
                'w-20 h-20 rounded-full bg-primary/10 text-primary font-bold text-2xl inline-flex items-center justify-center',
              )}
            >
              {avatarInitials() || '?'}
            </span>
            <div>
              <p className={cm.cn('text-base font-bold text-on-surface')}>
                {name || t('profile.unnamed', {}, { defaultValue: 'Unnamed reviewer' })}
              </p>
              <p className={cm.cn('text-xs text-on-surface-variant')}>
                {email || t('profile.noEmail', {}, { defaultValue: 'No email on file' })}
              </p>
              <button
                type="button"
                onClick={uploadAvatar}
                className={cm.cn(
                  'mt-2 text-primary text-xs font-bold uppercase tracking-wider hover:underline',
                )}
              >
                {t('profile.changeAvatar', {}, { defaultValue: 'Upload new avatar' })}
              </button>
            </div>
          </div>

          <div className={cm.cn(cm.grid({ cols: 2, gap: 4 }))}>
            <Field id="profile-name" label={t('form.fullName', {}, { defaultValue: 'Full name' })}>
              <input
                id="profile-name"
                data-mol-id="profile-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={cm.cn(
                  'w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:outline-none text-on-surface text-base px-4 py-3 rounded-lg transition-colors',
                )}
              />
            </Field>
            <Field
              id="profile-email"
              label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            >
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={cm.cn(
                  'w-full bg-surface-container-low border-0 border-b-2 border-transparent focus:border-primary focus:outline-none text-on-surface text-base px-4 py-3 rounded-lg transition-colors',
                )}
              />
            </Field>
            <Field id="profile-role" label={t('form.role', {}, { defaultValue: 'Role' })}>
              <select
                id="profile-role"
                value={prefs.role}
                onChange={(event) =>
                  persistPrefs({ ...prefs, role: event.target.value as (typeof ROLES)[number] })
                }
                className={cm.cn(
                  'w-full bg-surface-container-low border border-surface-container rounded-lg px-3 py-3 text-sm focus:border-primary focus:outline-none',
                )}
              >
                {ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field id="profile-tz" label={t('form.timezone', {}, { defaultValue: 'Timezone' })}>
              <select
                id="profile-tz"
                value={prefs.timezone}
                onChange={(event) => persistPrefs({ ...prefs, timezone: event.target.value })}
                className={cm.cn(
                  'w-full bg-surface-container-low border border-surface-container rounded-lg px-3 py-3 text-sm focus:border-primary focus:outline-none',
                )}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz}>{tz}</option>
                ))}
              </select>
            </Field>
          </div>

          <div
            className={cm.cn(
              'flex items-center justify-end gap-3 pt-4 border-t border-surface-container',
            )}
          >
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className={cm.cn(
                'border border-outline-variant text-on-surface text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-lg hover:bg-surface-container-low transition-colors disabled:opacity-60',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              data-mol-id="save-profile"
              className={cm.cn(
                'bg-gradient-to-br from-primary to-primary-container text-white font-bold text-xs uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-md transition-shadow disabled:opacity-60',
              )}
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
            </button>
          </div>
        </article>

        <aside
          className={cm.cn(
            'col-span-12 lg:col-span-4 rounded-xl bg-surface-container-lowest shadow-sm p-6 space-y-4',
          )}
        >
          <h2 className={cm.cn('text-base font-bold text-on-surface')}>
            {t('nav.notificationPreferences', {}, { defaultValue: 'Notification preferences' })}
          </h2>
          <p className={cm.cn('text-xs text-on-surface-variant')}>
            {t(
              'profile.notificationsBody',
              { appName: APP_NAME },
              {
                defaultValue: 'Choose where {{appName}} should ping you when items need attention.',
              },
            )}
          </p>
          {(['email', 'push', 'slack'] as const).map((channel) => (
            <label
              key={channel}
              className={cm.cn(
                'flex items-center justify-between gap-3 rounded-lg border border-surface-container bg-surface-container-low/40 px-4 py-3 cursor-pointer',
              )}
            >
              <span>
                <span className={cm.cn('block text-sm font-semibold text-on-surface capitalize')}>
                  {t(`profile.channel.${channel}`, {}, { defaultValue: channel })}
                </span>
                <span className={cm.cn('block text-xs text-on-surface-variant mt-0.5')}>
                  {channel === 'email'
                    ? t(
                        'profile.channelDesc.email',
                        {},
                        { defaultValue: 'Daily digest at 9am in your timezone' },
                      )
                    : channel === 'push'
                      ? t(
                          'profile.channelDesc.push',
                          {},
                          { defaultValue: 'Real-time, only for urgent escalations' },
                        )
                      : t(
                          'profile.channelDesc.slack',
                          {},
                          { defaultValue: 'Direct messages from #moderation-bot' },
                        )}
                </span>
              </span>
              <input
                type="checkbox"
                checked={prefs.notify[channel]}
                onChange={(event) =>
                  persistPrefs({
                    ...prefs,
                    notify: { ...prefs.notify, [channel]: event.target.checked },
                  })
                }
                className={cm.cn('w-5 h-5 rounded text-primary')}
              />
            </label>
          ))}
        </aside>
      </section>
    </SiftLayout>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <div>
      <label
        htmlFor={id}
        className={cm.cn(
          'block text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label mb-2',
        )}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

export default Profile
