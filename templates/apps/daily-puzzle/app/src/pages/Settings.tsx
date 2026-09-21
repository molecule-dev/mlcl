import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

interface UserShape {
  id: string
  name?: string
  email?: string
  username?: string
}

const PREFERENCES = [
  {
    key: 'haptics',
    title: 'Haptic feedback',
    body: 'A tiny pulse when a guess is accepted.',
    glyph: 'vibration',
    defaultEnabled: true,
  },
  {
    key: 'tileSounds',
    title: 'Tile sounds',
    body: 'A soft flip sound when tiles reveal.',
    glyph: 'graphic_eq',
    defaultEnabled: true,
  },
  {
    key: 'notifications',
    title: 'Email digests',
    body: 'Weekly recap of your streak and stats.',
    glyph: 'mail',
    defaultEnabled: false,
  },
  {
    key: 'showInLeaderboard',
    title: 'Public leaderboard',
    body: 'Appear on the public stats leaderboard.',
    glyph: 'leaderboard',
    defaultEnabled: true,
  },
] as const

const PREFS_KEY = 'lexlet:prefs:v1'

function loadPrefs(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return JSON.parse(raw) as Record<string, boolean>
  } catch (_error) {
    // Corrupted or unreadable localStorage entry; fall back to defaults
  }
  return Object.fromEntries(PREFERENCES.map((p) => [p.key, p.defaultEnabled]))
}

function savePrefs(prefs: Record<string, boolean>) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch (_error) {
    // localStorage may be unavailable (private mode, quota exceeded); prefs will not persist
  }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth<UserShape>()
  const http = useHttpClient()

  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => loadPrefs())
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<string | null>(null)
  const [profileMsgError, setProfileMsgError] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!user) return
    setName(user.name ?? '')
    setUsername(user.username ?? '')
    setEmail(user.email ?? '')
  }, [user])

  useEffect(() => {
    savePrefs(prefs)
  }, [prefs])

  const memberLabel = useMemo(() => {
    return user?.email
      ? `@${user.username ?? user.email.split('@')[0]}`
      : t('settings.guest', {}, { defaultValue: 'Guest' })
  }, [user, t])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setSavingProfile(true)
    setProfileMsg(null)
    setProfileMsgError(false)
    try {
      // Backend rejects an empty username/email; only send fields the user has set.
      const payload: Record<string, string> = {}
      if (name.trim()) payload.name = name.trim()
      if (username.trim()) payload.username = username.trim()
      if (email.trim()) payload.email = email.trim()
      if (Object.keys(payload).length === 0) {
        setProfileMsg(t('common.savedPeriod', {}, { defaultValue: 'Saved.' }))
        setEditing(false)
        return
      }
      await http.patch(`/api/users/${user.id}`, payload)
      setProfileMsg(t('common.savedPeriod', {}, { defaultValue: 'Saved.' }))
      setEditing(false)
    } catch (_error) {
      // Save failed; the message renders below in the error color.
      setProfileMsgError(true)
      setProfileMsg(
        t('common.couldNotSaveProfile', {}, { defaultValue: 'Could not save profile.' }),
      )
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleDeleteAccount() {
    if (!user?.id) return
    setDeleting(true)
    try {
      await http.delete(`/api/users/${user.id}`)
      await logout().catch(() => undefined)
      navigate('/')
    } catch (_error) {
      // Delete failed; reset loading/confirm state so user can retry
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('py', 8))} data-testid="settings">
      <header>
        <span className={cm.cn('text-[10px] uppercase tracking-widest font-black text-primary')}>
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </span>
        <h1 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mt-1')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn('text-sm text-on-surface-variant mt-2 max-w-lg')}>
          {t(
            'settings.subhead',
            {},
            { defaultValue: 'Tune your profile, sound, and how you appear on the leaderboard.' },
          )}
        </p>
      </header>

      <section
        className={cm.cn(
          'rounded-3xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm overflow-hidden',
        )}
      >
        <div
          className={cm.cn('relative h-32 bg-gradient-to-r from-primary via-tertiary to-amber-500')}
        >
          <span
            className={cm.cn(
              'absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-white/20 blur-3xl',
            )}
            aria-hidden="true"
          />
        </div>
        <div className={cm.cn(cm.sp('p', 6), '-mt-12 relative')}>
          <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), 'flex-wrap gap-4')}>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
              <div
                className={cm.cn(
                  'w-24 h-24 rounded-3xl ring-4 ring-surface-container-lowest bg-gradient-to-br from-primary to-tertiary text-white font-extrabold text-3xl flex items-center justify-center shadow-lg',
                )}
                aria-hidden="true"
              >
                {(name || user?.email || 'S').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p
                  className={cm.cn('font-extrabold text-xl tracking-tight')}
                  data-testid="profile-name"
                >
                  {name ||
                    t(
                      'settings.unnamed',
                      { appName: APP_NAME },
                      { defaultValue: '{{appName}} player' },
                    )}
                </p>
                <p className={cm.cn('text-sm text-on-surface-variant')}>{memberLabel}</p>
                {user?.email ? (
                  <p className={cm.cn('text-xs text-on-surface-variant mt-1')}>{user.email}</p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              data-testid="edit-profile"
              className={cm.cn(
                'px-4 py-2 rounded-xl bg-primary text-white text-xs font-extrabold uppercase tracking-widest shadow-md shadow-primary/20',
              )}
            >
              {editing
                ? t('common.cancel', {}, { defaultValue: 'Cancel' })
                : t('nav.editProfile', {}, { defaultValue: 'Edit profile' })}
            </button>
          </div>

          {editing ? (
            <form
              onSubmit={handleSaveProfile}
              data-testid="profile-form"
              className={cm.cn(
                cm.stack(3),
                cm.sp('mt', 6),
                'rounded-2xl bg-surface-container-low p-4',
              )}
            >
              <label className={cm.cn('block')}>
                <span
                  className={cm.cn(
                    'text-[10px] uppercase tracking-widest font-black text-on-surface-variant',
                  )}
                >
                  {t('form.name', {}, { defaultValue: 'Name' })}
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="profile-name-input"
                  className={cm.cn(
                    'mt-1 w-full rounded-xl bg-surface-container-lowest px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40',
                  )}
                />
              </label>
              <label className={cm.cn('block')}>
                <span
                  className={cm.cn(
                    'text-[10px] uppercase tracking-widest font-black text-on-surface-variant',
                  )}
                >
                  {t('auth.username', {}, { defaultValue: 'Username' })}
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  data-testid="profile-username-input"
                  className={cm.cn(
                    'mt-1 w-full rounded-xl bg-surface-container-lowest px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40',
                  )}
                />
              </label>
              <label className={cm.cn('block')}>
                <span
                  className={cm.cn(
                    'text-[10px] uppercase tracking-widest font-black text-on-surface-variant',
                  )}
                >
                  {t('settings.email', {}, { defaultValue: 'Email' })}
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  data-testid="profile-email-input"
                  className={cm.cn(
                    'mt-1 w-full rounded-xl bg-surface-container-lowest px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40',
                  )}
                />
              </label>
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'end', gap: 2 }))}>
                <button
                  type="submit"
                  disabled={savingProfile}
                  data-testid="profile-save"
                  className={cm.cn(
                    'px-4 py-2 rounded-xl bg-primary text-white text-xs font-extrabold uppercase tracking-widest disabled:opacity-50',
                  )}
                >
                  {savingProfile
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('common.saveProfile', {}, { defaultValue: 'Save profile' })}
                </button>
              </div>
            </form>
          ) : null}

          {profileMsg ? (
            <p
              className={cm.cn(
                'text-xs font-bold mt-3',
                profileMsgError ? 'text-error' : 'text-success',
              )}
              data-testid="profile-message"
              role="status"
            >
              {profileMsg}
            </p>
          ) : null}
        </div>
      </section>

      <section
        className={cm.cn(
          'rounded-3xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          cm.sp('p', 6),
        )}
      >
        <h2 className={cm.cn('text-lg font-extrabold tracking-tight mb-4')}>
          {t('nav.preferences', {}, { defaultValue: 'Preferences' })}
        </h2>
        <ul className={cm.cn('divide-y divide-outline-variant/30')}>
          {PREFERENCES.map((pref) => {
            const enabled = prefs[pref.key] ?? false
            return (
              <li
                key={pref.key}
                className={cm.cn(cm.sp('py', 4), cm.flex({ align: 'center', gap: 4 }))}
              >
                <span
                  className={cm.cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center bg-primary-container/40 text-primary',
                  )}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">{pref.glyph}</span>
                </span>
                <div className={cm.flex1}>
                  <p className={cm.cn('font-bold text-sm')}>
                    {t(`settings.preferences.${pref.key}.title`, {}, { defaultValue: pref.title })}
                  </p>
                  <p className={cm.cn('text-xs text-on-surface-variant')}>
                    {t(`settings.preferences.${pref.key}.body`, {}, { defaultValue: pref.body })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPrefs((p) => ({ ...p, [pref.key]: !p[pref.key] }))}
                  aria-pressed={enabled}
                  aria-label={t(
                    `settings.preferences.${pref.key}.title`,
                    {},
                    { defaultValue: pref.title },
                  )}
                  data-testid={`pref-${pref.key}`}
                  className={cm.cn(
                    'relative w-12 h-7 rounded-full transition-colors',
                    enabled ? 'bg-primary' : 'bg-surface-container-high',
                  )}
                >
                  <span
                    className={cm.cn(
                      'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all',
                      enabled ? 'left-6' : 'left-1',
                    )}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section
        className={cm.cn(
          'rounded-3xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          cm.sp('p', 6),
        )}
      >
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
          {t('settings.language.title', {}, { defaultValue: 'Language' })}
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
        className={cm.cn(
          'rounded-3xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30',
          cm.sp('p', 6),
        )}
      >
        <h2
          className={cm.cn(
            'text-lg font-extrabold tracking-tight text-rose-700 dark:text-rose-300 mb-1',
          )}
        >
          {t('nav.dangerZone', {}, { defaultValue: 'Danger zone' })}
        </h2>
        <p className={cm.cn('text-xs text-rose-700/80 dark:text-rose-200/80 mb-4')}>
          {t(
            'settings.danger.body',
            { appName: APP_NAME },
            {
              defaultValue: 'Permanently remove your {{appName}} account and all puzzle history.',
            },
          )}
        </p>
        {confirmDelete ? (
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleting}
              data-testid="confirm-delete"
              className={cm.cn(
                'px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-extrabold uppercase tracking-widest disabled:opacity-50',
              )}
            >
              {deleting
                ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
                : t('settings.danger.confirm', {}, { defaultValue: 'Yes, delete forever' })}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              data-testid="cancel-delete"
              className={cm.cn(
                'px-4 py-2 rounded-xl bg-surface-container-low text-on-surface-variant text-xs font-extrabold uppercase tracking-widest',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            data-testid="delete-account"
            className={cm.cn(
              'px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-extrabold uppercase tracking-widest',
            )}
          >
            {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
          </button>
        )}
      </section>
    </div>
  )
}

export default Settings
