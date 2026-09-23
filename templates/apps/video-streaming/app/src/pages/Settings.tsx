import { useEffect, useRef, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { authClient } from '../bonds/index.js'
import { ACCENT_COLOR, APP_NAME, BRAND_COLOR } from '../branding.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface SettingsToggle {
  key: string
  defaultLabel: string
  defaultDescription: string
  icon: string
}

const ACCOUNT_TOGGLES: SettingsToggle[] = [
  {
    key: 'twoFactor',
    defaultLabel: 'Two-factor authentication',
    defaultDescription: 'Add a TOTP code on every new login.',
    icon: 'shield',
  },
  {
    key: 'loginAlerts',
    defaultLabel: 'Email me about new logins',
    defaultDescription: 'A heads-up email when a new device signs in.',
    icon: 'mail',
  },
]

const PLAYBACK_TOGGLES: SettingsToggle[] = [
  {
    key: 'autoplay',
    defaultLabel: 'Autoplay next video',
    defaultDescription: 'Queue the next recommendation when a video ends.',
    icon: 'skip_next',
  },
  {
    key: 'restrictedMode',
    defaultLabel: 'Restricted mode',
    defaultDescription: 'Hide videos with mature themes from this account.',
    icon: 'visibility_off',
  },
  {
    key: 'capQuality',
    defaultLabel: 'Cap streams at 1080p',
    defaultDescription: 'Useful on metered connections — 4K still loads on tap.',
    icon: 'high_quality',
  },
]

const NOTIFICATION_TOGGLES: SettingsToggle[] = [
  {
    key: 'newUploads',
    defaultLabel: 'New uploads from subscriptions',
    defaultDescription: 'Push when a channel you follow publishes.',
    icon: 'subscriptions',
  },
  {
    key: 'liveAlerts',
    defaultLabel: 'Live alerts',
    defaultDescription: 'Push when a subscribed channel goes live.',
    icon: 'sensors',
  },
  {
    key: 'commentReplies',
    defaultLabel: 'Replies to your comments',
    defaultDescription: 'Stay in the conversation, even after the video ends.',
    icon: 'chat_bubble',
  },
]

const PRIVACY_TOGGLES: SettingsToggle[] = [
  {
    key: 'historyOn',
    defaultLabel: 'Save watch history',
    defaultDescription: 'Powers your "Continue watching" rail.',
    icon: 'history',
  },
  {
    key: 'searchHistoryOn',
    defaultLabel: 'Save search history',
    defaultDescription: 'Used for instant search suggestions.',
    icon: 'search',
  },
  {
    key: 'personalizedAds',
    defaultLabel: 'Personalised ad relevance',
    defaultDescription: 'Off by default — {{appName}} is ad-free for paid plans regardless.',
    icon: 'ads_click',
  },
]

interface ToggleProps {
  toggle: SettingsToggle
  value: boolean
  onChange: (next: boolean) => void
}

function ToggleRow({ toggle, value, onChange }: ToggleProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const label = t(`settings.toggle.${toggle.key}.label`, {}, { defaultValue: toggle.defaultLabel })
  return (
    <li
      className={cm.cn(
        'flex items-start gap-4 px-5 py-4 hover:bg-surface-container transition-colors',
      )}
    >
      <span
        className={cm.cn(
          'w-10 h-10 rounded-full bg-surface-container-low text-on-surface-variant flex items-center justify-center shrink-0',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-[22px]')} aria-hidden="true">
          {toggle.icon}
        </span>
      </span>
      <div className={cm.cn('flex-1 min-w-0')}>
        <p className={cm.cn('text-sm font-bold tracking-tight')}>{label}</p>
        <p className={cm.cn('text-xs text-on-surface-variant mt-0.5')}>
          {t(
            `settings.toggle.${toggle.key}.description`,
            { appName: APP_NAME },
            { defaultValue: toggle.defaultDescription },
          )}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={cm.cn(
          'relative w-12 h-7 rounded-full transition-colors shrink-0 mt-0.5',
          value ? '' : 'bg-surface-container border border-outline-variant',
        )}
        style={
          value
            ? { background: `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})` }
            : undefined
        }
      >
        <span
          className={cm.cn(
            'absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform',
            value ? 'translate-x-5' : 'translate-x-0.5',
          )}
          aria-hidden="true"
        />
      </button>
    </li>
  )
}

const DEFAULT_TOGGLES: Record<string, boolean> = {
  twoFactor: false,
  loginAlerts: true,
  autoplay: true,
  restrictedMode: false,
  capQuality: false,
  newUploads: true,
  liveAlerts: true,
  commentReplies: true,
  historyOn: true,
  searchHistoryOn: false,
  personalizedAds: false,
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserProfile & { oauthData?: Record<string, unknown> | null }>()
  const [toggles, setToggles] = useState<Record<string, boolean>>(DEFAULT_TOGGLES)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialisedRef = useRef(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Hydrate from GET /api/preferences — a server-side channel that reads
  // `oauthData.preferences` straight from the DB row. The platform user
  // resource NEVER returns `oauthData` on reads (sensitive-column strip), so
  // hydrating from `/api/users/me` would always show the defaults and a
  // reload would silently reset every saved toggle.
  useEffect(() => {
    if (initialisedRef.current) return
    let cancelled = false
    http
      .get('/api/preferences')
      .then((res) => {
        if (cancelled) return
        const env = unwrapSingle<Record<string, unknown>>(res.data) ?? {}
        const prefs = env.preferences
        if (prefs && typeof prefs === 'object') {
          setToggles((prev) => ({ ...prev, ...(prefs as Record<string, boolean>) }))
        }
        initialisedRef.current = true
      })
      .catch(() => {
        initialisedRef.current = true
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const persist = (next: Record<string, boolean>) => {
    if (!user?.id) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        // PATCH /api/preferences merges server-side into the EXISTING
        // oauthData bag — it can never clobber unrelated oauthData keys the
        // way a client-side read-merge against the oauthData-less user
        // snapshot would.
        await http.patch('/api/preferences', { preferences: next })
        setSavedAt(Date.now())
      } catch (_error) {
        // Settings page rolls back nothing on failure — a network blip
        // shouldn't lose the toggle the user just flipped. Next save attempt
        // sends the latest value anyway.
      }
    }, 400)
  }

  const setToggle = (key: string) => (next: boolean) =>
    setToggles((prev) => {
      const updated = { ...prev, [key]: next }
      persist(updated)
      return updated
    })

  const openEditProfile = () => {
    setEditName(user?.name ?? '')
    setProfileError(null)
    setEditingProfile(true)
  }

  const handleSaveProfile = async () => {
    if (!user?.id) return
    const trimmed = editName.trim()
    if (!trimmed) {
      setProfileError(
        t('settings.profileNameRequired', {}, { defaultValue: 'Display name is required.' }),
      )
      return
    }
    setSavingProfile(true)
    setProfileError(null)
    try {
      const res = await http.patch(`/api/users/${user.id}`, { name: trimmed })
      const patched = unwrapSingle<Record<string, unknown>>(res.data) ?? {}
      const merged = { ...(user as unknown as Record<string, unknown>), ...patched, name: trimmed }
      authClient.setUser(merged as unknown as UserProfile)
      setEditingProfile(false)
      setSavedAt(Date.now())
    } catch (err) {
      setProfileError(
        err instanceof Error
          ? err.message
          : t(
              'settings.profileSaveError',
              {},
              { defaultValue: 'Could not save — please try again.' },
            ),
      )
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-10')}>
      <header className={cm.cn('space-y-2')}>
        <p className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
          {t('settings.eyebrow', {}, { defaultValue: 'Account preferences' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn('text-base text-on-surface-variant max-w-2xl')}>
          {t(
            'settings.subheading',
            {},
            {
              defaultValue:
                'Tune playback, notifications, and privacy. Synced across every device you sign in on.',
            },
          )}
        </p>
        {savedAt && (
          <p className={cm.cn('text-xs text-success font-bold')} role="status" aria-live="polite">
            {t('common.saved', {}, { defaultValue: 'Saved' })}
          </p>
        )}
      </header>

      <section
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] text-white p-6 md:p-7 shadow-2xl',
        )}
        style={{ background: `linear-gradient(135deg, ${BRAND_COLOR} 0%, ${ACCENT_COLOR} 100%)` }}
      >
        <div
          className={cm.cn(
            'absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-white/15 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div className={cm.cn('relative z-10 flex items-center gap-5')}>
          <div
            className={cm.cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shrink-0',
            )}
            style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-[36px] text-white')}>
              person
            </span>
          </div>
          <div className={cm.cn('flex-1 min-w-0')}>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-white/70')}>
              {t('settings.profileEyebrow', {}, { defaultValue: 'Signed in as' })}
            </p>
            <h2 className={cm.cn('text-xl md:text-2xl font-extrabold tracking-tight truncate')}>
              {user?.name ||
                user?.email ||
                t(
                  'settings.profilePlaceholder',
                  { appName: APP_NAME },
                  { defaultValue: '{{appName}} member' },
                )}
            </h2>
            {user?.email && <p className={cm.cn('text-sm text-white/80 truncate')}>{user.email}</p>}
          </div>
          <button
            type="button"
            className={cm.cn(
              'hidden sm:inline-flex items-center gap-1.5 px-5 h-11 rounded-full text-xs font-bold uppercase tracking-widest bg-white/20 hover:bg-white/30 backdrop-blur-md transition-colors',
            )}
            onClick={openEditProfile}
          >
            {t('nav.editProfile', {}, { defaultValue: 'Edit profile' })}
            <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
              arrow_forward
            </span>
          </button>
        </div>
        {/* Mobile-only path to the same editor — the inline card button is
            hidden below `sm`, so without this a phone has no way in. */}
        {!editingProfile && (
          <button
            type="button"
            className={cm.cn(
              'relative z-10 sm:hidden mt-4 w-full inline-flex items-center justify-center gap-1.5 px-5 h-11 rounded-full text-xs font-bold uppercase tracking-widest bg-white/20 hover:bg-white/30 backdrop-blur-md transition-colors',
            )}
            onClick={openEditProfile}
          >
            {t('nav.editProfile', {}, { defaultValue: 'Edit profile' })}
            <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
              arrow_forward
            </span>
          </button>
        )}
        {editingProfile && (
          <div
            className={cm.cn(
              'relative z-10 mt-5 rounded-2xl bg-white/95 text-on-surface p-5 space-y-3 shadow-2xl',
            )}
          >
            <p
              className={cm.cn(
                'text-xs font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('settings.editProfileHeading', {}, { defaultValue: 'Edit display name' })}
            </p>
            <label
              htmlFor="settings-edit-name"
              className={cm.cn(
                'block text-[11px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.displayName', {}, { defaultValue: 'Display name' })}
            </label>
            <input
              id="settings-edit-name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={cm.cn(
                cm.sp('px', 4),
                'w-full h-11 bg-surface-container-lowest border border-outline-variant rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
              )}
            />
            {profileError && (
              <p className={cm.cn('text-xs text-error')} role="alert">
                {profileError}
              </p>
            )}
            <div className={cm.cn('flex items-center gap-3 pt-1')}>
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className={cm.cn(
                  'px-4 h-10 rounded-full text-xs font-bold uppercase tracking-widest border border-outline-variant hover:bg-surface-container transition-colors',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="button"
                disabled={savingProfile}
                onClick={() => void handleSaveProfile()}
                className={cm.cn(
                  'inline-flex items-center gap-2 ml-auto px-6 h-10 rounded-full text-xs font-bold uppercase tracking-widest text-white shadow disabled:opacity-50',
                )}
                style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})` }}
              >
                {savingProfile
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
            </div>
          </div>
        )}
      </section>

      <SettingsCard
        title={t('settings.sectionAccount', {}, { defaultValue: 'Account & security' })}
        items={ACCOUNT_TOGGLES}
        toggles={toggles}
        setToggle={setToggle}
      />
      <SettingsCard
        title={t('settings.sectionPlayback', {}, { defaultValue: 'Playback' })}
        items={PLAYBACK_TOGGLES}
        toggles={toggles}
        setToggle={setToggle}
      />
      <SettingsCard
        title={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        items={NOTIFICATION_TOGGLES}
        toggles={toggles}
        setToggle={setToggle}
      />
      <SettingsCard
        title={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
        items={PRIVACY_TOGGLES}
        toggles={toggles}
        setToggle={setToggle}
      />

      <section className={cm.cn('space-y-3')}>
        <h2
          className={cm.cn('text-sm font-black uppercase tracking-widest text-on-surface-variant')}
        >
          {t('footer.language', {}, { defaultValue: 'Language' })}
        </h2>
        <div
          className={cm.cn(cm.sp('p', 5), cm.stack(3), 'rounded-2xl bg-surface-container-lowest')}
        >
          <p className={cm.cn('text-xs text-on-surface-variant')}>
            {t(
              'common.chooseTheLanguage',
              {},
              { defaultValue: 'Choose the language used throughout the app.' },
            )}
          </p>
          <LanguagePicker />
        </div>
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
    </div>
  )
}

function SettingsCard({
  title,
  items,
  toggles,
  setToggle,
}: {
  title: string
  items: SettingsToggle[]
  toggles: Record<string, boolean>
  setToggle: (key: string) => (next: boolean) => void
}) {
  const cm = getClassMap()
  return (
    <section className={cm.cn('space-y-3')}>
      <h2 className={cm.cn('text-sm font-black uppercase tracking-widest text-on-surface-variant')}>
        {title}
      </h2>
      <ul
        className={cm.cn(
          'rounded-2xl bg-surface-container-lowest divide-y divide-outline-variant/40 overflow-hidden',
        )}
      >
        {items.map((toggle) => (
          <ToggleRow
            key={toggle.key}
            toggle={toggle}
            value={!!toggles[toggle.key]}
            onChange={setToggle(toggle.key)}
          />
        ))}
      </ul>
    </section>
  )
}
