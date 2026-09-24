/**
 * Settings — /settings account + notifications + display preferences.
 *
 * Backed by `GET /api/users/:id` (read) and `PATCH /api/users/:id` (write).
 * Username/name/email round-trip through the molecule user-resource update
 * handler. Notification + display toggles are persisted into the user's
 * `oauthData.feedbackPreferences` JSON bag — merged with whatever else lives
 * in `oauthData` so the OAuth tokens/state stored there by other flows are
 * preserved.
 *
 * Every primary control:
 *   - reads its initial value from the freshly-loaded user record,
 *   - on change, writes the change to the API,
 *   - confirms the write by checking the response payload, and
 *   - surfaces an inline status (saved / saving… / failed) so a user knows
 *     whether their change took.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import { getClient as getHttpClient } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useAuth, useTranslation } from '@molecule/app-react'
import { AuthSection } from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, Switch, ThemeToggle } from '@molecule/app-ui-react'

interface UserRecord {
  id: string
  name?: string | null
  email?: string | null
  username?: string | null
  oauthData?: Record<string, unknown> | null
}

interface ForumPreferences {
  emailReplies: boolean
  emailMentions: boolean
  emailDigest: boolean
  pushReplies: boolean
  pushVotes: boolean
  density: 'comfortable' | 'compact' | 'classic'
  showFlair: boolean
  showThumbnails: boolean
}

const DEFAULT_PREFS: ForumPreferences = {
  emailReplies: true,
  emailMentions: true,
  emailDigest: false,
  pushReplies: true,
  pushVotes: false,
  density: 'comfortable',
  showFlair: true,
  showThumbnails: true,
}

function readPrefs(user: UserRecord | null): ForumPreferences {
  const stored = (user?.oauthData as Record<string, unknown> | null | undefined)
    ?.feedbackPreferences
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_PREFS }
  const obj = stored as Record<string, unknown>
  const pickBool = (key: keyof ForumPreferences, fallback: boolean): boolean =>
    typeof obj[key] === 'boolean' ? (obj[key] as boolean) : fallback
  const density =
    obj.density === 'compact' || obj.density === 'classic' ? obj.density : 'comfortable'
  return {
    emailReplies: pickBool('emailReplies', DEFAULT_PREFS.emailReplies),
    emailMentions: pickBool('emailMentions', DEFAULT_PREFS.emailMentions),
    emailDigest: pickBool('emailDigest', DEFAULT_PREFS.emailDigest),
    pushReplies: pickBool('pushReplies', DEFAULT_PREFS.pushReplies),
    pushVotes: pickBool('pushVotes', DEFAULT_PREFS.pushVotes),
    density: density as ForumPreferences['density'],
    showFlair: pickBool('showFlair', DEFAULT_PREFS.showFlair),
    showThumbnails: pickBool('showThumbnails', DEFAULT_PREFS.showThumbnails),
  }
}

interface ToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}

function Toggle({ label, description, checked, onChange, disabled }: ToggleProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), cm.sp('py', 3))}
    >
      <span className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1')}>
        <span className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-on-surface')}>
          {label}
        </span>
        {description && (
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{description}</span>
        )}
      </span>
      {/* Shared accessible Switch (role=switch + aria-checked + 40×40 touch
          hit-area). The visible label text sits to the left, so the control
          gets its accessible name via aria-label. The shared Switch reports
          the new value through a real change event on its hidden checkbox —
          read it off `e.target.checked`. */}
      <Switch
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
      />
    </div>
  )
}

const SECTIONS = [
  { id: 'account', icon: 'person', labelKey: 'settings.sectionAccount', defaultLabel: 'Account' },
  {
    id: 'notifications',
    icon: 'notifications',
    labelKey: 'settings.sectionNotifications',
    defaultLabel: 'Notifications',
  },
  {
    id: 'display',
    icon: 'view_compact',
    labelKey: 'settings.sectionDisplay',
    defaultLabel: 'Display',
  },
  {
    id: 'language',
    icon: 'language',
    labelKey: 'settings.sectionLanguage',
    defaultLabel: 'Language',
  },
] as const

const DENSITY_OPTIONS = [
  { id: 'comfortable', labelKey: 'settings.densityComfortable', defaultLabel: 'Comfortable' },
  { id: 'compact', labelKey: 'settings.densityCompact', defaultLabel: 'Compact' },
  { id: 'classic', labelKey: 'settings.densityClassic', defaultLabel: 'Classic' },
] as const

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ id?: string }>()
  const userId = user?.id ?? null

  const [section, setSection] = useState<(typeof SECTIONS)[number]['id']>('account')
  const [record, setRecord] = useState<UserRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Account form (controlled, save on click).
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [accountStatus, setAccountStatus] = useState<SaveStatus>('idle')
  const [accountError, setAccountError] = useState<string | null>(null)

  // Preferences (auto-save on toggle).
  const [prefs, setPrefs] = useState<ForumPreferences>(DEFAULT_PREFS)
  const [prefsStatus, setPrefsStatus] = useState<SaveStatus>('idle')

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setLoadError(null)
    try {
      const http = getHttpClient()
      const res = await http.get<{ props: UserRecord }>(`/api/users/${userId}`)
      const props = res?.data?.props as UserRecord | undefined
      if (!props) {
        setLoadError(t('settings.loadError', {}, { defaultValue: 'Could not load your account.' }))
        return
      }
      setRecord(props)
      setUsername(props.username ?? '')
      setName(props.name ?? '')
      setEmail(props.email ?? '')
      setPrefs(readPrefs(props))
    } catch (e) {
      setLoadError(
        e instanceof Error
          ? e.message
          : t('settings.loadError', {}, { defaultValue: 'Could not load your account.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [userId, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveAccount = useCallback(async () => {
    if (!userId) return
    setAccountStatus('saving')
    setAccountError(null)
    try {
      const http = getHttpClient()
      const body: Record<string, string> = {}
      // Send each field that's non-empty / changed; the molecule user
      // resource handler validates and returns the updated row.
      if (username.trim()) body.username = username.trim()
      if (name.trim() !== (record?.name ?? '').trim()) body.name = name.trim()
      if (email.trim() !== (record?.email ?? '').trim()) body.email = email.trim()
      if (Object.keys(body).length === 0) {
        setAccountStatus('saved')
        setTimeout(() => setAccountStatus('idle'), 2000)
        return
      }
      const res = await http.patch<{ props?: UserRecord; error?: string }>(
        `/api/users/${userId}`,
        body,
      )
      const data = res?.data
      if (data?.error) {
        setAccountError(data.error)
        setAccountStatus('error')
        return
      }
      setRecord((prev) =>
        prev ? { ...prev, ...(data?.props ?? {}) } : ((data?.props as UserRecord) ?? prev),
      )
      setAccountStatus('saved')
      setTimeout(() => setAccountStatus('idle'), 2000)
    } catch (e) {
      setAccountError(
        e instanceof Error
          ? e.message
          : t('common.saveFailed', {}, { defaultValue: 'Save failed.' }),
      )
      setAccountStatus('error')
    }
  }, [userId, username, name, email, record, t])

  const savePrefs = useCallback(
    async (next: ForumPreferences) => {
      if (!userId) return
      setPrefs(next)
      setPrefsStatus('saving')
      try {
        const http = getHttpClient()
        // Merge preferences into the existing oauthData bag — never
        // clobber unrelated keys (oauth provider state, etc.).
        const currentOauthData =
          (record?.oauthData as Record<string, unknown> | null | undefined) ?? {}
        const mergedOauthData = { ...currentOauthData, feedbackPreferences: next }
        const res = await http.patch<{ props?: UserRecord; error?: string }>(
          `/api/users/${userId}`,
          { oauthData: mergedOauthData },
        )
        if (res?.data?.error) {
          setPrefsStatus('error')
          return
        }
        const props = res?.data?.props
        if (props) {
          setRecord((prev) => (prev ? { ...prev, ...props } : props))
        }
        setPrefsStatus('saved')
        setTimeout(() => setPrefsStatus('idle'), 1500)
      } catch (error) {
        logError('settings.savePrefs', error)
        setPrefsStatus('error')
      }
    },
    [userId, record],
  )

  const togglePref = (key: keyof ForumPreferences, value: ForumPreferences[typeof key]) => {
    void savePrefs({ ...prefs, [key]: value } as ForumPreferences)
  }

  const accountStatusLabel = useMemo(() => {
    switch (accountStatus) {
      case 'saving':
        return t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
      case 'saved':
        return t('common.savedPeriod', {}, { defaultValue: 'Saved.' })
      case 'error':
        return accountError ?? t('common.saveFailed', {}, { defaultValue: 'Save failed.' })
      default:
        return ''
    }
  }, [accountStatus, accountError, t])

  const prefsStatusLabel = useMemo(() => {
    switch (prefsStatus) {
      case 'saving':
        return t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
      case 'saved':
        return t('common.savedPeriod', {}, { defaultValue: 'Saved.' })
      case 'error':
        return t('common.saveFailed', {}, { defaultValue: 'Save failed.' })
      default:
        return ''
    }
  }, [prefsStatus, t])

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-primary',
          )}
        >
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </span>
        <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
      </header>

      {loading && (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('settings.loading', {}, { defaultValue: 'Loading your settings…' })}
        </p>
      )}
      {loadError && (
        <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
          {loadError}
        </p>
      )}

      {!loading && !loadError && (
        <div className={cm.cn('grid gap-6 grid-cols-1 md:grid-cols-[220px_1fr]')}>
          <nav className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            {SECTIONS.map((s) => {
              const isActive = s.id === section
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'rounded-lg border-l-4 transition-colors',
                    isActive
                      ? 'border-primary bg-primary-container/20 text-primary'
                      : 'border-transparent text-on-surface-variant hover:bg-surface-container-low/50 hover:text-on-surface',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-base')}>{s.icon}</span>
                  {t(s.labelKey, {}, { defaultValue: s.defaultLabel })}
                </button>
              )
            })}
          </nav>

          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'md' }),
              cm.sp('p', 6),
              'rounded-xl border border-outline-variant/40 bg-surface',
            )}
          >
            {section === 'account' && (
              <>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                  <h2
                    className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
                  >
                    {t('settings.account', {}, { defaultValue: 'Account' })}
                  </h2>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'settings.accountSubtitle',
                      {},
                      { defaultValue: 'Update your username, email, and display name.' },
                    )}
                  </p>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    void saveAccount()
                  }}
                  className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
                >
                  <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                    <label
                      htmlFor="settings-username"
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.textSize('xs'),
                        'uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('auth.username', {}, { defaultValue: 'Username' })}
                    </label>
                    <input
                      id="settings-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      placeholder={t(
                        'settings.usernamePlaceholder',
                        {},
                        { defaultValue: 'Choose a handle' },
                      )}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        'rounded-lg border border-outline-variant/60 bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30',
                      )}
                    />
                  </div>
                  <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                    <label
                      htmlFor="settings-displayName"
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.textSize('xs'),
                        'uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('form.displayName', {}, { defaultValue: 'Display name' })}
                    </label>
                    <input
                      id="settings-displayName"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        'rounded-lg border border-outline-variant/60 bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30',
                      )}
                    />
                  </div>
                  <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                    <label
                      htmlFor="settings-email"
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.textSize('xs'),
                        'uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                    </label>
                    <input
                      id="settings-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        'rounded-lg border border-outline-variant/60 bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30',
                      )}
                    />
                  </div>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                      cm.sp('mt', 2),
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        accountStatus === 'error' ? 'text-error' : 'text-on-surface-variant',
                      )}
                      role={accountStatus === 'error' ? 'alert' : 'status'}
                      aria-live="polite"
                    >
                      {accountStatusLabel}
                    </span>
                    <button
                      type="submit"
                      disabled={accountStatus === 'saving'}
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        cm.textSize('sm'),
                        cm.sp('px', 5),
                        cm.sp('py', 2),
                        'rounded-full bg-primary text-on-primary disabled:opacity-50 hover:bg-primary-active transition-colors',
                      )}
                    >
                      {t('settings.saveAccount', {}, { defaultValue: 'Save account' })}
                    </button>
                  </div>
                </form>
                {/* Password change + real TOTP two-factor enroll/disable —
                    PATCHes /users/me/password and POSTs /users/:id/verify-two-factor. */}
                <div
                  className={cm.cn(
                    cm.sp('pt', 4),
                    cm.sp('mt', 2),
                    'border-t border-outline-variant/30',
                  )}
                >
                  <AuthSection />
                </div>
              </>
            )}

            {section === 'notifications' && (
              <>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                  <h2
                    className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
                  >
                    {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
                  </h2>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'settings.notificationsSubtitle',
                      {},
                      { defaultValue: 'Decide what reaches your inbox vs your push device.' },
                    )}
                  </p>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col' }),
                    'divide-y divide-outline-variant/30',
                  )}
                >
                  <Toggle
                    label={t(
                      'settings.emailRepliesLabel',
                      {},
                      { defaultValue: 'Email me on replies' },
                    )}
                    description={t(
                      'settings.emailRepliesDesc',
                      {},
                      { defaultValue: 'Threads you started or replied to.' },
                    )}
                    checked={prefs.emailReplies}
                    onChange={(v) => togglePref('emailReplies', v)}
                    disabled={prefsStatus === 'saving'}
                  />
                  <Toggle
                    label={t(
                      'settings.emailMentionsLabel',
                      {},
                      { defaultValue: 'Email me on mentions' },
                    )}
                    description={t(
                      'settings.emailMentionsDesc',
                      {},
                      { defaultValue: 'When someone replies to a post you follow.' },
                    )}
                    checked={prefs.emailMentions}
                    onChange={(v) => togglePref('emailMentions', v)}
                    disabled={prefsStatus === 'saving'}
                  />
                  <Toggle
                    label={t('settings.emailDigestLabel', {}, { defaultValue: 'Weekly digest' })}
                    description={t(
                      'settings.emailDigestDesc',
                      {},
                      {
                        defaultValue: 'The top-voted open requests every Monday.',
                      },
                    )}
                    checked={prefs.emailDigest}
                    onChange={(v) => togglePref('emailDigest', v)}
                    disabled={prefsStatus === 'saving'}
                  />
                  <Toggle
                    label={t('settings.pushRepliesLabel', {}, { defaultValue: 'Push for replies' })}
                    checked={prefs.pushReplies}
                    onChange={(v) => togglePref('pushReplies', v)}
                    disabled={prefsStatus === 'saving'}
                  />
                  <Toggle
                    label={t(
                      'settings.pushVotesLabel',
                      {},
                      { defaultValue: 'Push for upvote milestones' },
                    )}
                    description={t(
                      'settings.pushVotesDesc',
                      {},
                      { defaultValue: 'Threshold ping at 100, 500, 1000.' },
                    )}
                    checked={prefs.pushVotes}
                    onChange={(v) => togglePref('pushVotes', v)}
                    disabled={prefsStatus === 'saving'}
                  />
                </div>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    prefsStatus === 'error' ? 'text-error' : 'text-on-surface-variant',
                  )}
                  role="status"
                  aria-live="polite"
                >
                  {prefsStatusLabel}
                </span>
              </>
            )}

            {section === 'display' && (
              <>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                  <h2
                    className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
                  >
                    {t('settings.displayTitle', {}, { defaultValue: 'Display' })}
                  </h2>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'settings.displaySubtitle',
                      {},
                      { defaultValue: 'Choose how dense feeds feel.' },
                    )}
                  </p>
                </div>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
                  {DENSITY_OPTIONS.map((option) => {
                    const isActive = option.id === prefs.density
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => togglePref('density', option.id)}
                        disabled={prefsStatus === 'saving'}
                        aria-pressed={isActive}
                        data-testid={`density-${option.id}`}
                        className={cm.cn(
                          cm.fontWeight('semibold'),
                          cm.textSize('sm'),
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          'rounded-full border transition-colors',
                          isActive
                            ? 'border-primary bg-primary-container/30 text-primary'
                            : 'border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/50',
                        )}
                      >
                        {t(option.labelKey, {}, { defaultValue: option.defaultLabel })}
                      </button>
                    )
                  })}
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col' }),
                    'divide-y divide-outline-variant/30',
                  )}
                >
                  <Toggle
                    label={t(
                      'settings.showFlair',
                      {},
                      { defaultValue: 'Show board chips on posts' },
                    )}
                    checked={prefs.showFlair}
                    onChange={(v) => togglePref('showFlair', v)}
                    disabled={prefsStatus === 'saving'}
                  />
                  <Toggle
                    label={t(
                      'settings.showThumbnails',
                      {},
                      { defaultValue: 'Show link/image thumbnails' },
                    )}
                    checked={prefs.showThumbnails}
                    onChange={(v) => togglePref('showThumbnails', v)}
                    disabled={prefsStatus === 'saving'}
                  />
                </div>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    prefsStatus === 'error' ? 'text-error' : 'text-on-surface-variant',
                  )}
                  role="status"
                  aria-live="polite"
                >
                  {prefsStatusLabel}
                </span>
              </>
            )}

            {section === 'language' && (
              <>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                  <h2
                    className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
                  >
                    {t('footer.language', {}, { defaultValue: 'Language' })}
                  </h2>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'common.chooseTheLanguage',
                      {},
                      { defaultValue: 'Choose the language used throughout the app.' },
                    )}
                  </p>
                </div>
                <LanguagePicker />
              </>
            )}
          </div>
          <section
            className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl md:col-span-2')}
          >
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
      )}
    </div>
  )
}

export default Settings
