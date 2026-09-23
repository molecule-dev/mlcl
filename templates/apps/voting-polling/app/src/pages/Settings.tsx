import { useCallback, useEffect, useState } from 'react'

import { useHttpClient, useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ProfileResponse {
  id: string
  email: string
  name?: string | null
  planKey?: string | null
  organization?: string | null
  theme?: 'light' | 'dark' | 'system'
  language?: string
  notifications?: {
    poll_published?: boolean
    quorum_reached?: boolean
    new_question?: boolean
    weekly_digest?: boolean
  }
}

const SECTIONS = [
  { key: 'organization', icon: 'business', defaultLabel: 'Organization' },
  { key: 'preferences', icon: 'tune', defaultLabel: 'Preferences' },
  { key: 'notifications', icon: 'notifications', defaultLabel: 'Notifications' },
] as const

type SectionKey = (typeof SECTIONS)[number]['key']

export function Settings() {
  const cm = getClassMap()
  const { t, locale, setLocale, locales } = useTranslation()
  const http = useHttpClient()
  const { setTheme: setMolTheme } = useTheme()
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [section, setSection] = useState<SectionKey>('organization')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [organization, setOrganization] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [language, setLanguage] = useState('en')
  const [notif, setNotif] = useState({
    poll_published: true,
    quorum_reached: true,
    new_question: true,
    weekly_digest: false,
  })

  const refresh = useCallback(async () => {
    try {
      const res = await http.get<ProfileResponse>('/api/profile/me')
      const p = res.data as ProfileResponse
      setProfile(p)
      setName(p.name ?? '')
      setEmail(p.email ?? '')
      setOrganization(p.organization ?? '')
      setTheme(p.theme ?? 'system')
      setLanguage(p.language ?? 'en')
      setNotif({
        poll_published: p.notifications?.poll_published ?? true,
        quorum_reached: p.notifications?.quorum_reached ?? true,
        new_question: p.notifications?.new_question ?? true,
        weekly_digest: p.notifications?.weekly_digest ?? false,
      })
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    // Drive the molecule theme provider — that's what controls the actual
    // CSS variable scope (data-mol-mode on <html>). Setting only
    // `<html data-theme>` (the previous behavior) was inert: nothing in the
    // app's stylesheet keys off `data-theme`, so changing the dropdown did
    // not visually re-skin the page. We also keep the data-theme attribute
    // for any downstream consumer that reads it explicitly.
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.dataset.theme = theme
      try {
        setMolTheme(theme)
      } catch (_error) {
        // before the provider mounts, useTheme can throw — the next change
        // after mount picks up the user's choice
      }
    } else {
      delete document.documentElement.dataset.theme
      // 'system' — re-evaluate via prefers-color-scheme
      try {
        const prefersDark =
          typeof window !== 'undefined' &&
          window.matchMedia?.('(prefers-color-scheme: dark)').matches
        setMolTheme(prefersDark ? 'dark' : 'light')
      } catch (_error) {
        // same fallback: provider not yet mounted, next change picks up the preference
      }
    }
  }, [theme, setMolTheme])

  async function save() {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      // Email is a core `users` column owned by the shared user resource —
      // the prefs-only `/api/profile/me` endpoint deliberately never touches
      // it. Persist a changed email through `PATCH /api/users/:id` (which
      // accepts name/email) before saving the app-scoped preferences blob.
      const nextEmail = email.trim()
      if (profile?.id && nextEmail && nextEmail !== profile.email) {
        await http.patch(`/api/users/${profile.id}`, { email: nextEmail })
      }
      const res = await http.patch<ProfileResponse>('/api/profile/me', {
        name: name.trim(),
        organization: organization.trim() || null,
        theme,
        language,
        notifications: notif,
      })
      setProfile(res.data as ProfileResponse)
      setMessage(t('common.settingsSavedPeriod', {}, { defaultValue: 'Settings saved.' }))
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
          (err as Error).message ??
          'Failed to save settings',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <header>
        <p className="text-[10px] font-black uppercase tracking-widest text-primary">
          {t('settings.eyebrow', {}, { defaultValue: 'Workspace settings' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 2),
            cm.textSize('4xl'),
            'font-extrabold tracking-tight text-on-surface',
          )}
        >
          {t('settings.heading', {}, { defaultValue: 'Profile, preferences & notifications' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), 'font-medium text-on-surface-variant')}>
          {profile?.email
            ? t(
                'settings.subheading',
                { email: profile.email },
                { defaultValue: 'Signed in as {{email}}.' },
              )
            : t('nav.loadingProfile', {}, { defaultValue: 'Loading profile…' })}
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          data-test="settings-error"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border border-error/30 bg-error/5 text-error text-sm font-semibold',
          )}
        >
          {error}
        </div>
      ) : null}
      {message ? (
        <div
          role="status"
          data-test="settings-saved"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border border-success/30 bg-success/5 text-success text-sm font-semibold',
          )}
        >
          {message}
        </div>
      ) : null}

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <nav
          className={cm.cn(
            cm.sp('p', 4),
            'lg:col-span-3 min-w-0 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm self-start',
          )}
          aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
        >
          <ul className={cm.stack(1)}>
            {SECTIONS.map((s) => {
              const isActive = section === s.key
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => setSection(s.key)}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 3),
                      'w-full text-left rounded-lg flex items-center gap-3 transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary font-extrabold'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface font-semibold',
                    )}
                    data-test={`settings-section-${s.key}`}
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      {s.icon}
                    </span>
                    <span className={cm.cn('text-sm')}>
                      {t(`settings.section.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <section className={cm.cn('lg:col-span-9 min-w-0 space-y-6')}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            )}
          >
            {loading ? (
              <p className="text-sm text-on-surface-variant">
                {t('settings.loading', {}, { defaultValue: 'Loading…' })}
              </p>
            ) : section === 'organization' ? (
              <div className={cm.stack(4)} data-test="settings-organization">
                <header>
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                    {t('nav.identity', {}, { defaultValue: 'Identity' })}
                  </p>
                  <h2
                    className={cm.cn(
                      cm.textSize('xl'),
                      'font-extrabold tracking-tight text-on-surface mt-1',
                    )}
                  >
                    {t('settings.org.heading', {}, { defaultValue: 'Profile + organization' })}
                  </h2>
                </header>
                <div className={cm.grid({ cols: 2, gap: 'md' })}>
                  <Field
                    label={t('auth.signup.name', {}, { defaultValue: 'Your name' })}
                    value={name}
                    onChange={setName}
                    testId="settings-name"
                  />
                  <Field
                    type="email"
                    label={t('settings.email', {}, { defaultValue: 'Email' })}
                    value={email}
                    onChange={setEmail}
                    testId="settings-email"
                  />
                </div>
                <Field
                  label={t('form.organization', {}, { defaultValue: 'Organization' })}
                  value={organization}
                  onChange={setOrganization}
                  testId="settings-org"
                />
                <p className="text-xs text-on-surface-variant" data-test="settings-current-name">
                  {t(
                    'settings.org.currentName',
                    { name: profile?.name ?? '—' },
                    { defaultValue: 'Current saved name: {{name}}' },
                  )}
                </p>
              </div>
            ) : section === 'preferences' ? (
              <div className={cm.stack(4)} data-test="settings-preferences">
                <header>
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                    {t('settings.prefs.eyebrow', {}, { defaultValue: 'Display' })}
                  </p>
                  <h2
                    className={cm.cn(
                      cm.textSize('xl'),
                      'font-extrabold tracking-tight text-on-surface mt-1',
                    )}
                  >
                    {t('settings.prefs.heading', {}, { defaultValue: 'Theme + language' })}
                  </h2>
                </header>
                <div className={cm.grid({ cols: 2, gap: 'md' })}>
                  <label className={cm.stack(2)}>
                    <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      {t('nav.theme', {}, { defaultValue: 'Theme' })}
                    </span>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        'rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
                      )}
                      data-test="settings-theme"
                    >
                      <option value="system">
                        {t('settings.prefs.themeSystem', {}, { defaultValue: 'System' })}
                      </option>
                      <option value="light">
                        {t('settings.prefs.themeLight', {}, { defaultValue: 'Light' })}
                      </option>
                      <option value="dark">
                        {t('settings.prefs.themeDark', {}, { defaultValue: 'Dark' })}
                      </option>
                    </select>
                  </label>
                  <label className={cm.stack(2)}>
                    <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      {t('footer.language', {}, { defaultValue: 'Language' })}
                    </span>
                    <select
                      value={locale}
                      onChange={(e) => {
                        const next = e.target.value
                        setLanguage(next)
                        void setLocale(next)
                      }}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        'rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
                      )}
                      data-test="settings-language"
                      data-mol-id="language-picker-select"
                    >
                      {[...locales]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
              </div>
            ) : (
              <div className={cm.stack(4)} data-test="settings-notifications">
                <header>
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                    {t('settings.notifs.eyebrow', {}, { defaultValue: 'Email + in-app' })}
                  </p>
                  <h2
                    className={cm.cn(
                      cm.textSize('xl'),
                      'font-extrabold tracking-tight text-on-surface mt-1',
                    )}
                  >
                    {t(
                      'nav.notificationPreferences',
                      {},
                      { defaultValue: 'Notification preferences' },
                    )}
                  </h2>
                </header>
                <ToggleRow
                  label={t('settings.notifs.pollPublished', {}, { defaultValue: 'Poll published' })}
                  checked={notif.poll_published}
                  onChange={(v) => setNotif((s) => ({ ...s, poll_published: v }))}
                  testId="settings-notif-poll"
                />
                <ToggleRow
                  label={t('settings.notifs.quorum', {}, { defaultValue: 'Quorum reached' })}
                  checked={notif.quorum_reached}
                  onChange={(v) => setNotif((s) => ({ ...s, quorum_reached: v }))}
                  testId="settings-notif-quorum"
                />
                <ToggleRow
                  label={t(
                    'settings.notifs.newQuestion',
                    {},
                    { defaultValue: 'New audience question' },
                  )}
                  checked={notif.new_question}
                  onChange={(v) => setNotif((s) => ({ ...s, new_question: v }))}
                  testId="settings-notif-question"
                />
                <ToggleRow
                  label={t('settings.notifs.digest', {}, { defaultValue: 'Weekly digest' })}
                  checked={notif.weekly_digest}
                  onChange={(v) => setNotif((s) => ({ ...s, weekly_digest: v }))}
                  testId="settings-notif-digest"
                />
              </div>
            )}
          </div>

          <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className={cm.cn(
                'px-5 py-3 rounded-xl bg-primary text-on-primary text-sm font-bold disabled:opacity-50',
              )}
              data-test="settings-save"
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  testId,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  testId?: string
  type?: string
}) {
  const cm = getClassMap()
  return (
    <label className={cm.stack(2)}>
      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.textSize('sm'),
          'rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all',
        )}
        data-test={testId}
      />
    </label>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
  testId,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  testId?: string
}) {
  const cm = getClassMap()
  return (
    <label
      className={cm.cn(
        cm.sp('p', 3),
        'rounded-xl border border-outline-variant/20 flex items-center justify-between gap-4 cursor-pointer hover:bg-surface-container-low',
      )}
    >
      <span className="text-sm font-semibold text-on-surface">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={cm.cn('accent-primary h-4 w-4')}
        data-test={testId}
      />
    </label>
  )
}
