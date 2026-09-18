import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { StatPill } from '../components/StatPill.js'

interface ApiPrefs {
  user_id: string
  workspace_name: string
  subdomain: string | null
  default_landing: 'home' | 'spaces'
  theme: 'system' | 'light' | 'dark'
  locale: string
  notify_mentions: boolean
  notify_replies: boolean
  notify_assignments: boolean
}

interface ApiMe {
  id: string
  name: string | null
  email: string | null
  planKey?: string | null
}

const SECTIONS: Array<{ id: string; icon: string; label: string }> = [
  { id: 'workspace', icon: 'workspaces', label: 'Workspace' },
  { id: 'profile', icon: 'person', label: 'Profile' },
  { id: 'notifications', icon: 'notifications', label: 'Notifications' },
  { id: 'integrations', icon: 'integration_instructions', label: 'Integrations' },
  { id: 'plan', icon: 'credit_card', label: 'Plan' },
]

type Status = 'idle' | 'saving' | 'saved' | 'error'

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { setTheme } = useTheme()

  const [activeSection, setActiveSection] = useState<string>('workspace')

  const [prefs, setPrefs] = useState<ApiPrefs | null>(null)
  const [me, setMe] = useState<ApiMe | null>(null)
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [prefsRes, meRes] = await Promise.all([
          http.get<ApiPrefs>('/prefs/me'),
          http.get<ApiMe>('/me'),
        ])
        if (cancelled) return
        if (prefsRes.data) {
          setPrefs(prefsRes.data)
          if (prefsRes.data.theme === 'light' || prefsRes.data.theme === 'dark') {
            try {
              setTheme(prefsRes.data.theme)
            } catch (_error) {
              // No-op: provider may not support this theme name; ignore.
            }
          }
        }
        if (meRes.data) {
          setMe(meRes.data)
          setProfileName(meRes.data.name ?? '')
          setProfileEmail(meRes.data.email ?? '')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http]) // setTheme intentionally omitted: it is stable and including it risks re-fetching on every render

  const updatePrefs = (patch: Partial<ApiPrefs>) => {
    setPrefs((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  const savePrefs = async () => {
    if (!prefs) return
    setStatus('saving')
    setError(null)
    try {
      await http.patch('/prefs/me', {
        workspace_name: prefs.workspace_name,
        subdomain: prefs.subdomain,
        default_landing: prefs.default_landing,
        theme: prefs.theme,
        locale: prefs.locale,
        notify_mentions: prefs.notify_mentions,
        notify_replies: prefs.notify_replies,
        notify_assignments: prefs.notify_assignments,
      })
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setStatus('error')
    }
  }

  const saveProfile = async () => {
    if (!me?.id) return
    setStatus('saving')
    setError(null)
    try {
      await http.patch(`/users/${me.id}`, { name: profileName, email: profileEmail })
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setStatus('error')
    }
  }

  return (
    <div className={cm.stack(8)} data-testid="settings-page">
      <header className={cm.stack(2)}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t(
            'settingsPage.eyebrow',
            { appName: APP_NAME },
            { defaultValue: 'Workspace · {{appName}}' },
          )}
        </span>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settingsPage.subtitle',
            {},
            {
              defaultValue:
                'Workspace, profile, notifications, integrations — all in one calm shell.',
            },
          )}
        </p>
      </header>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-md border-l-4 border-error bg-error/10 text-on-surface',
          )}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div
        className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'lg:flex-row lg:items-start')}
      >
        <nav
          className={cm.cn(
            cm.stack(0),
            'w-full lg:w-60 shrink-0 rounded-xl border border-outline-variant/40 bg-surface-container-lowest overflow-hidden',
          )}
          data-testid="settings-nav"
        >
          {SECTIONS.map((s) => {
            const active = activeSection === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSection(s.id)}
                data-testid={`settings-nav-${s.id}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 4),
                  cm.textSize('sm'),
                  'h-11 text-left transition-colors',
                  active
                    ? 'bg-primary/10 border-l-[3px] border-primary text-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-high border-l-[3px] border-transparent',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                  {s.icon}
                </span>
                {t(`settingsPage.section.${s.id}`, {}, { defaultValue: s.label })}
              </button>
            )
          })}
        </nav>

        <section className={cm.cn(cm.stack(6), 'flex-1 min-w-0')}>
          {activeSection === 'workspace' && prefs ? (
            <article
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(5),
                'rounded-xl border border-outline-variant/40 bg-surface-container-lowest',
              )}
              data-testid="settings-workspace"
            >
              <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                <h2
                  className={cm.cn(
                    cm.textSize('xl'),
                    'font-extrabold tracking-tight text-on-surface',
                  )}
                >
                  {t('settingsPage.workspace.title', {}, { defaultValue: 'Workspace' })}
                </h2>
                {status === 'saved' ? (
                  <StatPill tone="published" icon="check_circle" data-testid="settings-saved-pill">
                    {t(
                      'settingsPage.savedAt',
                      { when: 'just now' },
                      { defaultValue: 'Saved {{when}}' },
                    )}
                  </StatPill>
                ) : null}
              </div>

              <div className={cm.stack(2)}>
                <label
                  htmlFor="ws-name"
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.name', {}, { defaultValue: 'Name' })}
                </label>
                <input
                  id="ws-name"
                  type="text"
                  value={prefs.workspace_name}
                  onChange={(e) => updatePrefs({ workspace_name: e.target.value })}
                  data-testid="settings-workspace-name"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.textSize('base'),
                    'h-11 w-full rounded-md border border-outline-variant/60 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40',
                  )}
                />
              </div>

              <div className={cm.stack(2)}>
                <label
                  htmlFor="ws-sub"
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('settingsPage.workspace.subdomainLabel', {}, { defaultValue: 'Subdomain' })}
                </label>
                <input
                  id="ws-sub"
                  type="text"
                  value={prefs.subdomain ?? ''}
                  onChange={(e) => updatePrefs({ subdomain: e.target.value || null })}
                  data-testid="settings-workspace-subdomain"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.textSize('base'),
                    'h-11 w-full rounded-md border border-outline-variant/60 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40',
                  )}
                />
              </div>

              <div className={cm.stack(2)}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(
                    'settingsPage.workspace.defaultLanding',
                    {},
                    { defaultValue: 'Default landing screen' },
                  )}
                </span>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  {(['home', 'spaces'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updatePrefs({ default_landing: opt })}
                      data-testid={`settings-landing-${opt}`}
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.textSize('sm'),
                        'h-10 rounded-md border transition-colors',
                        prefs.default_landing === opt
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-high',
                      )}
                    >
                      {opt === 'home'
                        ? t('settingsPage.workspace.landingHome', {}, { defaultValue: 'Home' })
                        : t('settingsPage.workspace.landingSpaces', {}, { defaultValue: 'Spaces' })}
                    </button>
                  ))}
                </div>
              </div>

              <div className={cm.stack(2)}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('nav.theme', {}, { defaultValue: 'Theme' })}
                </span>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  {(['system', 'light', 'dark'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        updatePrefs({ theme: opt })
                        if (opt === 'light' || opt === 'dark') {
                          try {
                            setTheme(opt)
                          } catch (_error) {
                            // No-op: provider may not support this theme name; ignore.
                          }
                        }
                      }}
                      data-testid={`settings-theme-${opt}`}
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.textSize('sm'),
                        'h-10 rounded-md border transition-colors',
                        prefs.theme === opt
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-high',
                      )}
                    >
                      {t(
                        `settingsPage.theme.${opt}`,
                        {},
                        {
                          defaultValue:
                            opt === 'system' ? 'System' : opt === 'light' ? 'Light' : 'Dark',
                        },
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className={cm.stack(2)} data-testid="settings-language">
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('footer.language', {}, { defaultValue: 'Language' })}
                </span>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'common.chooseTheLanguage',
                    {},
                    { defaultValue: 'Choose the language used throughout the app.' },
                  )}
                </p>
                <LanguagePicker />
              </div>

              <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
                <button
                  type="button"
                  onClick={savePrefs}
                  disabled={status === 'saving'}
                  data-testid="settings-workspace-save"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 5),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'h-10 rounded-md bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-60',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[16px]')}
                    aria-hidden="true"
                  >
                    check
                  </span>
                  {status === 'saving'
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                </button>
              </div>
            </article>
          ) : null}

          {activeSection === 'profile' && me ? (
            <article
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(4),
                'rounded-xl border border-outline-variant/40 bg-surface-container-lowest',
              )}
              data-testid="settings-profile"
            >
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {t('settingsPage.profile.title', {}, { defaultValue: 'Your profile' })}
              </h2>
              <div className={cm.stack(2)}>
                <label
                  htmlFor="profile-name"
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.displayName', {}, { defaultValue: 'Display name' })}
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  data-testid="settings-profile-name"
                  className={cm.cn(
                    cm.sp('px', 4),
                    'h-11 w-full rounded-md border border-outline-variant/60 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40',
                  )}
                />
              </div>
              <div className={cm.stack(2)}>
                <label
                  htmlFor="profile-email"
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  data-testid="settings-profile-email"
                  className={cm.cn(
                    cm.sp('px', 4),
                    'h-11 w-full rounded-md border border-outline-variant/60 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40',
                  )}
                />
              </div>
              <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={status === 'saving'}
                  data-testid="settings-profile-save"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 5),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'h-10 rounded-md bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-60',
                  )}
                >
                  {status === 'saving'
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                </button>
              </div>
            </article>
          ) : null}

          {activeSection === 'notifications' && prefs ? (
            <article
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(4),
                'rounded-xl border border-outline-variant/40 bg-surface-container-lowest',
              )}
              data-testid="settings-notifications"
            >
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
              </h2>
              <ul className={cm.stack(3)}>
                {[
                  {
                    key: 'notify_mentions',
                    label: 'Mentions',
                    i18nKey: 'settingsPage.notify.mentions',
                  },
                  {
                    key: 'notify_replies',
                    label: 'Replies',
                    i18nKey: 'settingsPage.notify.replies',
                  },
                  {
                    key: 'notify_assignments',
                    label: 'Assignments',
                    i18nKey: 'settingsPage.notify.assignments',
                  },
                ].map((row) => {
                  const rowLabel = t(row.i18nKey, {}, { defaultValue: row.label })
                  return (
                    <li
                      key={row.key}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('p', 4),
                        'rounded-lg bg-surface-container-low/60',
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'text-on-surface',
                        )}
                      >
                        {rowLabel}
                      </span>
                      <label className={cm.cn('inline-flex items-center cursor-pointer')}>
                        <input
                          type="checkbox"
                          aria-label={rowLabel}
                          checked={prefs[row.key as keyof ApiPrefs] as boolean}
                          data-testid={`settings-${row.key}`}
                          onChange={(e) =>
                            updatePrefs({ [row.key]: e.target.checked } as Partial<ApiPrefs>)
                          }
                          className={cm.cn('h-5 w-5 accent-primary')}
                        />
                      </label>
                    </li>
                  )
                })}
              </ul>
              <div className={cm.flex({ align: 'center', justify: 'end' })}>
                <button
                  type="button"
                  onClick={savePrefs}
                  disabled={status === 'saving'}
                  data-testid="settings-notifications-save"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'h-10 rounded-md bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-60',
                  )}
                >
                  {status === 'saving'
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                </button>
              </div>
            </article>
          ) : null}

          {activeSection === 'integrations' ? (
            <article
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(4),
                'rounded-xl border border-outline-variant/40 bg-surface-container-lowest',
              )}
              data-testid="settings-integrations"
            >
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settingsPage.integrations.subtitle',
                  {},
                  {
                    defaultValue:
                      'Slack, GitHub, Linear, and Figma — coming next sprint. Subscribe to the changelog for launch notice.',
                  },
                )}
              </p>
              <ul className={cm.cn('grid gap-3 md:grid-cols-2')}>
                {[
                  { name: 'Slack', icon: 'forum' },
                  { name: 'GitHub', icon: 'code' },
                  { name: 'Linear', icon: 'task' },
                  { name: 'Figma', icon: 'palette' },
                ].map((i) => (
                  <li
                    key={i.name}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('p', 4),
                      'rounded-lg bg-surface-container-low/60',
                    )}
                  >
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          'h-9 w-9 rounded-lg bg-primary/10 text-primary',
                        )}
                        aria-hidden="true"
                      >
                        <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                          {i.icon}
                        </span>
                      </span>
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'text-on-surface',
                        )}
                      >
                        {i.name}
                      </span>
                    </div>
                    <StatPill tone="archived">
                      {t(
                        'settingsPage.integrations.comingSoon',
                        {},
                        { defaultValue: 'Coming soon' },
                      )}
                    </StatPill>
                  </li>
                ))}
              </ul>
            </article>
          ) : null}

          {activeSection === 'plan' ? (
            <article
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(4),
                'rounded-xl border border-outline-variant/40 bg-surface-container-lowest',
              )}
              data-testid="settings-plan"
            >
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {t('nav.planAndBilling', {}, { defaultValue: 'Plan & billing' })}
              </h2>
              <div
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                  'rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10',
                )}
              >
                <div className={cm.stack(1)}>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-black uppercase tracking-widest text-primary',
                    )}
                  >
                    {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
                  </p>
                  <p
                    className={cm.cn(
                      'text-3xl font-extrabold text-on-surface tracking-tight capitalize',
                    )}
                    data-testid="settings-plan-key"
                  >
                    {me?.planKey ?? 'free'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/pricing')}
                  data-testid="settings-plan-manage"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'h-10 rounded-md bg-primary text-on-primary hover:bg-primary-hover transition-colors',
                  )}
                >
                  {t('settingsPage.plan.manage', {}, { defaultValue: 'Manage plan' })}
                </button>
              </div>
            </article>
          ) : null}
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
