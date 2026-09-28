import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { AuthSection } from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface AuditEntry {
  id: string
  occurred_at: string
  actor_name: string
  actor_initial: string
  action: string
  target_label: string
  target_link: string
  details: string
}

const SECTIONS = [
  {
    key: 'company',
    icon: 'apartment',
    defaultTitle: 'Company',
    defaultBody: 'Workspace name, brand, locations, fiscal year.',
  },
  {
    key: 'permissions',
    icon: 'admin_panel_settings',
    defaultTitle: 'Permissions',
    defaultBody: 'Roles & granular access — managers see their teams, leads see all.',
  },
  {
    key: 'integrations',
    icon: 'extension',
    defaultTitle: 'Integrations',
    defaultBody: 'Slack, Google Workspace, Okta, Greenhouse, Stripe payroll.',
  },
  {
    key: 'audit',
    icon: 'history',
    defaultTitle: 'Audit log',
    defaultBody: 'Every change is logged, with actor, target, and a diff.',
    primary: true,
  },
] as const

interface Profile {
  id: string
  email: string
  display_name: string
  workspace_name: string
  language: string
  theme: string
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/audit').catch(() => null),
      http.get('/api/profile/me').catch(() => null),
    ])
      .then(([aRes, pRes]) => {
        if (cancelled) return
        setAudit(unwrapList<AuditEntry>(aRes))
        setProfile(pRes ? unwrapSingle<Profile>(pRes) : null)
      })
      .catch(() => {
        if (!cancelled) setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function saveProfile(patch: Partial<Profile>) {
    setSavingProfile(true)
    setProfileError(null)
    try {
      const res = await http.patch('/api/profile/me', patch)
      const updated = unwrapSingle<Profile>(res)
      if (updated) setProfile(updated)
    } catch (_error) {
      // Error surfaced to the user via setProfileError below; no additional logging needed.
      setProfileError(
        t('settings.profileSaveError', {}, { defaultValue: 'Failed to save profile.' }),
      )
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className={cm.cn('px-4 py-6 sm:px-8 sm:py-8', cm.stack(8))}>
      <header>
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary-dark')}>
          {t('nav.workspace', {}, { defaultValue: 'Workspace' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 2),
            cm.textSize('4xl'),
            'font-extrabold tracking-tight text-on-surface',
          )}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
          {t(
            'settings.subheading',
            {},
            { defaultValue: 'Company info, permissions, integrations, and audit log.' },
          )}
        </p>
      </header>

      <div className={cm.grid({ cols: 2, gap: 'md' })}>
        {SECTIONS.map((s) => {
          const open = openSection === s.key
          return (
            <section
              key={s.key}
              className={cm.cn(
                cm.sp('p', 6),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm transition-all',
                'primary' in s && s.primary ? cm.accentCard({ tone: 'primary' }) : '',
              )}
            >
              <span
                className={cm.cn(
                  cm.sp('p', 2),
                  'inline-flex rounded-lg bg-primary/10 text-primary-dark material-symbols-outlined text-[24px]',
                )}
                aria-hidden="true"
              >
                {s.icon}
              </span>
              <h3
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.textSize('lg'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {t(`settings.section.${s.key}.title`, {}, { defaultValue: s.defaultTitle })}
              </h3>
              <p
                className={cm.cn(
                  cm.sp('mt', 2),
                  cm.textSize('sm'),
                  'leading-relaxed text-on-surface-variant',
                )}
              >
                {t(`settings.section.${s.key}.body`, {}, { defaultValue: s.defaultBody })}
              </p>
              <button
                type="button"
                onClick={() => setOpenSection(open ? null : s.key)}
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'inline-flex items-center gap-1 text-primary-dark hover:text-primary-container transition-colors uppercase tracking-widest',
                )}
              >
                {open
                  ? t('settings.closeCta', {}, { defaultValue: 'Close' })
                  : t('common.manage', {}, { defaultValue: 'Manage' })}
                <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                  {open ? 'expand_less' : 'arrow_forward'}
                </span>
              </button>
              {open ? (
                <div className={cm.cn(cm.sp('mt', 4), cm.stack(3))}>
                  {s.key === 'company' && profile ? (
                    <CompanyEditor
                      profile={profile}
                      onSave={saveProfile}
                      saving={savingProfile}
                      error={profileError}
                    />
                  ) : null}
                  {s.key === 'permissions' ? (
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'settings.permissions.detail',
                        {},
                        {
                          defaultValue:
                            'Default role: Admin (you). Add teammates from Staff, then assign Manager / Lead roles from the roster.',
                        },
                      )}
                    </p>
                  ) : null}
                  {s.key === 'integrations' ? (
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'settings.integrations.detail',
                        {},
                        {
                          defaultValue:
                            'OAuth providers and webhooks ship with the API bonds. Configure secrets in your .env (Stripe, Mailgun, OAuth client IDs).',
                        },
                      )}
                    </p>
                  ) : null}
                  {s.key === 'audit' ? (
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'settings.audit.detail',
                        {},
                        {
                          defaultValue:
                            'See the full feed below. Every CRUD action against a roster or schedule row is logged.',
                        },
                      )}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>
          )
        })}
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('footer.language', {}, { defaultValue: 'Language' })}
        </h2>
        <p
          className={cm.cn(
            cm.sp('mt', 1),
            cm.sp('mb', 4),
            cm.textSize('sm'),
            'text-on-surface-variant',
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

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
        </h2>
        <p
          className={cm.cn(
            cm.sp('mt', 1),
            cm.sp('mb', 4),
            cm.textSize('sm'),
            'text-on-surface-variant',
          )}
        >
          {t('common.toggleLightDark', {}, { defaultValue: 'Toggle between light and dark mode.' })}
        </p>
        <ThemeToggle />
      </section>
      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('settings.security.heading', {}, { defaultValue: 'Security' })}
        </h2>
        <p
          className={cm.cn(
            cm.sp('mt', 1),
            cm.sp('mb', 4),
            cm.textSize('sm'),
            'text-on-surface-variant',
          )}
        >
          {t(
            'settings.security.subheading',
            {},
            {
              defaultValue:
                'Change your password and protect your workspace with two-factor authentication.',
            },
          )}
        </p>
        <AuthSection />
      </section>
      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <header className={cm.flex({ align: 'center', justify: 'between' })}>
          <div>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('nav.auditLog', {}, { defaultValue: 'Audit log' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mt', 1),
                cm.textSize('lg'),
                'font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t('settings.audit.heading', {}, { defaultValue: 'Recent changes' })}
            </h2>
          </div>
        </header>
        {loading ? (
          <p className={cm.cn(cm.sp('mt', 4), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : error ? (
          <p className={cm.cn(cm.sp('mt', 4), 'text-error')}>{error}</p>
        ) : audit.length === 0 ? (
          <p className={cm.cn(cm.sp('mt', 4), cm.textCenter, 'text-on-surface-variant')}>
            {t('settings.audit.empty', {}, { defaultValue: 'No changes yet.' })}
          </p>
        ) : (
          <ol className={cm.cn(cm.sp('mt', 4), 'divide-y divide-outline-variant/20')}>
            {audit.map((e) => (
              <li
                key={e.id}
                className={cm.cn(cm.sp('py', 3), cm.flex({ align: 'start', gap: 'md' }))}
              >
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-mono tabular-nums text-on-surface-variant w-32 shrink-0',
                  )}
                >
                  {new Date(e.occurred_at).toLocaleString()}
                </span>
                <span
                  className={cm.cn(
                    'grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary-dark text-xs font-bold shrink-0',
                  )}
                >
                  {e.actor_initial.toUpperCase()}
                </span>
                <p className={cm.cn(cm.textSize('sm'), 'flex-1 text-on-surface-variant')}>
                  <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                    {e.actor_name}
                  </span>{' '}
                  <span>{e.action}</span>{' '}
                  <span className={cm.cn(cm.fontWeight('semibold'), 'text-primary-dark')}>
                    {e.target_label}
                  </span>{' '}
                  <span className={cm.cn('text-on-surface-variant')}>— {e.details}</span>
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

interface CompanyEditorProps {
  profile: Profile
  onSave: (patch: Partial<Profile>) => Promise<void>
  saving: boolean
  error: string | null
}

function CompanyEditor({ profile, onSave, saving, error }: CompanyEditorProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [workspace, setWorkspace] = useState(profile.workspace_name || APP_NAME)
  const [displayName, setDisplayName] = useState(profile.display_name || profile.email)
  const dirty = workspace !== profile.workspace_name || displayName !== profile.display_name
  return (
    <div className={cm.cn(cm.stack(3))}>
      <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <span
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('settings.company.workspace', {}, { defaultValue: 'Workspace name' })}
        </span>
        <input
          type="text"
          value={workspace}
          onChange={(e) => setWorkspace(e.target.value)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface',
          )}
        />
      </label>
      <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <span
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('settings.company.displayName', {}, { defaultValue: 'Your display name' })}
        </span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface',
          )}
        />
      </label>
      {error ? (
        <p className={cm.cn(cm.textSize('xs'), 'text-error font-semibold')}>{error}</p>
      ) : null}
      <div>
        <button
          type="button"
          onClick={() => onSave({ workspace_name: workspace, display_name: displayName })}
          disabled={saving || !dirty}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'rounded-xl bg-primary text-on-primary disabled:opacity-50',
          )}
        >
          {saving
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('common.save', {}, { defaultValue: 'Save' })}
        </button>
      </div>
    </div>
  )
}
