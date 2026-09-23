import { useCallback, useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation, useUser } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

const SECTIONS = ['identity', 'preferences', 'notifications'] as const
type Section = (typeof SECTIONS)[number]

type SpeakerColor = 1 | 2 | 3 | 4 | 5

const SPEAKER_SWATCHES: { key: SpeakerColor; name: string }[] = [
  { key: 1, name: 'Indigo' },
  { key: 2, name: 'Pink' },
  { key: 3, name: 'Orange' },
  { key: 4, name: 'Teal' },
  { key: 5, name: 'Violet' },
]

const TIMEZONES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Australia/Sydney',
]

interface ProfilePrefs {
  displayName: string
  bio: string
  speakerColor: SpeakerColor
  timezone: string
  jobTitle: string
  notifyMentions: boolean
  notifyAssignments: boolean
  notifySummaries: boolean
}

interface UserRow {
  id: string
  email?: string | null
  name?: string | null
}

interface UserReadEnvelope {
  props?: UserRow
}

/**
 * Server-side settings channel (`/api/settings/me`). The platform user
 * resource never returns `oauthData` on reads, so the profile slice MUST
 * round-trip through this channel — hydrating from GET /api/users/:id would
 * silently reset to defaults every load.
 */
interface ProfileMeResponse {
  id: string
  name?: string | null
  email?: string | null
  profile?: Partial<ProfilePrefs>
}

const DEFAULT_PREFS: ProfilePrefs = {
  displayName: '',
  bio: '',
  speakerColor: 1,
  timezone: 'America/Los_Angeles',
  jobTitle: '',
  notifyMentions: true,
  notifyAssignments: true,
  notifySummaries: false,
}

function deriveInitials(name: string, email: string): string {
  const candidate = (name || email || 'User').trim()
  if (!candidate) return '··'
  const parts = candidate.split(/[@\s._-]+/).filter(Boolean)
  if (parts.length === 0) return '··'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function extractUser(payload: unknown): UserRow | null {
  if (!payload || typeof payload !== 'object') return null
  const data = payload as UserReadEnvelope & UserRow
  if (data.props && typeof data.props === 'object') return data.props
  if ('id' in data && typeof (data as UserRow).id === 'string') return data as UserRow
  return null
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const sessionUser = useUser<{ id: string; email?: string; name?: string }>()
  const userId = sessionUser?.id ?? ''

  const [section, setSection] = useState<Section>('identity')
  const [user, setUser] = useState<UserRow | null>(null)
  const [prefs, setPrefs] = useState<ProfilePrefs>(DEFAULT_PREFS)
  const [savedPrefs, setSavedPrefs] = useState<ProfilePrefs>(DEFAULT_PREFS)
  const [email, setEmail] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<ProfileMeResponse>('/api/settings/me')
      const me = res.data
      setUser({ id: me?.id ?? userId, email: me?.email, name: me?.name })
      const stored = (me?.profile ?? {}) as Partial<ProfilePrefs>
      const merged: ProfilePrefs = {
        ...DEFAULT_PREFS,
        displayName: stored.displayName ?? me?.name ?? '',
        bio: stored.bio ?? '',
        speakerColor: (stored.speakerColor ?? 1) as SpeakerColor,
        timezone: stored.timezone ?? 'America/Los_Angeles',
        jobTitle: stored.jobTitle ?? '',
        notifyMentions: stored.notifyMentions ?? true,
        notifyAssignments: stored.notifyAssignments ?? true,
        notifySummaries: stored.notifySummaries ?? false,
      }
      setPrefs(merged)
      setSavedPrefs(merged)
      setEmail(me?.email ?? sessionUser?.email ?? '')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('profile.loadError', {}, { defaultValue: 'Failed to load profile.' }),
      )
    } finally {
      setLoading(false)
    }
    // sessionUser?.email is read as the email fallback above.
  }, [http, userId, sessionUser?.email, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const dirty = useMemo(
    () => JSON.stringify(prefs) !== JSON.stringify(savedPrefs),
    [prefs, savedPrefs],
  )

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    setError(null)
    setSaveStatus('idle')
    try {
      await http.patch<ProfileMeResponse>('/api/settings/me', {
        name: prefs.displayName,
        profile: {
          displayName: prefs.displayName,
          bio: prefs.bio,
          speakerColor: prefs.speakerColor,
          timezone: prefs.timezone,
          jobTitle: prefs.jobTitle,
          notifyMentions: prefs.notifyMentions,
          notifyAssignments: prefs.notifyAssignments,
          notifySummaries: prefs.notifySummaries,
        },
      })
      setSavedPrefs(prefs)
      setSaveStatus('saved')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('profile.saveError', {}, { defaultValue: 'Save failed.' }),
      )
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setPrefs(savedPrefs)
    setSaveStatus('idle')
    setError(null)
  }

  // Email saves independently on blur (mirrors the shared AccountSection):
  // PATCH /api/users/:id with { email }, reverting + surfacing an error on
  // failure. Display name + the other preference fields still save together
  // via the "Save changes" button.
  const saveEmail = async () => {
    if (!userId) return
    const current = user?.email ?? ''
    if (email === current || !email) return
    setEmailSaving(true)
    setEmailError(null)
    try {
      const res = await http.patch<UserReadEnvelope>(`/api/users/${userId}`, { email })
      const fresh = extractUser(res.data)
      if (fresh) setUser(fresh)
    } catch (err) {
      setEmailError(
        err instanceof Error
          ? err.message
          : t('profile.emailError', {}, { defaultValue: 'Failed to update email.' }),
      )
      setEmail(current)
    } finally {
      setEmailSaving(false)
    }
  }

  const initials = deriveInitials(
    prefs.displayName,
    email || user?.email || sessionUser?.email || '',
  )

  return (
    <div
      data-mol-id="profile-page"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.grid({ cols: 12, gap: 'lg' }))}
    >
      <aside className={cm.cn('col-span-12 md:col-span-3')}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 1))}>
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
          {t(
            'profile.subheading',
            { appName: APP_NAME },
            { defaultValue: 'How you appear inside {{appName}}.' },
          )}
        </p>
        <nav
          className={cm.cn(cm.stack(1))}
          aria-label={t('profile.navLabel', {}, { defaultValue: 'Profile sections' })}
        >
          {SECTIONS.map((s) => {
            const isActive = section === s
            return (
              <button
                key={s}
                type="button"
                data-mol-id={`profile-section-${s}`}
                onClick={() => setSection(s)}
                aria-current={isActive ? 'page' : undefined}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block w-full text-left rounded-md transition-colors',
                  isActive
                    ? cm.cn('bg-primary-container', cm.textPrimary)
                    : cm.cn(
                        'text-on-surface-variant',
                        'hover:bg-surface-container hover:text-on-surface',
                      ),
                )}
              >
                {t(
                  `profile.section.${s}`,
                  {},
                  { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      <main className={cm.cn('col-span-12 md:col-span-9', cm.stack(4))}>
        {loading ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
            {t('profile.loading', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : (
          <>
            {section === 'identity' && (
              <section
                data-mol-id="profile-section-identity-panel"
                className={cm.cn(cm.card(), cm.sp('p', 6), cm.stack(5))}
              >
                <header>
                  <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                    {t('nav.identity', {}, { defaultValue: 'Identity' })}
                  </h2>
                  <p
                    className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}
                  >
                    {t(
                      'profile.identity.subheading',
                      {},
                      { defaultValue: 'Visible on your meetings, transcripts, and shared notes.' },
                    )}
                  </p>
                </header>

                <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                  <span
                    aria-label={t(
                      'profile.identity.avatarLabel',
                      { initials },
                      { defaultValue: 'Avatar with initials {{initials}}' },
                    )}
                    className={cm.cn(
                      'h-20 w-20 grid place-items-center text-on-primary',
                      cm.roundedFull,
                      cm.textSize('2xl'),
                      cm.fontWeight('bold'),
                    )}
                    style={{ backgroundColor: `var(--color-speaker-${prefs.speakerColor})` }}
                  >
                    {initials}
                  </span>
                </div>

                <label className={cm.cn(cm.stack(1))}>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {t('form.displayName', {}, { defaultValue: 'Display name' })}
                  </span>
                  <input
                    type="text"
                    data-mol-id="profile-display-name"
                    value={prefs.displayName}
                    onChange={(e) => setPrefs({ ...prefs, displayName: e.target.value })}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      'w-full border border-outline-variant rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30',
                    )}
                  />
                </label>

                <label className={cm.cn(cm.stack(1))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                    )}
                  >
                    {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                    {emailSaving ? (
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })}
                      </span>
                    ) : null}
                  </span>
                  <input
                    type="email"
                    data-mol-id="profile-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={saveEmail}
                    autoComplete="email"
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      'w-full border border-outline-variant rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30',
                    )}
                  />
                  {emailError ? (
                    <span
                      data-mol-id="profile-email-error"
                      role="alert"
                      className={cm.cn(cm.textSize('xs'), 'text-error')}
                    >
                      {emailError}
                    </span>
                  ) : null}
                </label>

                <label className={cm.cn(cm.stack(1))}>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {t('form.bio', {}, { defaultValue: 'Bio' })}
                  </span>
                  <textarea
                    rows={3}
                    data-mol-id="profile-bio"
                    value={prefs.bio}
                    onChange={(e) => setPrefs({ ...prefs, bio: e.target.value })}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      'w-full border border-outline-variant rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30',
                    )}
                  />
                </label>
              </section>
            )}

            {section === 'preferences' && (
              <section
                data-mol-id="profile-section-preferences-panel"
                className={cm.cn(cm.card(), cm.sp('p', 6), cm.stack(5))}
              >
                <header>
                  <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                    {t('nav.preferences', {}, { defaultValue: 'Preferences' })}
                  </h2>
                  <p
                    className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}
                  >
                    {t(
                      'profile.preferences.subheading',
                      {},
                      { defaultValue: 'Defaults that apply to every recording you join.' },
                    )}
                  </p>
                </header>

                <div>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), cm.sp('mb', 2))}>
                    {t(
                      'profile.preferences.speakerColor',
                      {},
                      { defaultValue: 'Default speaker color' },
                    )}
                  </p>
                  <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }))}>
                    {SPEAKER_SWATCHES.map((s) => {
                      const isActive = prefs.speakerColor === s.key
                      return (
                        <button
                          key={s.key}
                          type="button"
                          data-mol-id={`profile-speaker-color-${s.key}`}
                          onClick={() => setPrefs({ ...prefs, speakerColor: s.key })}
                          aria-label={t(
                            `profile.preferences.color.${s.key}`,
                            {},
                            { defaultValue: s.name },
                          )}
                          aria-pressed={isActive}
                          className={cm.cn(
                            'h-10 w-10 grid place-items-center transition-transform hover:scale-105',
                            cm.roundedFull,
                            isActive ? 'ring-2 ring-offset-2 ring-on-surface' : '',
                          )}
                          style={{ backgroundColor: `var(--color-speaker-${s.key})` }}
                        >
                          {isActive ? (
                            <span
                              className={cm.cn('material-symbols-outlined text-on-primary')}
                              aria-hidden="true"
                              style={{ fontSize: 20 }}
                            >
                              check
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <label className={cm.cn(cm.stack(1))}>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {t('profile.preferences.timezone', {}, { defaultValue: 'Time zone' })}
                  </span>
                  <select
                    value={prefs.timezone}
                    data-mol-id="profile-timezone"
                    onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      'w-full border border-outline-variant rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30',
                    )}
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={cm.cn(cm.stack(1))}>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {t('profile.preferences.title', {}, { defaultValue: 'Job title' })}
                  </span>
                  <input
                    type="text"
                    data-mol-id="profile-job-title"
                    value={prefs.jobTitle}
                    onChange={(e) => setPrefs({ ...prefs, jobTitle: e.target.value })}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      'w-full border border-outline-variant rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30',
                    )}
                  />
                </label>
              </section>
            )}

            {section === 'notifications' && (
              <section
                data-mol-id="profile-section-notifications-panel"
                className={cm.cn(cm.card(), cm.sp('p', 6), cm.stack(4))}
              >
                <header>
                  <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                    {t(
                      'nav.notificationPreferences',
                      {},
                      { defaultValue: 'Notification preferences' },
                    )}
                  </h2>
                  <p
                    className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}
                  >
                    {t(
                      'profile.notifications.subheading',
                      { appName: APP_NAME },
                      { defaultValue: 'Choose which {{appName}} events should reach you.' },
                    )}
                  </p>
                </header>

                <Toggle
                  molId="profile-notify-mentions"
                  label={t(
                    'profile.notifications.mentions',
                    {},
                    { defaultValue: 'Mentions in transcripts' },
                  )}
                  hint={t(
                    'profile.notifications.mentionsHint',
                    {},
                    { defaultValue: 'Email + push when someone @-mentions you.' },
                  )}
                  checked={prefs.notifyMentions}
                  onChange={(v) => setPrefs({ ...prefs, notifyMentions: v })}
                />
                <Toggle
                  molId="profile-notify-assignments"
                  label={t(
                    'profile.notifications.assignments',
                    {},
                    { defaultValue: 'Action items assigned to me' },
                  )}
                  hint={t(
                    'profile.notifications.assignmentsHint',
                    {},
                    { defaultValue: 'Notify when an action item is captured for you.' },
                  )}
                  checked={prefs.notifyAssignments}
                  onChange={(v) => setPrefs({ ...prefs, notifyAssignments: v })}
                />
                <Toggle
                  molId="profile-notify-summaries"
                  label={t(
                    'profile.notifications.summaries',
                    {},
                    { defaultValue: 'Weekly digest' },
                  )}
                  hint={t(
                    'profile.notifications.summariesHint',
                    {},
                    { defaultValue: 'A Monday recap of every meeting from last week.' },
                  )}
                  checked={prefs.notifySummaries}
                  onChange={(v) => setPrefs({ ...prefs, notifySummaries: v })}
                />
              </section>
            )}

            {error ? (
              <p
                data-mol-id="profile-error"
                role="alert"
                className={cm.cn(cm.textSize('sm'), 'text-error')}
              >
                {error}
              </p>
            ) : null}
            {saveStatus === 'saved' && !dirty ? (
              <p
                data-mol-id="profile-saved"
                role="status"
                className={cm.cn(cm.textSize('sm'), 'text-success')}
              >
                {t('common.profileSavedPeriod', {}, { defaultValue: 'Profile saved.' })}
              </p>
            ) : null}

            <div className={cm.cn(cm.flex({ align: 'center', justify: 'end', gap: 'sm' }))}>
              <button
                type="button"
                data-mol-id="profile-cancel"
                onClick={handleCancel}
                disabled={!dirty || saving}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant hover:bg-surface-container rounded-md transition-colors disabled:opacity-50',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="button"
                data-mol-id="profile-save"
                onClick={handleSave}
                disabled={!dirty || saving}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-md hover:opacity-90 transition-opacity disabled:opacity-50',
                )}
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
  molId,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (next: boolean) => void
  molId?: string
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }))}>
      <div className={cm.cn('min-w-0', cm.stack(1))}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{label}</p>
        {hint ? (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{hint}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        data-mol-id={molId}
        onClick={() => onChange(!checked)}
        className={cm.cn(
          'relative h-6 w-11 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-surface-container-high',
        )}
      >
        <span
          className={cm.cn(
            'absolute top-0.5 left-0.5 h-5 w-5 bg-surface-container-lowest shadow transition-transform',
            cm.roundedFull,
            checked ? 'translate-x-5' : '',
          )}
          aria-hidden="true"
        />
      </button>
    </div>
  )
}
