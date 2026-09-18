import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, Modal, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { CairnHeroCard } from '../components/CairnHeroCard.js'

interface Section {
  key: string
  icon: string
  label: string
  default: string
}

const SECTIONS: Section[] = [
  { key: 'account', icon: 'person', label: 'sections.account', default: 'Account' },
  { key: 'feed', icon: 'tune', label: 'sections.feed', default: 'Feed preferences' },
  {
    key: 'notifications',
    icon: 'notifications',
    label: 'sections.notifications',
    default: 'Notifications',
  },
  { key: 'privacy', icon: 'shield', label: 'sections.privacy', default: 'Privacy' },
]

interface FeedPrefs {
  hideNSFW: boolean
  collapseDownvoted: boolean
  defaultSort: 'hot' | 'new' | 'top'
}

interface NotificationPrefs {
  replies: boolean
  mentions: boolean
  digest: boolean
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [section, setSection] = useState<string>('account')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [feed, setFeed] = useState<FeedPrefs>({
    hideNSFW: true,
    collapseDownvoted: false,
    defaultSort: 'hot',
  })
  const [notif, setNotif] = useState<NotificationPrefs>({
    replies: true,
    mentions: true,
    digest: false,
  })
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    type SettingsBody = {
      username?: string
      email?: string
      feed?: Partial<FeedPrefs>
      notif?: Partial<NotificationPrefs>
    }
    http
      .get<{ data: SettingsBody } | SettingsBody>('/api/users/me/settings')
      .then((res) => {
        if (!active) return
        const root = (res as { data?: { data?: SettingsBody } | SettingsBody }).data
        const inner: SettingsBody =
          root && typeof root === 'object' && 'data' in (root as Record<string, unknown>)
            ? ((root as { data?: SettingsBody }).data ?? {})
            : ((root as SettingsBody | undefined) ?? {})
        if (typeof inner.username === 'string') setUsername(inner.username)
        if (typeof inner.email === 'string') setEmail(inner.email)
        if (inner.feed) setFeed((f) => ({ ...f, ...inner.feed }))
        if (inner.notif) setNotif((n) => ({ ...n, ...inner.notif }))
      })
      .catch(() => {
        // First-time users may not have settings yet; defaults stand.
      })
    return () => {
      active = false
    }
  }, [http])

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      // Only send fields that have values — empty string would fail the
      // `z.string().email().optional()` schema and reject the entire body.
      const payload: Record<string, unknown> = { feed, notif }
      if (username.trim()) payload.username = username.trim()
      if (email.trim()) payload.email = email.trim()
      await http.put('/api/users/me/settings', payload)
      setSavedAt(new Date())
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.saveFailed', {}, { defaultValue: 'Failed to save settings.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  // Aggregate everything the API exposes about the current user into a
  // single downloadable JSON file (profile, posts, comments, saved,
  // preferences) — the client-side realisation of settings.privacy.body's
  // "download your data" promise.
  const exportData = async () => {
    setExporting(true)
    try {
      const unwrap = (res: unknown): unknown => {
        const top = (res as { data?: unknown } | null)?.data
        if (top && typeof top === 'object' && 'data' in (top as Record<string, unknown>)) {
          return (top as { data: unknown }).data
        }
        return top ?? null
      }
      const [profile, posts, comments, saved, prefs] = await Promise.all([
        http.get('/api/users/me/profile').catch(() => null),
        http.get('/api/users/me/posts').catch(() => null),
        http.get('/api/users/me/comments').catch(() => null),
        http.get('/api/users/me/saved').catch(() => null),
        http.get('/api/users/me/settings').catch(() => null),
      ])
      const payload = {
        app: APP_NAME,
        exportedAt: new Date().toISOString(),
        profile: unwrap(profile),
        posts: unwrap(posts),
        comments: unwrap(comments),
        saved: unwrap(saved),
        settings: unwrap(prefs),
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${APP_NAME.toLowerCase()}-export-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const deleteAccount = async () => {
    const userId = (user as { id?: string } | null)?.id
    if (!userId) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await http.delete(`/api/users/${userId}`)
      await logout()
      navigate('/login', { replace: true })
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : t('settings.failedToDeleteAccount', {}, { defaultValue: 'Failed to delete account.' }),
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <CairnHeroCard
        eyebrowKey="eyebrow"
        eyebrowDefault={t('linkAggregatorLayout.settings', {}, { defaultValue: 'Settings' })}
        headlineKey="headline"
        headlineDefault={t(
          'settings.heroHeadline',
          { appName: APP_NAME },
          { defaultValue: 'Tune {{appName}} to fit you.' },
        )}
        bodyKey="body"
        bodyDefault={t(
          'settings.heroBody',
          {},
          {
            defaultValue:
              'Account, feed, notifications, and privacy \u2014 all in one place. Changes take effect immediately.',
          },
        )}
        pillIcon="tune"
        pillKey="pill"
        pillDefault={t('settings.heroPill', {}, { defaultValue: 'Personalize your timeline' })}
      />

      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-4')}>
        <nav
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'xs' }),
            cm.sp('p', 2),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 lg:col-span-1',
          )}
        >
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSection(s.key)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-xl transition-colors text-left',
                section === s.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-primary/5 hover:text-primary',
              )}
              aria-pressed={section === s.key}
            >
              <span className={'material-symbols-outlined text-xl'}>{s.icon}</span>
              {t(`settings.${s.label}`, {}, { defaultValue: s.default })}
            </button>
          ))}
        </nav>

        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'lg' }),
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 lg:col-span-3',
          )}
        >
          {section === 'account' && (
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  'tracking-tight text-on-surface',
                )}
              >
                {t('settings.account.heading', {}, { defaultValue: 'Account' })}
              </h2>
              <Field label={t('auth.username', {}, { defaultValue: 'Username' })}>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'w-full rounded-xl border border-outline-variant/40 bg-surface focus:border-primary focus:outline-none text-on-surface',
                  )}
                />
              </Field>
              <Field label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'w-full rounded-xl border border-outline-variant/40 bg-surface focus:border-primary focus:outline-none text-on-surface',
                  )}
                />
              </Field>
              <Field label={t('footer.language', {}, { defaultValue: 'Language' })}>
                <p className={cm.cn(cm.textSize('xs'), cm.sp('mb', 2), 'text-on-surface-variant')}>
                  {t(
                    'common.chooseTheLanguage',
                    {},
                    { defaultValue: 'Choose the language used throughout the app.' },
                  )}
                </p>
                <LanguagePicker />
              </Field>
            </div>
          )}

          {section === 'feed' && (
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  'tracking-tight text-on-surface',
                )}
              >
                {t('settings.feed.heading', {}, { defaultValue: 'Feed preferences' })}
              </h2>
              <Toggle
                label={t('settings.feed.hideNsfw', {}, { defaultValue: 'Hide NSFW content' })}
                checked={feed.hideNSFW}
                onChange={(v) => setFeed({ ...feed, hideNSFW: v })}
              />
              <Toggle
                label={t(
                  'settings.feed.collapseDownvoted',
                  {},
                  { defaultValue: 'Auto-collapse heavily downvoted comments' },
                )}
                checked={feed.collapseDownvoted}
                onChange={(v) => setFeed({ ...feed, collapseDownvoted: v })}
              />
              <Field label={t('settings.feed.defaultSort', {}, { defaultValue: 'Default sort' })}>
                <div className={cm.cn(cm.flex({ gap: 'xs' }))}>
                  {(['hot', 'new', 'top'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFeed({ ...feed, defaultSort: opt })}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.roundedFull,
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'uppercase tracking-widest transition-colors',
                        feed.defaultSort === opt
                          ? 'bg-primary text-on-primary'
                          : 'bg-primary/10 text-primary hover:bg-primary/20',
                      )}
                      aria-pressed={feed.defaultSort === opt}
                    >
                      {t(`settings.feed.${opt}`, {}, { defaultValue: opt })}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {section === 'notifications' && (
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  'tracking-tight text-on-surface',
                )}
              >
                {t('settings.notifications.heading', {}, { defaultValue: 'Notifications' })}
              </h2>
              <Toggle
                label={t(
                  'settings.notifications.replies',
                  {},
                  { defaultValue: 'Replies to my posts and comments' },
                )}
                checked={notif.replies}
                onChange={(v) => setNotif({ ...notif, replies: v })}
              />
              <Toggle
                label={t(
                  'settings.notifications.mentions',
                  {},
                  { defaultValue: '@-mentions in comments' },
                )}
                checked={notif.mentions}
                onChange={(v) => setNotif({ ...notif, mentions: v })}
              />
              <Toggle
                label={t(
                  'settings.notifications.digest',
                  {},
                  { defaultValue: 'Weekly highlights digest' },
                )}
                checked={notif.digest}
                onChange={(v) => setNotif({ ...notif, digest: v })}
              />
            </div>
          )}

          {section === 'privacy' && (
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  'tracking-tight text-on-surface',
                )}
              >
                {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.privacy.body',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      '{{appName}} keeps your saved links and search history private. Tap below to download your data or close your account.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
                <button
                  type="button"
                  onClick={exportData}
                  disabled={exporting}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.roundedFull,
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'border border-outline-variant text-on-surface hover:bg-surface-container-low disabled:opacity-60 transition-colors',
                  )}
                >
                  {exporting
                    ? t('settings.privacy.exporting', {}, { defaultValue: 'Preparing export…' })
                    : t('settings.privacy.export', {}, { defaultValue: 'Export my data' })}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.roundedFull,
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'bg-error/10 text-error hover:bg-error hover:text-on-error transition-colors',
                  )}
                >
                  {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
                </button>
              </div>
              <Modal
                open={confirmingDelete}
                onClose={() => setConfirmingDelete(false)}
                title={t(
                  'settings.deleteAccountModal.title',
                  {},
                  { defaultValue: 'Delete account' },
                )}
              >
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'settings.deleteAccountModal.warning',
                      {},
                      {
                        defaultValue:
                          'This permanently deletes your account and everything attached to it. This action cannot be undone.',
                      },
                    )}
                  </p>
                  {deleteError && (
                    <p
                      role="alert"
                      className={cm.cn(
                        cm.sp('p', 3),
                        cm.textSize('sm'),
                        'rounded-lg bg-error/10 text-error',
                      )}
                    >
                      {deleteError}
                    </p>
                  )}
                  <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }))}>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 2),
                        cm.roundedFull,
                        cm.textSize('sm'),
                        cm.fontWeight('bold'),
                        'border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors',
                      )}
                    >
                      {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                    </button>
                    <button
                      type="button"
                      onClick={deleteAccount}
                      disabled={deleting}
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 2),
                        cm.roundedFull,
                        cm.textSize('sm'),
                        cm.fontWeight('bold'),
                        'bg-error text-on-error hover:opacity-90 disabled:opacity-60 transition-opacity',
                      )}
                    >
                      {deleting
                        ? t(
                            'settings.deleteAccountModal.deleting',
                            {},
                            { defaultValue: 'Deleting…' },
                          )
                        : t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
                    </button>
                  </div>
                </div>
              </Modal>
            </div>
          )}

          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              'border-t border-outline-variant/30 pt-4',
            )}
          >
            <span
              role={error ? 'alert' : undefined}
              className={cm.cn(cm.textSize('xs'), error ? 'text-error' : 'text-on-surface-variant')}
            >
              {error
                ? error
                : savedAt
                  ? t(
                      'common.savedAt',
                      { time: savedAt.toLocaleTimeString() },
                      { defaultValue: 'Saved at {{time}}' },
                    )
                  : t('settings.unsaved', {}, { defaultValue: 'Unsaved changes' })}
            </span>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-60 transition-colors',
              )}
            >
              {saving
                ? t('settings.saving', {}, { defaultValue: 'Saving\u2026' })
                : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
            </button>
          </div>
        </section>
        <section
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 lg:col-start-2 lg:col-span-3',
          )}
        >
          <div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.textSize('xs'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const cm = getClassMap()
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        cm.sp('p', 3),
        'rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors text-left',
      )}
      aria-pressed={checked}
    >
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}>
        {label}
      </span>
      <span
        className={cm.cn(
          'inline-flex items-center w-10 h-6 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-surface-container-high',
        )}
      >
        <span
          className={cm.cn(
            'block w-5 h-5 rounded-full bg-white shadow transform transition-transform',
            checked ? 'translate-x-4' : 'translate-x-1',
          )}
        />
      </span>
    </button>
  )
}

export default Settings
