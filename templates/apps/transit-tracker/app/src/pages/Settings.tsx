import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

const TELEMETRY_ROWS = [
  {
    id: 'client',
    icon: 'memory',
    titleKey: 'settings.telemetry.client.title',
    titleDefault: 'Client-side "when to walk" computation',
    bodyKey: 'settings.telemetry.client.body',
    bodyDefault:
      'Walk-buffer alarms are computed in this browser from the published schedule — your position never leaves the device for the math.',
  },
  {
    id: 'cache',
    icon: 'storage',
    titleKey: 'settings.telemetry.cache.title',
    titleDefault: 'Open GTFS telemetry cache',
    bodyKey: 'settings.telemetry.cache.body',
    bodyDefault:
      'Schedules and line geometry are cached from the open GTFS feed so boards render fast; the cache holds public data only.',
  },
  {
    id: 'session',
    icon: 'devices',
    titleKey: 'settings.telemetry.session.title',
    titleDefault: 'Sessions on this device',
    bodyKey: 'settings.telemetry.session.body',
    bodyDefault:
      "You are signed in on this device only unless you signed in elsewhere; signing out revokes this session's token.",
  },
] as const

const PREFERENCES = [
  {
    id: 'disruption_alerts',
    defaultLabel: 'Disruption alerts',
    defaultBody: 'When a line or stop you ride has delays, diversions, or closures.',
  },
  {
    id: 'departure_alerts',
    defaultLabel: 'Departure reminders',
    defaultBody: 'A heads-up when the next departure at a saved stop is due soon.',
  },
  {
    id: 'weekly_digest',
    defaultLabel: 'Weekly digest',
    defaultBody: 'A Sunday recap of schedule changes across your saved stops.',
  },
  {
    id: 'schedule_changes',
    defaultLabel: 'Schedule changes',
    defaultBody: 'When a timetable you follow changes for an upcoming service day.',
  },
] as const

const TABS = [
  { id: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { id: 'preferences', defaultLabel: 'Preferences', icon: 'tune' },
  { id: 'language', defaultLabel: 'Language', icon: 'language' },
] as const

interface UserPrefs {
  home_stop?: string
  currency?: string
  notifications?: Record<string, boolean>
}

interface UserProfile {
  id?: string
  name?: string
  email?: string
  oauthData?: {
    preferences?: UserPrefs
  } & Record<string, unknown>
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const auth = useAuth()
  const sessionUser = (auth as { user?: UserProfile | null } | undefined)?.user ?? null
  const setAuthUser = (auth as { setUser?: (u: UserProfile | null) => void } | undefined)?.setUser

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('profile')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [home, setHome] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    disruption_alerts: true,
    departure_alerts: true,
    weekly_digest: false,
    schedule_changes: true,
  })
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  useEffect(() => {
    if (sessionUser) {
      setName(sessionUser.name ?? '')
      setEmail(sessionUser.email ?? '')
      const userPrefs = sessionUser.oauthData?.preferences
      setHome(userPrefs?.home_stop ?? '')
      setCurrency(userPrefs?.currency ?? 'USD')
      const notif = userPrefs?.notifications
      if (notif && typeof notif === 'object') {
        setPrefs((prev) => ({ ...prev, ...notif }))
      }
    }
  }, [sessionUser])

  // Always pull the persisted state on mount. The cached `useAuth().user`
  // is hydrated from localStorage at app boot and only refreshed when the
  // refresh token is exercised — so after a Settings save + page reload, the
  // cached user still reflects pre-save defaults. The user row itself is
  // fetched for name/email, but preferences come from GET /api/preferences:
  // the shared user resource strips "oauthData" from every user READ
  // (M18 denylist), so preferences would never survive that path.
  useEffect(() => {
    let cancelled = false
    if (!sessionUser?.id) return
    http
      .get<UserProfile | { props?: UserProfile }>(
        `/api/users/${encodeURIComponent(sessionUser.id)}`,
      )
      .then((res) => {
        if (cancelled) return
        const wire = res.data as UserProfile & { props?: UserProfile }
        const fresh = (wire?.props ?? wire) as UserProfile
        if (!fresh) return
        if (typeof fresh.name === 'string') setName(fresh.name)
        if (typeof fresh.email === 'string') setEmail(fresh.email)
      })
      .catch(() => {
        /* fall back to cached sessionUser */
      })
    http
      .get<UserPrefs | { props?: UserPrefs }>('/api/preferences')
      .then((res) => {
        if (cancelled) return
        const wire = res.data as UserPrefs & { props?: UserPrefs }
        const p = (wire?.props ?? wire) as UserPrefs
        if (!p) return
        if (p.home_stop != null) setHome(p.home_stop)
        if (p.currency != null) setCurrency(p.currency)
        if (p.notifications && typeof p.notifications === 'object') {
          setPrefs((prev) => ({ ...prev, ...p.notifications }))
        }
      })
      .catch(() => {
        /* fall back to cached sessionUser preferences */
      })
    return () => {
      cancelled = true
    }
  }, [http, sessionUser?.id])

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
      const nextOauth = {
        ...(sessionUser.oauthData ?? {}),
        preferences: {
          home_stop: home.toUpperCase(),
          currency,
          notifications: prefs,
        },
      }
      // Profile fields go through the user resource; preferences go through
      // the app-owned /api/preferences route (a server-side read-modify-write
      // of the same "oauthData".preferences bag — the only channel that can
      // read it back, because the shared user resource strips "oauthData"
      // from every user READ response).
      await Promise.all([
        http.patch(`/api/users/${encodeURIComponent(sessionUser.id)}`, {
          name,
          email,
          oauthData: nextOauth,
        }),
        http.patch('/api/preferences', {
          home_stop: home.toUpperCase(),
          currency,
          notifications: prefs,
        }),
      ])
      // Sync the auth client's cached user so other parts of the UI (and a
      // page reload that hydrates from localStorage) reflect the new
      // preferences without needing another network roundtrip.
      if (typeof setAuthUser === 'function') {
        setAuthUser({
          ...sessionUser,
          name,
          email,
          oauthData: nextOauth,
        })
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
      <header className={cm.cn(cm.sp('mb', 6))}>
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
      </header>

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
              // shrink-0: on narrow screens the strip scrolls (overflow-x-auto
              // on the nav) instead of squishing the labels into clipped text.
              'shrink-0 whitespace-nowrap rounded-xl transition-colors',
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
              {t(
                'settings.profile.heading',
                {},
                { defaultValue: 'Commuter identity & SmartPass card' },
              )}
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
              {/* Design's "Commute Hubs & Default Stations" — the rider's
                  anchor stops. Sits between the identity fields and the hub
                  fields; the input ORDER here is an e2e contract (inputs 2
                  and 3 are home stop and currency), so add headings only. */}
              <div className={cm.cn('md:col-span-2', cm.sp('mt', 2))}>
                <h3
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-[0.25em] text-on-surface-variant',
                  )}
                >
                  {t(
                    'settings.profile.hubsHeading',
                    {},
                    { defaultValue: 'Commute hubs & default stations' },
                  )}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                  {t(
                    'settings.profile.hubsBody',
                    {},
                    {
                      defaultValue:
                        'Home stop leads the boards you see first; currency formats fares in the planner.',
                    },
                  )}
                </p>
              </div>
              <Field
                label={t('settings.profile.home', {}, { defaultValue: 'Home stop' })}
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
      {/* Design's "Telemetry Engine & System Security" — what the engine is
          and the privacy line it holds. Deliberately display-only: no inputs
          or toggles here (the preferences e2e addresses toggles page-wide). */}
      <section
        data-mol-id="settings-telemetry-security"
        className={cm.cn(cm.sp('mt', 6), cm.sp('p', 8), 'bg-surface-container-low rounded-2xl')}
      >
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              'shrink-0 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20',
            )}
            aria-hidden="true"
          >
            <span className="material-symbols-outlined text-xl">security</span>
          </span>
          <div>
            <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
              {t(
                'settings.telemetry.heading',
                {},
                { defaultValue: 'Telemetry engine & system security' },
              )}
            </h3>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'settings.telemetry.sub',
                {},
                { defaultValue: 'Open transit telemetry, zero-surveillance standards.' },
              )}
            </p>
          </div>
        </div>
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mt', 5))}>
          {TELEMETRY_ROWS.map((row) => (
            <li
              key={row.id}
              data-mol-id={`settings-telemetry-${row.id}`}
              className={cm.cn(
                cm.flex({ align: 'start', gap: 'md' }),
                cm.sp('p', 4),
                'bg-surface rounded-xl ring-1 ring-outline-variant/40',
              )}
            >
              <span className={'material-symbols-outlined text-lg text-primary'} aria-hidden="true">
                {row.icon}
              </span>
              <div className="min-w-0">
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                  {t(row.titleKey, {}, { defaultValue: row.titleDefault })}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 0.5),
                    'text-on-surface-variant leading-relaxed',
                  )}
                >
                  {t(row.bodyKey, {}, { defaultValue: row.bodyDefault })}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 4), 'text-on-surface-variant')}>
          {t('settings.telemetry.privacyLead', {}, { defaultValue: 'The full charter:' })}{' '}
          <Link
            to="/privacy"
            data-mol-id="settings-telemetry-privacy-link"
            className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
          >
            {t('nav.privacy', {}, { defaultValue: 'Privacy policy' })}
          </Link>
        </p>
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
