import { useCallback, useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker } from '@molecule/app-ui-react'

import { themeProvider } from '../bonds/index.js'
import { WhiteboardLayout } from '../components/WhiteboardLayout.js'

/**
 * Apply a theme choice through the app's theme bond so the CSS-variable
 * palette, `data-mol-mode` attribute, and the header ThemeToggle all stay in
 * sync. 'system' resolves via `prefers-color-scheme`.
 */
function applyTheme(theme: string): void {
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
  themeProvider.setTheme(resolved)
}

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: 'badge' },
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  { id: 'security', label: 'Security', icon: 'shield' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

const NOTIFICATION_PREFS = [
  { key: 'mentions', defaultEnabled: true, label: 'Board edits & invitations' },
  { key: 'snapshots', defaultEnabled: true, label: 'New snapshots saved' },
  { key: 'digest', defaultEnabled: false, label: 'Weekly facilitator digest' },
]

interface UserProfile {
  id: string
  email?: string
  name?: string
  username?: string
}

const PREFS_KEY = 'whiteboard:notificationPrefs'
const THEME_KEY = 'whiteboard:theme'

function loadPrefs(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const v = window.localStorage.getItem(PREFS_KEY)
    return v ? (JSON.parse(v) as Record<string, boolean>) : {}
  } catch (_error) {
    // corrupted localStorage value; fall back to default empty prefs
    return {}
  }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const http = useHttpClient()
  const [active, setActive] = useState<SectionId>('profile')

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => loadPrefs())
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window === 'undefined') return 'system'
    return window.localStorage.getItem(THEME_KEY) ?? 'system'
  })

  useEffect(() => {
    if (user?.name && name === '') setName(user.name)
    if (user?.email && email === '') setEmail(user.email)
    if (user?.username && username === '') setUsername(user.username)
  }, [email, name, user?.email, user?.name, user?.username, username])

  const handleSaveProfile = useCallback(async () => {
    if (!user?.id) return
    setSaving(true)
    setSaveStatus(null)
    setError(null)
    try {
      await http.patch(`/api/users/${user.id}`, { name, email, username })
      setSaveStatus(t('common.profileSavedPeriod', {}, { defaultValue: 'Profile saved.' })!)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }, [email, http, name, t, user?.id, username])

  const togglePref = (key: string, value: boolean) => {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(next))
    }
  }

  const switchTheme = (id: string) => {
    setTheme(id)
    if (typeof window !== 'undefined') window.localStorage.setItem(THEME_KEY, id)
    applyTheme(id)
  }

  return (
    <WhiteboardLayout
      eyebrow={t('settings.eyebrow', {}, { defaultValue: 'Account preferences' })}
      title={t('nav.settings', {}, { defaultValue: 'Settings' })}
    >
      <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }))}>
        <aside
          data-mol-id="settings-sidebar"
          className={cm.cn('col-span-3', cm.stack(1), 'sticky top-24 self-start')}
        >
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              data-mol-id={`settings-tab-${s.id}`}
              onClick={() => setActive(s.id)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                active === s.id
                  ? 'bg-primary-fixed/40 text-primary-dark border-l-4 border-primary rounded-r-lg'
                  : 'text-on-surface-variant hover:bg-surface-container/60 rounded-lg transition-colors',
              )}
            >
              <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                {s.icon}
              </span>
              {t(`settings.section.${s.id}`, {}, { defaultValue: s.label })}
            </button>
          ))}
        </aside>

        <section className={cm.cn('col-span-9', cm.stack(6))}>
          {error && (
            <div
              role="alert"
              data-mol-id="settings-error"
              className={cm.cn(
                cm.sp('p', 3),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-xl bg-error-container/40 text-on-error-container',
              )}
            >
              {error}
            </div>
          )}
          {saveStatus && (
            <div
              role="status"
              data-mol-id="settings-status"
              className={cm.cn(
                cm.sp('p', 3),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-xl bg-secondary-container/40 text-on-secondary-container',
              )}
            >
              {saveStatus}
            </div>
          )}

          {active === 'profile' && (
            <div
              data-mol-id="settings-profile-card"
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(4),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
              )}
            >
              <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
                {t('settings.profile.title', {}, { defaultValue: 'Public collaborator card' })}
              </h2>
              <label className={cm.cn(cm.stack(2))}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.displayName', {}, { defaultValue: 'Display name' })}
                </span>
                <input
                  type="text"
                  data-mol-id="settings-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    'bg-surface-container-low rounded-xl border border-outline-variant/40 focus:bg-surface focus:ring-2 focus:ring-primary/30 transition-all outline-none',
                  )}
                />
              </label>
              <label className={cm.cn(cm.stack(2))}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('auth.username', {}, { defaultValue: 'Username' })}
                </span>
                <input
                  type="text"
                  data-mol-id="settings-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    'bg-surface-container-low rounded-xl border border-outline-variant/40 focus:bg-surface focus:ring-2 focus:ring-primary/30 transition-all outline-none',
                  )}
                />
              </label>
              <label className={cm.cn(cm.stack(2))}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                </span>
                <input
                  type="email"
                  data-mol-id="settings-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    'bg-surface-container-low rounded-xl border border-outline-variant/40 focus:bg-surface focus:ring-2 focus:ring-primary/30 transition-all outline-none',
                  )}
                />
              </label>
              <button
                type="button"
                disabled={saving}
                data-mol-id="settings-save"
                onClick={handleSaveProfile}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'w-fit bg-gradient-to-br from-primary to-primary-hover text-white rounded-xl shadow-md shadow-primary/30 disabled:opacity-60',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>save</span>
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
            </div>
          )}

          {active === 'appearance' && (
            <div
              data-mol-id="settings-appearance"
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(4),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
              )}
            >
              <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
                {t('settings.appearance.title', {}, { defaultValue: 'Theme & canvas' })}
              </h2>
              <div data-mol-id="settings-language" className={cm.cn(cm.stack(2))}>
                <h3
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('footer.language', {}, { defaultValue: 'Language' })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'common.chooseTheLanguage',
                    {},
                    { defaultValue: 'Choose the language used throughout the app.' },
                  )}
                </p>
                <LanguagePicker />
              </div>
              <div className={cm.cn(cm.grid({ cols: 3, gap: 'lg' }))}>
                {[
                  { id: 'light', label: 'Light', preview: '#ffffff', dotGrid: '#e2e2e2' },
                  { id: 'dark', label: 'Dark', preview: '#141425', dotGrid: '#2a2a40' },
                  { id: 'system', label: 'Match system', preview: '#5b5bf7', dotGrid: '#a855f7' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    data-mol-id={`settings-theme-${opt.id}`}
                    onClick={() => switchTheme(opt.id)}
                    className={cm.cn(
                      cm.sp('p', 5),
                      cm.stack(3),
                      cm.flex({ align: 'center' }),
                      'rounded-2xl border-2 hover:border-primary transition-colors',
                      theme === opt.id ? 'border-primary' : 'border-outline-variant/30',
                    )}
                  >
                    <div
                      className={cm.cn(cm.w('full'), cm.h(20), 'rounded-xl')}
                      style={{
                        backgroundColor: opt.preview,
                        backgroundImage: `radial-gradient(circle, ${opt.dotGrid} 1px, transparent 1px)`,
                        backgroundSize: '12px 12px',
                      }}
                    ></div>
                    <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                      {t(`settings.appearance.${opt.id}`, {}, { defaultValue: opt.label })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {active === 'notifications' && (
            <div
              data-mol-id="settings-notifications"
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(3),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
              )}
            >
              <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
                {t(
                  'settings.notifications.title',
                  {},
                  { defaultValue: 'Notification preferences' },
                )}
              </h2>
              {NOTIFICATION_PREFS.map((p) => (
                <label
                  key={p.key}
                  data-mol-id={`settings-pref-${p.key}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 3),
                    'border-b border-outline-variant/20',
                  )}
                >
                  <span className={cm.stack(1)}>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-on-surface',
                      )}
                    >
                      {t(`settings.pref.${p.key}.label`, {}, { defaultValue: p.label })}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={prefs[p.key] ?? p.defaultEnabled}
                    onChange={(e) => togglePref(p.key, e.target.checked)}
                    className={cm.cn(cm.w(5), cm.h(5), 'accent-primary')}
                  />
                </label>
              ))}
            </div>
          )}

          {active === 'security' && (
            <div
              data-mol-id="settings-security"
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(4),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
              )}
            >
              <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
                {t('settings.security.title', {}, { defaultValue: 'Security' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                {t(
                  'settings.security.body',
                  {},
                  {
                    defaultValue:
                      'Manage two-factor authentication, active sessions, and password from your account dashboard.',
                  },
                )}
              </p>
            </div>
          )}
        </section>
      </div>
    </WhiteboardLayout>
  )
}

export default Settings
