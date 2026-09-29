import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { vividGradient } from '../lib/sample-feed.js'

interface SectionDef {
  key: string
  defaultLabel: string
  icon: string
}

const SECTIONS: SectionDef[] = [
  { key: 'profile', defaultLabel: 'Edit profile', icon: 'person' },
  { key: 'account', defaultLabel: 'Account & security', icon: 'shield' },
  { key: 'notifications', defaultLabel: 'Notifications', icon: 'notifications' },
  { key: 'privacy', defaultLabel: 'Privacy & visibility', icon: 'visibility_lock' },
  { key: 'language', defaultLabel: 'Language', icon: 'translate' },
  { key: 'subscriptions', defaultLabel: 'Plan & billing', icon: 'workspace_premium' },
]

interface MeProfile {
  id: string
  display_name: string
  handle: string
  bio: string
  cover_index: number
  is_verified: boolean
  follower_count: number
  following_count: number
  post_count: number
}

interface SocialPreferences {
  notifLikes?: boolean
  notifComments?: boolean
  notifFollows?: boolean
  notifLive?: boolean
  privPrivate?: boolean
  privActivity?: boolean
  privTagging?: boolean
  twoFactor?: boolean
}

type UserWithPrefs = UserProfile & { email?: string }

const DEFAULT_PREFS: Required<SocialPreferences> = {
  notifLikes: true,
  notifComments: true,
  notifFollows: false,
  notifLive: true,
  privPrivate: false,
  privActivity: true,
  privTagging: true,
  twoFactor: false,
}

/**
 * Settings — left rail of categories + right pane editor. Real-backed:
 *   - Loads /api/profile/me for the profile block + /api/preferences for the
 *     server-side preference/bio slice (the platform user resource NEVER
 *     returns `oauthData` on reads, so prefs must be read/merged server-side)
 *   - PATCH /api/users/:id with `name` for display_name on blur
 *   - PATCH /api/preferences with `{ preferences: { key: bool } }` for toggles
 *     and `{ bio }` for the bio — the API merges into users.oauthData
 *   - Round-trips across reload via /api/preferences + /api/profile/me
 */
export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user, setUser } = useAuth<UserWithPrefs>()
  const [active, setActive] = useState<string>('profile')
  const [profile, setProfile] = useState<MeProfile | null>(null)
  const [prefs, setPrefs] = useState<Required<SocialPreferences>>(DEFAULT_PREFS)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const userId = user?.id

  // Initial load — hydrate display name from /api/profile/me, prefs + bio from
  // the server-side /api/preferences channel.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!userId) return
      try {
        const [meRes, prefsRes] = await Promise.all([
          http.get<MeProfile>('/profile/me'),
          http.get<{ bio?: string; preferences?: SocialPreferences }>('/preferences'),
        ])
        if (cancelled) return
        if (meRes.data) {
          setProfile({
            ...meRes.data,
            // /preferences is authoritative for bio — profile may fall back to ''
            bio: prefsRes.data?.bio ?? meRes.data.bio,
          })
        }
        const stored = prefsRes.data?.preferences
        if (stored) setPrefs({ ...DEFAULT_PREFS, ...stored })
        setLoaded(true)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load profile')
        setLoaded(true)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [http, userId])

  const saveDisplayName = useCallback(
    async (next: string) => {
      if (!userId || !profile) return
      if (next === profile.display_name) return
      setSaving(true)
      setError(null)
      try {
        await http.patch(`/users/${userId}`, { name: next })
        setProfile((prev) => (prev ? { ...prev, display_name: next } : prev))
        setSavedAt(Date.now())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not update display name')
      } finally {
        setSaving(false)
      }
    },
    [http, userId, profile],
  )

  const saveEmail = useCallback(
    async (next: string) => {
      if (!userId || !user) return
      const trimmed = next.trim()
      if (trimmed === (user.email ?? '')) return
      if (!trimmed) return
      setSaving(true)
      setError(null)
      try {
        await http.patch(`/users/${userId}`, { email: trimmed })
        // Update the auth cache so a reload reflects the new email.
        setUser({ ...user, email: trimmed })
        setSavedAt(Date.now())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not update email')
      } finally {
        setSaving(false)
      }
    },
    [http, userId, user, setUser],
  )

  const saveBio = useCallback(
    async (next: string) => {
      if (!userId || !profile) return
      if (next === profile.bio) return
      setSaving(true)
      setError(null)
      try {
        // bio lives on users.oauthData with no dedicated column — persisted
        // through the server-side /preferences channel, which merges into the
        // existing oauthData (a client-side read-merge would clobber prefs,
        // since user reads never return oauthData).
        await http.patch('/preferences', { bio: next })
        setProfile((prev) => (prev ? { ...prev, bio: next } : prev))
        setSavedAt(Date.now())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not update bio')
      } finally {
        setSaving(false)
      }
    },
    [http, userId, profile],
  )

  const togglePref = useCallback(
    async (key: keyof SocialPreferences) => {
      if (!userId) return
      const next = { ...prefs, [key]: !prefs[key] }
      setPrefs(next)
      setSaving(true)
      setError(null)
      try {
        // Server-side merge: only the flipped key is sent, the API merges it
        // into users.oauthData.socialPreferences and returns the full slice.
        const res = await http.patch<{ preferences?: Partial<SocialPreferences> }>('/preferences', {
          preferences: { [key]: !prefs[key] },
        })
        if (res.data?.preferences) {
          setPrefs((prev) => ({ ...prev, ...res.data!.preferences }))
        }
        setSavedAt(Date.now())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save preference')
        setPrefs((prev) => ({ ...prev, [key]: !next[key] }))
      } finally {
        setSaving(false)
      }
    },
    [http, userId, prefs],
  )

  const cover = useMemo(() => vividGradient(profile?.cover_index ?? 0), [profile])

  if (!loaded) {
    return (
      <div className={cm.cn(cm.sp('p', 6), cm.sp('py', 8), 'lg:px-10 mx-auto w-full max-w-6xl')}>
        <p
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          data-testid="settings-loading"
        >
          {t('settings.loading', {}, { defaultValue: 'Loading settings…' })}
        </p>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('p', 6), cm.sp('py', 8), 'lg:px-10 mx-auto w-full max-w-6xl')}>
      <header className={cm.cn(cm.sp('mb', 6))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight md:text-4xl mt-1')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        {error && (
          <p
            className={cm.cn(cm.textSize('sm'), 'text-red-700 dark:text-red-300 mt-2')}
            role="alert"
            data-testid="settings-error"
          >
            {error}
          </p>
        )}
        {savedAt && !error && (
          <p
            className={cm.cn(cm.textSize('xs'), 'text-emerald-600 dark:text-emerald-400 mt-1')}
            data-testid="settings-saved"
          >
            {saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.saved', {}, { defaultValue: 'Saved' })}
          </p>
        )}
      </header>

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-6')}>
        <aside className={cm.cn('lg:col-span-4')}>
          <div
            className={cm.cn(
              cm.sp('p', 4),
              'bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-sm flex items-center gap-3 mb-4',
            )}
          >
            <span
              className={cm.cn(
                'inline-flex w-12 h-12 rounded-full items-center justify-center text-white font-extrabold shadow-sm',
              )}
              style={{ background: cover }}
              aria-hidden="true"
            >
              {(profile?.display_name || '?').charAt(0)}
            </span>
            <div className={cm.cn('min-w-0')}>
              <p
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'truncate')}
                data-testid="settings-current-name"
              >
                {profile?.display_name || '—'}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                @{profile?.handle || '…'}
              </p>
            </div>
          </div>
          <nav
            className={cm.cn(
              'bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden',
            )}
          >
            <ul>
              {SECTIONS.map((s) => {
                const isActive = active === s.key
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => setActive(s.key)}
                      data-testid={`settings-tab-${s.key}`}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.flex({ align: 'center', gap: 'sm' }),
                        'w-full text-left transition-colors',
                        isActive ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container-low',
                      )}
                    >
                      <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                        {s.icon}
                      </span>
                      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                        {t(`settings.section.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                      </span>
                      <span
                        className={cm.cn(
                          'ml-auto material-symbols-outlined text-[18px] text-on-surface-variant',
                        )}
                      >
                        chevron_right
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        <section
          className={cm.cn(
            'lg:col-span-8 bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden',
          )}
        >
          <div className={cm.cn(cm.sp('p', 6))}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('settings.previewEyebrow', {}, { defaultValue: 'Editing' })}
            </p>
            <h2 className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight mt-1')}>
              {t(
                `settings.section.${active}`,
                {},
                {
                  defaultValue: SECTIONS.find((s) => s.key === active)?.defaultLabel ?? 'Section',
                },
              )}
            </h2>

            {active === 'profile' && profile && (
              <div className={cm.cn(cm.sp('mt', 6), cm.flex({ direction: 'col', gap: 'md' }))}>
                <SaveOnBlurField
                  label={t('settings.profile.displayName', {}, { defaultValue: 'Display name' })}
                  testId="settings-displayname"
                  value={profile.display_name}
                  icon="badge"
                  onSave={saveDisplayName}
                />
                <ReadOnlyField
                  label={t('settings.profile.handle', {}, { defaultValue: 'Handle' })}
                  value={`@${profile.handle}`}
                  icon="alternate_email"
                  testId="settings-handle"
                />
                <SaveOnBlurField
                  label={t('form.bio', {}, { defaultValue: 'Bio' })}
                  testId="settings-bio"
                  value={profile.bio}
                  icon="description"
                  multiline
                  onSave={saveBio}
                />
              </div>
            )}

            {active === 'account' && user && (
              <div className={cm.cn(cm.sp('mt', 6), cm.flex({ direction: 'col', gap: 'md' }))}>
                <SaveOnBlurField
                  label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                  testId="settings-email"
                  value={user.email ?? ''}
                  icon="mail"
                  inputType="email"
                  onSave={saveEmail}
                />
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'settings.account.passwordNote',
                    {},
                    {
                      defaultValue:
                        'Open the account menu (your avatar) to change password or delete your account.',
                    },
                  )}
                </p>
                <h3
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('lg'),
                    cm.sp('mt', 4),
                    'text-on-surface',
                  )}
                >
                  {t('settings.account.securityHeading', {}, { defaultValue: 'Security' })}
                </h3>
                <Toggle
                  label={t(
                    'settings.account.twoFactor',
                    {},
                    { defaultValue: 'Two-Factor Authentication' },
                  )}
                  description={t(
                    'settings.account.twoFactorDesc',
                    {},
                    { defaultValue: 'Add an extra layer of security to your account.' },
                  )}
                  on={prefs.twoFactor}
                  testId="toggle-two-factor"
                  onToggle={() => togglePref('twoFactor')}
                />
              </div>
            )}

            {active === 'notifications' && (
              <div className={cm.cn(cm.sp('mt', 6), cm.flex({ direction: 'col', gap: 'md' }))}>
                <Toggle
                  label={t('settings.notif.likes', {}, { defaultValue: 'Likes & reactions' })}
                  description={t(
                    'settings.notif.likesDesc',
                    {},
                    { defaultValue: 'Push when someone reacts to your posts.' },
                  )}
                  on={prefs.notifLikes}
                  testId="toggle-notif-likes"
                  onToggle={() => togglePref('notifLikes')}
                />
                <Toggle
                  label={t('settings.notif.comments', {}, { defaultValue: 'Comments & replies' })}
                  description={t(
                    'settings.notif.commentsDesc',
                    {},
                    { defaultValue: 'Push for direct replies and threaded comments.' },
                  )}
                  on={prefs.notifComments}
                  testId="toggle-notif-comments"
                  onToggle={() => togglePref('notifComments')}
                />
                <Toggle
                  label={t('settings.notif.follows', {}, { defaultValue: 'New followers' })}
                  description={t(
                    'settings.notif.followsDesc',
                    {},
                    { defaultValue: 'Daily digest, never per-event.' },
                  )}
                  on={prefs.notifFollows}
                  testId="toggle-notif-follows"
                  onToggle={() => togglePref('notifFollows')}
                />
                <Toggle
                  label={t('settings.notif.live', {}, { defaultValue: 'Live alerts' })}
                  description={t(
                    'settings.notif.liveDesc',
                    {},
                    { defaultValue: 'Push when accounts you follow go live.' },
                  )}
                  on={prefs.notifLive}
                  testId="toggle-notif-live"
                  onToggle={() => togglePref('notifLive')}
                />
              </div>
            )}

            {active === 'privacy' && (
              <div className={cm.cn(cm.sp('mt', 6), cm.flex({ direction: 'col', gap: 'md' }))}>
                <Toggle
                  label={t('settings.priv.private', {}, { defaultValue: 'Private account' })}
                  description={t(
                    'settings.priv.privateDesc',
                    {},
                    { defaultValue: 'Only approved followers see your posts.' },
                  )}
                  on={prefs.privPrivate}
                  testId="toggle-priv-private"
                  onToggle={() => togglePref('privPrivate')}
                />
                <Toggle
                  label={t('settings.priv.activity', {}, { defaultValue: 'Activity status' })}
                  description={t(
                    'settings.priv.activityDesc',
                    {},
                    { defaultValue: 'Show your online dot on stories and DMs.' },
                  )}
                  on={prefs.privActivity}
                  testId="toggle-priv-activity"
                  onToggle={() => togglePref('privActivity')}
                />
                <Toggle
                  label={t('settings.priv.tagging', {}, { defaultValue: 'Tagging permission' })}
                  description={t(
                    'settings.priv.taggingDesc',
                    {},
                    { defaultValue: 'Only people you follow can tag you.' },
                  )}
                  on={prefs.privTagging}
                  testId="toggle-priv-tagging"
                  onToggle={() => togglePref('privTagging')}
                />
              </div>
            )}

            {active === 'language' && (
              <div className={cm.cn(cm.sp('mt', 6), cm.flex({ direction: 'col', gap: 'md' }))}>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'common.chooseTheLanguage',
                    {},
                    { defaultValue: 'Choose the language used throughout the app.' },
                  )}
                </p>
                <LanguagePicker />
              </div>
            )}

            {active === 'subscriptions' && (
              <div className={cm.cn(cm.sp('mt', 6), cm.flex({ direction: 'col', gap: 'md' }))}>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                  {t(
                    'settings.billing.body',
                    {},
                    {
                      defaultValue:
                        'Visit the Pricing page to upgrade your plan and manage your subscription.',
                    },
                  )}
                </p>
                <Link
                  to="/pricing"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    'inline-flex items-center gap-2 self-start rounded-full text-sm font-bold bg-primary text-on-primary',
                  )}
                  data-testid="settings-go-pricing"
                >
                  {t('settings.billing.cta', {}, { defaultValue: 'View pricing & plans' })}
                  <span
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                    aria-hidden="true"
                  >
                    arrow_forward
                  </span>
                </Link>
              </div>
            )}
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
    </div>
  )
}

function SaveOnBlurField({
  label,
  value,
  icon,
  multiline,
  inputType,
  testId,
  onSave,
}: {
  label: string
  value: string
  icon: string
  multiline?: boolean
  inputType?: string
  testId?: string
  onSave: (v: string) => Promise<void> | void
}) {
  const cm = getClassMap()
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  const commit = () => {
    if (draft !== value) void onSave(draft)
  }

  return (
    <label className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          cm.sp('ml', 1),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      <span
        className={cm.cn(
          cm.flex({ align: 'start' }),
          cm.sp('px', 4),
          'bg-surface-container-low rounded-t-lg py-3 border-b-2 border-outline focus-within:border-primary transition-colors',
        )}
      >
        <span
          className={cm.cn(
            cm.sp('mr', 3),
            cm.textSize('xl'),
            'material-symbols-outlined text-outline mt-0.5',
          )}
        >
          {icon}
        </span>
        {multiline ? (
          <textarea
            data-testid={testId}
            className={cm.cn(
              cm.w('full'),
              cm.sp('p', 0),
              cm.fontWeight('medium'),
              'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline/60 resize-none min-h-[60px]',
            )}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
          />
        ) : (
          <input
            type={inputType ?? 'text'}
            data-testid={testId}
            className={cm.cn(
              cm.w('full'),
              cm.sp('p', 0),
              cm.fontWeight('medium'),
              'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline/60',
            )}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ;(e.target as HTMLInputElement).blur()
              }
            }}
          />
        )}
      </span>
    </label>
  )
}

function ReadOnlyField({
  label,
  value,
  icon,
  testId,
}: {
  label: string
  value: string
  icon: string
  testId?: string
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          cm.sp('ml', 1),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      <span
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 4),
          'bg-surface-container-low rounded-t-lg py-3 border-b-2 border-outline-variant',
        )}
      >
        <span
          className={cm.cn(
            cm.sp('mr', 3),
            cm.textSize('xl'),
            'material-symbols-outlined text-outline',
          )}
        >
          {icon}
        </span>
        <span className={cm.cn(cm.fontWeight('medium'), 'text-on-surface')} data-testid={testId}>
          {value}
        </span>
      </span>
    </div>
  )
}

function Toggle({
  label,
  description,
  on,
  onToggle,
  testId,
}: {
  label: string
  description: string
  on: boolean
  onToggle: () => void
  testId?: string
}) {
  const cm = getClassMap()
  return (
    <button
      type="button"
      onClick={onToggle}
      data-testid={testId}
      className={cm.cn(
        cm.sp('p', 4),
        'w-full text-left bg-surface-container-low rounded-xl border border-outline-variant/40 hover:border-primary transition-colors flex items-center gap-3',
      )}
      aria-pressed={on}
    >
      <span className={cm.cn('flex-1 min-w-0')}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>{label}</p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{description}</p>
      </span>
      <span
        className={cm.cn(
          'relative shrink-0 inline-block w-11 h-6 rounded-full transition-colors',
          on ? 'bg-primary' : 'bg-outline-variant',
        )}
        aria-hidden="true"
      >
        <span
          className={cm.cn(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
            on ? 'right-0.5' : 'left-0.5',
          )}
        />
      </span>
    </button>
  )
}
