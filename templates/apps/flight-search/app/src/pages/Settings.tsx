import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

const PREFERENCES = [
  {
    id: 'price_drops',
    defaultLabel: 'Price drop emails',
    defaultBody: 'When a tracked route drops below your target price.',
  },
  {
    id: 'fare_alerts',
    defaultLabel: 'Error fare push',
    defaultBody: 'Mistake fares from any tracked airline, instantly.',
  },
  {
    id: 'weekly_digest',
    defaultLabel: 'Weekly digest',
    defaultBody: 'A Sunday recap of fare trends across your watched routes.',
  },
  {
    id: 'expiring_alerts',
    defaultLabel: 'Expiring searches',
    defaultBody: 'Heads-up when a saved search nears its departure date.',
  },
] as const

const TABS = [
  { id: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { id: 'preferences', defaultLabel: 'Preferences', icon: 'tune' },
  { id: 'language', defaultLabel: 'Language', icon: 'language' },
] as const

interface UserPrefs {
  home_airport?: string
  currency?: string
  notifications?: Record<string, boolean>
}

interface SessionUser {
  id?: string
  name?: string
  email?: string
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const auth = useAuth()
  const sessionUser = (auth as { user?: SessionUser | null } | undefined)?.user ?? null
  const setAuthUser = (auth as { setUser?: (u: SessionUser | null) => void } | undefined)?.setUser

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('profile')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [home, setHome] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    price_drops: true,
    fare_alerts: true,
    weekly_digest: false,
    expiring_alerts: true,
  })
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  useEffect(() => {
    if (sessionUser) {
      setName(sessionUser.name ?? '')
      setEmail(sessionUser.email ?? '')
    }
  }, [sessionUser])

  // Always pull the persisted preferences on mount. The platform user
  // resource NEVER returns `oauthData` on reads (sensitive-column denylist),
  // so home airport / currency / notification toggles must come through the
  // server-side `/api/preferences` channel — reading them off the cached auth
  // user would show defaults forever. Re-fetching here makes the form always
  // reflect the live DB state and survives reload.
  useEffect(() => {
    let cancelled = false
    http
      .get<UserPrefs>('/api/preferences')
      .then((res) => {
        if (cancelled) return
        const p = res.data
        if (!p || typeof p !== 'object') return
        if (typeof p.home_airport === 'string') setHome(p.home_airport)
        if (typeof p.currency === 'string') setCurrency(p.currency)
        if (p.notifications && typeof p.notifications === 'object') {
          setPrefs((prev) => ({ ...prev, ...p.notifications }))
        }
      })
      .catch(() => {
        /* keep defaults; the next Save re-syncs the server */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  function togglePref(id: string) {
    setPrefs((prev) => ({ ...prev, [id]: !prev[id] }))
    setSaveStatus('idle')
  }

  async function handleSave() {
    if (!sessionUser?.id) {
      setSaveStatus('error')
      return
    }
    setSaving(true)
    setSaveStatus('idle')
    try {
      // Identity fields go through the standard user resource; the
      // preferences slice goes through the server-side `/api/preferences`
      // channel — `oauthData` is a sensitive column that the platform user
      // resource never returns on reads, so it must not be written there.
      await http.patch(`/api/users/${encodeURIComponent(sessionUser.id)}`, {
        name,
        email,
      })
      await http.patch('/api/preferences', {
        home_airport: home.toUpperCase(),
        currency,
        notifications: prefs,
      })
      void track({
        name: 'preferences.updated',
        properties: { user_id: sessionUser.id, home_airport: home.toUpperCase(), currency },
      })
      // Sync the auth client's cached user so the header reflects a renamed
      // profile without another network roundtrip. Preferences deliberately
      // stay out of the cached user — they are read from /api/preferences.
      if (typeof setAuthUser === 'function') {
        setAuthUser({ ...sessionUser, name, email })
      }
      setSaveStatus('saved')
    } catch (err: unknown) {
      console.error('[Settings] save failed:', err)
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <div className={cm.cn(cm.sp('mb', 6))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary',
          )}
        >
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 2),
            'leading-tight tracking-tight',
          )}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
      </div>

      <nav
        className={cm.cn(
          cm.sp('p', 2),
          cm.flex({ gap: 'sm' }),
          'bg-surface rounded-2xl shadow-sm ring-1 ring-outline-variant/40 overflow-x-auto',
        )}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 'sm' }),
              'rounded-xl transition-colors',
              activeTab === tab.id
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container',
            )}
            aria-pressed={activeTab === tab.id}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              {tab.icon}
            </span>
            {t(`settings.tabs.${tab.id}`, {}, { defaultValue: tab.defaultLabel })}
          </button>
        ))}
      </nav>

      <section
        className={cm.cn(
          cm.sp('mt', 6),
          cm.sp('p', 6),
          'bg-surface rounded-2xl shadow-sm ring-1 ring-outline-variant/40',
        )}
      >
        {activeTab === 'language' ? (
          <>
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'uppercase tracking-[0.25em] text-on-surface-variant',
              )}
            >
              {t('settings.language.title', {}, { defaultValue: 'Language' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
              {t(
                'common.chooseTheLanguage',
                {},
                { defaultValue: 'Choose the language used throughout the app.' },
              )}
            </p>
            <LanguagePicker />
          </>
        ) : activeTab === 'profile' ? (
          <>
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'uppercase tracking-[0.25em] text-on-surface-variant',
              )}
            >
              {t('settings.profile.heading', {}, { defaultValue: 'Personal details' })}
            </h2>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
              <Field
                label={t('form.fullName', {}, { defaultValue: 'Full name' })}
                value={name}
                onChange={setName}
              />
              <Field
                label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                value={email}
                onChange={setEmail}
                type="email"
              />
              <Field
                label={t('settings.profile.home', {}, { defaultValue: 'Home airport' })}
                value={home}
                onChange={setHome}
              />
              <Field
                label={t('settings.profile.currency', {}, { defaultValue: 'Currency' })}
                value={currency}
                onChange={setCurrency}
              />
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.sp('mt', 6),
                cm.fontWeight('bold'),
                'rounded-xl bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-60',
              )}
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
            </button>
            {saveStatus === 'saved' ? (
              <p className={cm.cn(cm.sp('mt', 3), cm.textSize('sm'), 'text-cheapest')}>
                {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
              </p>
            ) : saveStatus === 'error' ? (
              <p className={cm.cn(cm.sp('mt', 3), cm.textSize('sm'), 'text-error')}>
                {t('common.couldNotSaveChanges', {}, { defaultValue: 'Could not save changes.' })}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'uppercase tracking-[0.25em] text-on-surface-variant',
              )}
            >
              {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            </h2>
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              {PREFERENCES.map((pref) => {
                const enabled = prefs[pref.id] ?? false
                return (
                  <li
                    key={pref.id}
                    className={cm.cn(
                      cm.sp('p', 4),
                      cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                      'bg-surface-container-low rounded-xl ring-1 ring-outline-variant/40',
                    )}
                  >
                    <div className={'min-w-0'}>
                      <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                        {t(
                          `settings.preferences.${pref.id}.label`,
                          {},
                          { defaultValue: pref.defaultLabel },
                        )}
                      </p>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.sp('mt', 1),
                          'text-on-surface-variant',
                        )}
                      >
                        {t(
                          `settings.preferences.${pref.id}.body`,
                          {},
                          { defaultValue: pref.defaultBody },
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePref(pref.id)}
                      aria-pressed={enabled}
                      className={cm.cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        enabled ? 'bg-primary' : 'bg-surface-container ring-1 ring-outline-variant',
                      )}
                    >
                      <span
                        className={cm.cn(
                          'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform',
                          enabled ? 'translate-x-5' : 'translate-x-0.5',
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.sp('mt', 6),
                cm.fontWeight('bold'),
                'rounded-xl bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-60',
              )}
            >
              {saving
                ? t('settings.saving', {}, { defaultValue: 'Saving…' })
                : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
            </button>
            {saveStatus === 'saved' ? (
              <p className={cm.cn(cm.sp('mt', 3), cm.textSize('sm'), 'text-cheapest')}>
                {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
              </p>
            ) : saveStatus === 'error' ? (
              <p className={cm.cn(cm.sp('mt', 3), cm.textSize('sm'), 'text-error')}>
                {t('common.couldNotSaveChanges', {}, { defaultValue: 'Could not save changes.' })}
              </p>
            ) : null}
          </>
        )}
      </section>
      <section
        className={cm.cn(cm.sp('mt', 6), cm.sp('p', 8), 'bg-surface-container-low rounded-2xl')}
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
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (next: string) => void
  type?: string
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.fontWeight('semibold'),
          'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
        )}
      />
    </label>
  )
}
