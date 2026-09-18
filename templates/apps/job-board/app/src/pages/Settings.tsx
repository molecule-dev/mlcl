import { useEffect, useRef, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface Toggle {
  key: string
  label: string
  description: string
  defaultValue: boolean
}

const NOTIFICATIONS: Toggle[] = [
  {
    key: 'jobMatches',
    label: 'New job matches',
    description: 'Email me when a role matching my saved searches is posted.',
    defaultValue: true,
  },
  {
    key: 'applicationUpdates',
    label: 'Application updates',
    description: 'Email me when an employer reviews, schedules, or decides on my application.',
    defaultValue: true,
  },
  {
    key: 'weeklyDigest',
    label: 'Weekly digest',
    description: 'Sunday-evening recap of the week\u2019s top roles and pipeline activity.',
    defaultValue: false,
  },
  {
    key: 'productUpdates',
    label: 'Product updates',
    description: 'Quarterly: new features, integrations, releases.',
    defaultValue: false,
  },
]

const PRIVACY: Toggle[] = [
  {
    key: 'profileVisible',
    label: 'Public profile',
    description: 'Show my profile to employers searching the talent pool.',
    defaultValue: true,
  },
  {
    key: 'salaryVisible',
    label: 'Salary expectations',
    description: 'Share my desired salary range with employers I apply to.',
    defaultValue: true,
  },
  {
    key: 'currentEmployerHidden',
    label: 'Hide from current employer',
    description: 'Block your current employer\u2019s domain from seeing your profile.',
    defaultValue: false,
  },
]

const DEFAULTS: Record<string, boolean> = (() => {
  const init: Record<string, boolean> = {}
  for (const tg of [...NOTIFICATIONS, ...PRIVACY]) init[tg.key] = tg.defaultValue
  return init
})()

interface UserMe {
  id: string
  name?: string | null
  email?: string | null
  oauthData?: { settings?: Record<string, boolean> } | null
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const http = useHttpClient()
  const userId = (user?.id as string | undefined) ?? ''

  const [values, setValues] = useState<Record<string, boolean>>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastPersisted = useRef<Record<string, boolean>>(DEFAULTS)
  const [name, setName] = useState<string>((user?.name as string) || (user?.email as string) || '')
  const [email, setEmail] = useState<string>((user?.email as string) || '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Load persisted preferences on mount.
  useEffect(() => {
    if (!userId) {
      setLoaded(true)
      return
    }
    let cancelled = false
    http
      .get(`/api/users/${userId}`)
      .then((res) => {
        if (cancelled) return
        const me = unwrapSingle<UserMe>(res)
        const persisted = me?.oauthData?.settings ?? {}
        const merged: Record<string, boolean> = { ...DEFAULTS }
        for (const k of Object.keys(persisted)) {
          if (k in DEFAULTS) merged[k] = !!persisted[k]
        }
        setValues(merged)
        lastPersisted.current = merged
        const persistedName = (me?.name as string | null | undefined) ?? null
        if (persistedName !== null && persistedName !== undefined) {
          setName(persistedName || (me?.email ?? '') || '')
        }
        const persistedEmail = (me?.email as string | null | undefined) ?? null
        if (persistedEmail) setEmail(persistedEmail)
      })
      .catch(() => {
        // Use defaults on load error; user can still see and toggle.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [http, userId])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setProfileSaving(true)
    setProfileSaved(false)
    setProfileError(null)
    try {
      const updates: { name: string | null; email?: string } = { name: name.trim() || null }
      const trimmedEmail = email.trim()
      if (trimmedEmail) updates.email = trimmedEmail
      await http.patch(`/api/users/${userId}`, updates)
      setProfileSaved(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save'
      setProfileError(
        t(
          'settings.profileSaveError',
          {},
          { defaultValue: 'Could not save profile: {{message}}' },
        ).replace('{{message}}', message),
      )
    } finally {
      setProfileSaving(false)
    }
  }

  async function persist(next: Record<string, boolean>) {
    if (!userId) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await http.patch(`/api/users/${userId}`, {
        oauthData: { settings: next },
      })
      lastPersisted.current = next
      setSaved(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save'
      setError(
        t('settings.saveError', {}, { defaultValue: 'Could not save: {{message}}' }).replace(
          '{{message}}',
          message,
        ),
      )
      setValues(lastPersisted.current)
    } finally {
      setSaving(false)
    }
  }

  function toggle(key: string) {
    const next = { ...values, [key]: !values[key] }
    setValues(next)
    void persist(next)
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
          {t('settings.account', {}, { defaultValue: 'Account' })}
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
            { app: APP_NAME },
            {
              defaultValue: 'Notifications, privacy, and how {{app}} talks to you.',
            },
          )}
        </p>
      </header>

      {saved ? (
        <p
          role="status"
          className={cm.cn(
            cm.sp('p', 3),
            'rounded-xl bg-success/10 text-success font-semibold text-sm',
          )}
        >
          {t('settings.savedNotice', {}, { defaultValue: 'Preferences saved.' })}
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className={cm.cn(
            cm.sp('p', 3),
            'rounded-xl bg-error/10 text-error font-semibold text-sm',
          )}
        >
          {error}
        </p>
      ) : null}

      {!loaded ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
          {t('settings.loading', {}, { defaultValue: 'Loading\u2026' })}
        </p>
      ) : (
        <>
          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            )}
          >
            <h2
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('nav.profile', {}, { defaultValue: 'Profile' })}
            </h2>
            <form onSubmit={handleSaveProfile} className={cm.cn(cm.sp('mt', 4), cm.stack(4))}>
              <div className={cm.cn('flex flex-col gap-2')}>
                <label
                  htmlFor="settings-name"
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.displayName', {}, { defaultValue: 'Display name' })}
                </label>
                <input
                  id="settings-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setProfileSaved(false)
                    setProfileError(null)
                  }}
                  placeholder={t(
                    'settings.displayNamePlaceholder',
                    {},
                    { defaultValue: 'Maya Chen' },
                  )}
                  className={cm.cn(
                    'rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-sm font-medium text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
                  )}
                />
              </div>
              <div className={cm.cn('flex flex-col gap-2')}>
                <label
                  htmlFor="settings-email"
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('settings.email', {}, { defaultValue: 'Email' })}
                </label>
                <input
                  id="settings-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setProfileSaved(false)
                    setProfileError(null)
                  }}
                  autoComplete="email"
                  placeholder={t(
                    'settings.emailPlaceholder',
                    {},
                    { defaultValue: 'you@company.com' },
                  )}
                  className={cm.cn(
                    'rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-sm font-medium text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
                  )}
                />
              </div>
              {profileSaved ? (
                <p role="status" className={cm.cn('text-xs font-semibold text-success')}>
                  {t('settings.profileSaved', {}, { defaultValue: 'Profile updated.' })}
                </p>
              ) : null}
              {profileError ? (
                <p role="alert" className={cm.cn('text-xs font-semibold text-error')}>
                  {profileError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={profileSaving}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'self-start rounded-xl bg-primary text-on-primary shadow-sm hover:opacity-90 disabled:opacity-50',
                )}
              >
                {profileSaving
                  ? t('settings.saving', {}, { defaultValue: 'Saving\u2026' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
            </form>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            )}
          >
            <h2
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('footer.language', {}, { defaultValue: 'Language' })}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 1),
                cm.sp('mb', 4),
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
            <h2
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 1),
                cm.sp('mb', 4),
                'text-on-surface-variant',
              )}
            >
              {t(
                'common.toggleLightDark',
                {},
                { defaultValue: 'Toggle between light and dark mode.' },
              )}
            </p>
            <ThemeToggle />
          </section>
          <ToggleSection
            title={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            items={NOTIFICATIONS}
            keyPrefix="notifications"
            values={values}
            onToggle={toggle}
            disabled={saving}
          />
          <ToggleSection
            title={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            items={PRIVACY}
            keyPrefix="privacy"
            values={values}
            onToggle={toggle}
            disabled={saving}
          />
        </>
      )}
    </div>
  )
}

function ToggleSection({
  title,
  items,
  keyPrefix,
  values,
  onToggle,
  disabled,
}: {
  title: string
  items: Toggle[]
  keyPrefix: string
  values: Record<string, boolean>
  onToggle: (key: string) => void
  disabled: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
      )}
    >
      <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
        {title}
      </h2>
      <ul className={cm.cn(cm.sp('mt', 4), 'divide-y divide-outline-variant/20')}>
        {items.map((item) => {
          const on = values[item.key]
          return (
            <li
              key={item.key}
              className={cm.cn(cm.sp('py', 4), cm.flex({ align: 'center', gap: 'md' }))}
            >
              <div className={cm.cn('min-w-0 flex-1')}>
                <p className={cm.cn('text-sm font-bold tracking-tight text-on-surface')}>
                  {t(`settings.${keyPrefix}.${item.key}.label`, {}, { defaultValue: item.label })}
                </p>
                <p className={cm.cn('mt-0.5 text-xs text-on-surface-variant leading-relaxed')}>
                  {t(
                    `settings.${keyPrefix}.${item.key}.description`,
                    {},
                    { defaultValue: item.description },
                  )}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={item.label}
                disabled={disabled}
                onClick={() => onToggle(item.key)}
                className={cm.cn(
                  'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
                  on ? 'bg-primary' : 'bg-surface-container',
                )}
              >
                <span
                  className={cm.cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
                    on ? 'translate-x-5' : 'translate-x-1',
                  )}
                />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
