import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import {
  useAuth,
  useHttpClient,
  useStorageValue,
  useTheme,
  useTranslation,
} from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, Switch } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { ChatShell } from '../components/ChatShell.js'

interface AuthUser {
  id?: string
  email?: string
  name?: string
  bio?: string
}

interface NotificationPrefs {
  desktop: boolean
  email: boolean
  sound: boolean
  mention: boolean
}

const NOTIF_PREFS_KEY = 'team-chat:notification-prefs'

const DEFAULT_PREFS: NotificationPrefs = {
  desktop: true,
  email: false,
  sound: true,
  mention: true,
}

function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user, logout } = useAuth<AuthUser>()
  const { themeName, setTheme } = useTheme()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { value: prefs, setValue: setPrefs } = useStorageValue<NotificationPrefs>(NOTIF_PREFS_KEY, {
    defaultValue: DEFAULT_PREFS,
  })

  const [displayName, setDisplayName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Re-hydrate the local form when user info finally streams in (auth init is async).
  useEffect(() => {
    if (user?.name && !displayName) setDisplayName(user.name)
    if (user?.email && !email) setEmail(user.email)
    if (user?.bio && !bio) setBio(user.bio)
  }, [user?.name, user?.email, user?.bio, displayName, email, bio])

  const userName =
    user?.name || user?.email || t('common.unknown', {}, { defaultValue: 'Unknown user' })
  const userInitial = (user?.name || user?.email || 'U').charAt(0).toUpperCase()

  const flashSaved = (msg: string) => {
    setSavedNotice(msg)
    window.setTimeout(() => setSavedNotice(null), 4000)
  }

  const handleSaveProfile = async () => {
    if (!user?.id) return
    setSavingProfile(true)
    setSaveError(null)
    try {
      await http.patch(`/api/users/${user.id}`, {
        name: displayName,
        email,
      })
      flashSaved(t('common.profileSavedPeriod', {}, { defaultValue: 'Profile saved.' }))
    } catch (_error) {
      // profile save failed — show the error banner to the user
      setSaveError(t('settings.saveError', {}, { defaultValue: 'Failed to save profile.' }))
    } finally {
      setSavingProfile(false)
    }
  }

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      await logout()
    } finally {
      navigate('/login')
    }
  }

  const desktopNotifs = prefs?.desktop ?? DEFAULT_PREFS.desktop
  const emailNotifs = prefs?.email ?? DEFAULT_PREFS.email
  const soundAlerts = prefs?.sound ?? DEFAULT_PREFS.sound
  const mentionNotifs = prefs?.mention ?? DEFAULT_PREFS.mention

  return (
    <ChatShell className="bg-surface text-on-surface" contentClassName="bg-surface">
      <header
        className={cm.cn(
          cm.h(16),
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.w('full'),
          'bg-background dark:bg-slate-950 dark:text-slate-100',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center' }), 'space-x-8')}>
          <span className={cm.cn(cm.textSize('lg'), 'font-black font-headline')}>
            {t('header.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'space-x-3')}>
          <div
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'bg-primary text-on-primary text-xs font-bold',
            )}
            aria-label={userName}
          >
            {userInitial}
          </div>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-slate-700 dark:text-slate-300 truncate max-w-[160px]',
            )}
          >
            {userName}
          </span>
        </div>
      </header>

      {savedNotice && (
        <div
          data-mol-id="settings-saved-notice"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            'bg-emerald-50 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
          )}
        >
          {savedNotice}
        </div>
      )}
      {saveError && (
        <div
          data-mol-id="settings-save-error"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            'bg-rose-50 text-sm text-rose-900 dark:bg-rose-950/40 dark:text-rose-100',
          )}
          role="alert"
        >
          {saveError}
        </div>
      )}

      <div className={cm.cn(cm.maxW('4xl'), cm.mxAuto, cm.sp('py', 8), cm.sp('px', 6))}>
        <h2
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.sp('mb', 6),
            'text-[1.375rem] font-headline text-on-surface',
          )}
        >
          {t('settings.title', {}, { defaultValue: 'Settings' })}
        </h2>

        <div className={cm.stack(6)}>
          <section
            data-mol-id="settings-section-profile"
            className={cm.cn(
              'bg-surface-container-lowest rounded-xl shadow-ambient',
              cm.sp('p', 6),
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center' }), 'space-x-4', cm.sp('mb', 6))}>
              <span
                className={cm.cn('material-symbols-outlined text-on-primary-container')}
                data-icon="person"
              >
                person
              </span>
              <h3 className={cm.cn('font-headline font-bold text-lg text-primary')}>
                {t('nav.profile', {}, { defaultValue: 'Profile' })}
              </h3>
            </div>
            <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-12')}>
              <div
                className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), 'md:col-span-3')}
              >
                <div
                  className={cm.cn(
                    cm.w(32),
                    cm.h(32),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    'bg-primary text-on-primary text-4xl font-bold shadow-md',
                  )}
                  aria-label={userName}
                >
                  {userInitial}
                </div>
              </div>
              <div className={cm.cn(cm.stack(6), 'md:col-span-9')}>
                <div className={cm.grid({ cols: 2, gap: 'lg' })}>
                  <div className={cm.stack(2)}>
                    <label
                      htmlFor="settings-display-name"
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'block text-on-surface-variant uppercase tracking-wider',
                      )}
                    >
                      {t('settings.labels.displayName', {}, { defaultValue: 'Display Name' })}
                    </label>
                    <input
                      id="settings-display-name"
                      data-mol-id="settings-display-name"
                      className={cm.cn(
                        cm.w('full'),
                        cm.textSize('sm'),
                        'bg-surface-container-low border-none rounded-lg p-[0.9rem] text-on-surface input-focus',
                      )}
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                  <div className={cm.stack(2)}>
                    <label
                      htmlFor="settings-email"
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'block text-on-surface-variant uppercase tracking-wider',
                      )}
                    >
                      {t('settings.labels.emailAddress', {}, { defaultValue: 'Email Address' })}
                    </label>
                    <input
                      id="settings-email"
                      data-mol-id="settings-email"
                      className={cm.cn(
                        cm.w('full'),
                        cm.textSize('sm'),
                        'bg-surface-container-low border-none rounded-lg p-[0.9rem] text-on-surface input-focus',
                      )}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className={cm.stack(2)}>
                  <label
                    htmlFor="settings-bio"
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'block text-on-surface-variant uppercase tracking-wider',
                    )}
                  >
                    {t('settings.labels.bio', {}, { defaultValue: 'Status / Bio' })}
                  </label>
                  <textarea
                    id="settings-bio"
                    data-mol-id="settings-bio"
                    className={cm.cn(
                      cm.w('full'),
                      cm.textSize('sm'),
                      'bg-surface-container-low border-none rounded-lg p-[0.9rem] text-on-surface input-focus resize-none',
                    )}
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className={cm.cn(cm.flex({ justify: 'end' }), cm.sp('mt', 6))}>
              <button
                type="button"
                data-mol-id="settings-save-profile"
                onClick={handleSaveProfile}
                disabled={savingProfile || !user?.id}
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  'bg-primary text-on-primary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors',
                )}
              >
                {savingProfile
                  ? t('common.saving', {}, { defaultValue: 'Saving...' })
                  : t('settings.saveProfile', {}, { defaultValue: 'Save Profile' })}
              </button>
            </div>
          </section>

          <section
            data-mol-id="settings-section-notifications"
            className={cm.cn(
              'bg-surface-container-lowest rounded-xl shadow-ambient',
              cm.sp('p', 6),
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center' }), 'space-x-4', cm.sp('mb', 6))}>
              <span
                className={cm.cn('material-symbols-outlined text-on-primary-container')}
                data-icon="notifications_active"
              >
                notifications_active
              </span>
              <h3 className={cm.cn('font-headline font-bold text-lg text-primary')}>
                {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
              </h3>
            </div>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6')}>
              {(
                [
                  {
                    key: 'desktop',
                    value: desktopNotifs,
                    defaultTitle: 'Desktop notifications',
                    defaultDesc: 'Get native OS alerts for messages',
                  },
                  {
                    key: 'email',
                    value: emailNotifs,
                    defaultTitle: 'Email notifications',
                    defaultDesc: 'Daily digest of unread threads',
                  },
                  {
                    key: 'sound',
                    value: soundAlerts,
                    defaultTitle: 'Sound alerts',
                    defaultDesc: 'Play a chime for new activity',
                  },
                  {
                    key: 'mention',
                    value: mentionNotifs,
                    defaultTitle: '@mention notifications',
                    defaultDesc: 'Only alert when mentioned by name',
                  },
                ] as const
              ).map((row) => (
                <div key={row.key} className={cm.cn('flex items-center justify-between')}>
                  <div>
                    <h4 className={cm.cn('text-sm font-semibold text-on-surface')}>
                      {t(
                        `settings.notifications.${row.key}Title`,
                        {},
                        { defaultValue: row.defaultTitle },
                      )}
                    </h4>
                    <p className={cm.cn('text-xs text-on-surface-variant')}>
                      {t(
                        `settings.notifications.${row.key}Description`,
                        {},
                        { defaultValue: row.defaultDesc },
                      )}
                    </p>
                  </div>
                  <Switch
                    checked={row.value}
                    onChange={(e) => {
                      const checked = (e.target as HTMLInputElement).checked
                      void setPrefs({ ...(prefs ?? DEFAULT_PREFS), [row.key]: checked })
                    }}
                    data-mol-id={`settings-toggle-${row.key}`}
                    aria-label={t(
                      `settings.notifications.${row.key}Title`,
                      {},
                      { defaultValue: row.defaultTitle },
                    )}
                  />
                </div>
              ))}
            </div>
          </section>

          <section
            data-mol-id="settings-section-appearance"
            className={cm.cn(
              'bg-surface-container-lowest rounded-xl shadow-ambient',
              cm.sp('p', 6),
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center' }), 'space-x-4', cm.sp('mb', 6))}>
              <span
                className={cm.cn('material-symbols-outlined text-on-primary-container')}
                data-icon="palette"
              >
                palette
              </span>
              <h3 className={cm.cn('font-headline font-bold text-lg text-primary')}>
                {t('settings.sections.appearance', {}, { defaultValue: 'Appearance' })}
              </h3>
            </div>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-8')}>
              <div className={cm.stack(4)}>
                <label
                  className={cm.cn(
                    'block text-xs font-bold text-on-surface-variant uppercase tracking-wider',
                  )}
                >
                  {t('settings.appearance.themeSelector', {}, { defaultValue: 'Theme Selector' })}
                </label>
                <div className={cm.cn('flex p-1 bg-surface-container-low rounded-lg')}>
                  {(['light', 'dark'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      data-mol-id={`settings-theme-${mode}`}
                      onClick={() => setTheme(mode)}
                      className={cm.cn(
                        'flex-1 py-2.5 text-xs font-bold rounded-md transition-colors',
                        themeName === mode
                          ? 'text-primary bg-white shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface',
                      )}
                    >
                      {t(
                        `settings.appearance.theme${mode === 'light' ? 'Light' : 'Dark'}`,
                        {},
                        {
                          defaultValue: mode === 'light' ? 'Light' : 'Dark',
                        },
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section
            data-mol-id="settings-section-language"
            className={cm.cn(
              'bg-surface-container-lowest rounded-xl shadow-ambient',
              cm.sp('p', 6),
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center' }), 'space-x-4', cm.sp('mb', 6))}>
              <span
                className={cm.cn('material-symbols-outlined text-on-primary-container')}
                data-icon="language"
              >
                language
              </span>
              <h3 className={cm.cn('font-headline font-bold text-lg text-primary')}>
                {t('footer.language', {}, { defaultValue: 'Language' })}
              </h3>
            </div>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
              {t(
                'common.chooseTheLanguage',
                {},
                { defaultValue: 'Choose the language used throughout the app.' },
              )}
            </p>
            <LanguagePicker />
          </section>

          <section
            data-mol-id="settings-section-security"
            className={cm.cn(
              'bg-surface-container-lowest rounded-xl shadow-ambient',
              cm.sp('p', 6),
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center' }), 'space-x-4', cm.sp('mb', 6))}>
              <span
                className={cm.cn('material-symbols-outlined text-on-primary-container')}
                data-icon="lock"
              >
                lock
              </span>
              <h3 className={cm.cn('font-headline font-bold text-lg text-primary')}>
                {t('settings.sections.accountSecurity', {}, { defaultValue: 'Account Security' })}
              </h3>
            </div>
            <div className={cm.cn('flex flex-wrap gap-4 items-center')}>
              <Link
                data-mol-id="settings-forgot-password"
                to="/forgot-password"
                className={cm.cn(
                  'px-6 py-3 text-sm font-semibold text-on-surface border border-outline-variant/20 rounded-lg hover:bg-surface-container-high transition-colors',
                )}
              >
                {t('settings.changePassword', {}, { defaultValue: 'Reset password by email' })}
              </Link>
              <button
                type="button"
                data-mol-id="settings-logout"
                onClick={handleLogout}
                className={cm.cn(
                  'px-6 py-3 text-sm font-bold text-on-error bg-error rounded-lg shadow-md hover:opacity-90 active:scale-95 transition-all',
                )}
              >
                {t('settings.logOut', {}, { defaultValue: 'Log out' })}
              </button>
            </div>
          </section>
        </div>
      </div>

      <footer
        className={cm.cn(cm.sp('mt', 8), cm.sp('p', 6), 'bg-surface-container-low text-center')}
      >
        <div
          className={cm.cn('flex items-center justify-center space-x-2 text-on-surface-variant')}
        >
          <span
            className={cm.cn('material-symbols-outlined text-sm')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            pulse_alert
          </span>
          <span className={cm.cn('font-headline font-bold text-xs tracking-widest uppercase')}>
            {t(
              'settings.footer.pulseDesktop',
              { appName: APP_NAME },
              { defaultValue: '{{appName}} Desktop' },
            )}
          </span>
        </div>
      </footer>
    </ChatShell>
  )
}

export default Settings
export { Settings, Settings as SettingsPage }
