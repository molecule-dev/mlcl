// Phase 1 baseline — verbatim JSX of design-3d-model-viewer-settings.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import AvatarSection from '../components/AvatarSection.js'
import MobileBottomNav from '../components/MobileBottomNav.js'
import ProfileFormActions from '../components/ProfileFormActions.js'
import ProfileFormFields from '../components/ProfileFormFields.js'
import SettingsSubNav from '../components/SettingsSubNav.js'
import { UserMenu } from '../components/UserMenu.js'

interface SettingsUser {
  id?: string
  email?: string
  name?: string
  username?: string
  bio?: string
}

function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<SettingsUser>()
  const http = useHttpClient()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  // Re-fetch the user from the API on mount so we don't show stale fields
  // sourced from the auth client's cached profile (which is captured at
  // login/signup and doesn't auto-refresh).
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    const apply = (props: SettingsUser | undefined) => {
      if (cancelled || !props) return
      const parts = (props.name || '').split(' ')
      setFirstName(parts[0] || '')
      setLastName(parts.slice(1).join(' ') || '')
      setUsername(props.username || '')
      setBio(props.bio || '')
      setEmail(props.email || '')
    }
    // Seed from the cached user immediately so the form has values.
    apply(user)
    http
      .get<{ props?: SettingsUser } | SettingsUser>(`/api/users/${user.id}`)
      .then((res) => {
        const body =
          res && typeof res === 'object' && 'data' in res
            ? (res as { data?: { props?: SettingsUser } | SettingsUser }).data
            : (res as { props?: SettingsUser } | SettingsUser | undefined)
        const props =
          body && 'props' in (body as object)
            ? (body as { props?: SettingsUser }).props
            : (body as SettingsUser | undefined)
        apply(props)
      })
      .catch((error: unknown) => {
        // Best-effort freshness refresh — the form was already seeded from
        // the cached auth profile above, so just log the failed re-fetch.
        logError('settings.refreshUser', error)
      })
    return () => {
      cancelled = true
    }
  }, [user, http])

  useEffect(() => {
    if (savedAt === null) return
    const timer = setTimeout(() => setSavedAt(null), 2500)
    return () => clearTimeout(timer)
  }, [savedAt])

  async function handleSave() {
    if (!user?.id) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: [firstName, lastName].filter(Boolean).join(' '),
      }
      // Only send username when it's a non-empty value the user explicitly
      // typed. Sending `null` would be coerced server-side to the literal
      // string "null" by the molecule update handler and clash with anyone
      // else who left it blank.
      const trimmedUsername = (username || '').trim()
      if (trimmedUsername) {
        payload.username = trimmedUsername
      }
      // Only send a non-empty email; the update handler treats email as a
      // unique field, so blanking it would be rejected server-side.
      const trimmedEmail = (email || '').trim()
      if (trimmedEmail) {
        payload.email = trimmedEmail
      }
      await http.patch(`/api/users/${user.id}`, payload)
      setSavedAt(Date.now())
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    if (user) {
      const parts = (user.name || '').split(' ')
      setFirstName(parts[0] || '')
      setLastName(parts.slice(1).join(' ') || '')
      setUsername(user.username || '')
      setBio(user.bio || '')
      setEmail(user.email || '')
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({}),
        cm.h('screen'),
        cm.w('screen'),
        'bg-surface text-on-surface overflow-hidden selection:bg-primary-container selection:text-on-primary-container',
      )}
    >
      {/* JSON Component: SideNavBar — md+ only; mobile uses MobileBottomNav */}
      <nav
        className={cm.cn(
          'hidden md:flex flex-col',
          cm.w('[260px]'),
          cm.h('screen'),
          cm.h('full'),
          'fixed left-0 top-0 bg-surface-container-lowest overflow-y-auto shadow-[40px_0_40px_-5px_rgba(17,17,37,0.08)] z-50',
        )}
      >
        <div
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            cm.sp('px', 6),
            cm.sp('py', 8),
            'tracking-tighter text-on-surface font-headline',
          )}
        >
          {APP_NAME}
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('normal'),
              cm.sp('mt', 1),
              'block text-on-surface-variant tracking-normal font-body',
            )}
          >
            {t('settings.appVersion', {}, { defaultValue: 'V0.1.4-BETA' })}
          </span>
        </div>
        {/* Sidebar items link to real routes only — the previous Account /
        Security / Billing / Integrations entries all dead-ended back at
        /settings, and the sidebar had no way back into the rest of the app. */}
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 1 }),
            cm.sp('px', 3),
            cm.flex1,
            cm.textSize('sm'),
            'font-headline tracking-tight',
          )}
        >
          <Link
            className={cm.cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant font-medium hover:text-on-surface hover:bg-primary/10 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] scale-95 active:scale-90',
            )}
            to="/dashboard"
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </Link>
          <Link
            className={cm.cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant font-medium hover:text-on-surface hover:bg-primary/10 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] scale-95 active:scale-90',
            )}
            to="/models"
          >
            <span className="material-symbols-outlined text-[20px]">view_in_ar</span>
            {t('nav.models', {}, { defaultValue: 'Models' })}
          </Link>
          <Link
            className={cm.cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant font-medium hover:text-on-surface hover:bg-primary/10 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] scale-95 active:scale-90',
            )}
            to="/upload"
          >
            <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
            {t('common.upload', {}, { defaultValue: 'Upload' })}
          </Link>
          <Link
            className={cm.cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant font-medium hover:text-on-surface hover:bg-primary/10 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] scale-95 active:scale-90',
            )}
            to="/notifications"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </Link>
          <Link
            className={cm.cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-primary-container font-bold bg-primary/20 border-r-2 border-primary hover:bg-primary/10 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] scale-95 active:scale-90 mt-auto mb-4',
            )}
            to="/settings"
            aria-current="page"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </Link>
        </div>
      </nav>
      {/* Main Canvas */}
      <main
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.flex1,
          cm.h('screen'),
          'md:ml-[260px] relative bg-surface',
        )}
      >
        {/* JSON Component: TopAppBar */}
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 8),
            cm.w('full'),
            cm.h(16),
            'fixed top-0 right-0 left-0 md:left-[260px] bg-surface-container-lowest/80 backdrop-blur-xl z-40',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.fontWeight('bold'),
              cm.textSize('lg'),
              'text-on-surface-variant font-headline',
            )}
          >
            <span className="text-primary">
              {t('nav.settings', {}, { defaultValue: 'Settings' })}
            </span>
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined text-outline')}>
              chevron_right
            </span>
            <span className="text-on-surface">
              {t('nav.profile', {}, { defaultValue: 'Profile' })}
            </span>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), 'text-on-surface-variant')}>
            <UserMenu />
          </div>
        </header>
        {/* Toast */}
        {savedAt && (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 3 }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'fixed top-20 right-8 bg-surface-container-highest border border-outline-variant/15 rounded-lg shadow-[0_20px_40px_-5px_rgba(17,17,37,0.3)] z-50 animate-fade-in backdrop-blur-xl',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(6),
                cm.h(6),
                cm.roundedFull,
                'bg-primary-container/20 text-primary',
              )}
            >
              <span
                className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}>
              {t('settings.preferencesSaved', {}, { defaultValue: 'Preferences saved' })}
            </span>
          </div>
        )}
        {/* Content Area: Two Pane */}
        <div className={cm.cn(cm.flex({}), cm.flex1, cm.sp('mt', 16), 'overflow-hidden')}>
          {/* Left Pane: Settings Sub-nav */}
          <SettingsSubNav />
          {/* Right Pane: Form Area */}
          <div
            className={cm.cn(cm.flex1, cm.sp('px', 8), cm.sp('py', 10), 'overflow-y-auto lg:px-12')}
          >
            <div className={cm.cn(cm.maxW('[720px]'), cm.mxAuto, 'pb-24')}>
              <div className={cm.sp('mb', 10)}>
                <h1
                  className={cm.cn(
                    cm.textSize('3xl'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 2),
                    'font-headline text-on-surface tracking-tight',
                  )}
                >
                  {t('nav.profile', {}, { defaultValue: 'Profile' })}
                </h1>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant font-body')}>
                  {t(
                    'settings.profileSubtitle',
                    {},
                    { defaultValue: 'Manage your public presence and renderer preferences.' },
                  )}
                </p>
              </div>
              {/* Avatar Section */}
              <AvatarSection />
              {/* Form Grid */}
              <ProfileFormFields
                firstName={firstName}
                setFirstName={setFirstName}
                lastName={lastName}
                setLastName={setLastName}
                username={username}
                setUsername={setUsername}
                bio={bio}
                setBio={setBio}
                email={email}
                setEmail={setEmail}
              />
              {/* Actions */}
              <ProfileFormActions onSave={handleSave} onDiscard={handleDiscard} saving={saving} />
              {/* Language */}
              <section
                className={cm.cn(
                  cm.sp('mt', 10),
                  cm.sp('p', 6),
                  'bg-surface-container-lowest border border-outline-variant/15 rounded-2xl',
                )}
              >
                <h2
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 2),
                    'font-headline text-on-surface tracking-tight',
                  )}
                >
                  {t('footer.language', {}, { defaultValue: 'Language' })}
                </h2>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mb', 4),
                    'text-on-surface-variant font-body',
                  )}
                >
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
                  <h3
                    className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
                  >
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
          </div>
        </div>
      </main>
      {/* Mobile chrome: bottom tab bar below md */}
      <MobileBottomNav />
    </div>
  )
}

export default Settings
export { Settings, Settings as SettingsPage }
