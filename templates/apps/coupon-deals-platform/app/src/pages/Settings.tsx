import { type FormEvent, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import {
  AuthSection,
  DevicesSection,
  LogOutDeleteSection,
  NotificationsSection,
  SettingsContainer,
  ThisDeviceSection,
} from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

const SECTIONS = [
  'profile',
  'preferences',
  'language',
  'notifications',
  'payment',
  'account',
] as const
type Section = (typeof SECTIONS)[number]

function readSectionFromHash(): Section {
  if (typeof window === 'undefined') return 'profile'
  const h = window.location.hash.replace('#', '')
  return (SECTIONS as readonly string[]).includes(h) ? (h as Section) : 'profile'
}

interface ProfileUser {
  id?: string
  name?: string | null
  email?: string | null
  city?: string | null
}

interface PreferenceShape {
  search_radius_km: number
  favorite_categories: string[]
}

interface NotificationFlags {
  hot: boolean
  expiring: boolean
  redeemed: boolean
  new_merchant: boolean
}

const DEFAULT_PREFS: PreferenceShape = { search_radius_km: 5, favorite_categories: [] }
const DEFAULT_NOTIFS: NotificationFlags = {
  hot: true,
  expiring: true,
  redeemed: true,
  new_merchant: false,
}

function isPreferenceShape(value: unknown): value is PreferenceShape {
  return (
    !!value &&
    typeof value === 'object' &&
    Number.isFinite((value as { search_radius_km?: number }).search_radius_km) &&
    Array.isArray((value as { favorite_categories?: unknown }).favorite_categories)
  )
}

function isNotificationFlags(value: unknown): value is NotificationFlags {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return ['hot', 'expiring', 'redeemed', 'new_merchant'].every((k) => typeof v[k] === 'boolean')
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<ProfileUser>()
  const http = useHttpClient()
  const location = useLocation()
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>(readSectionFromHash)

  // Sync section state with the URL hash. Listen to BOTH react-router's
  // location changes (pushState/popstate) and native hashchange so that
  // direct hash assignment via `window.location.hash = ...` is also picked
  // up. Without the hashchange listener, react-router's `useLocation()`
  // misses pure-hash navigation and the section drifts out of sync.
  useEffect(() => {
    setSection(readSectionFromHash())
    const onHashChange = () => setSection(readSectionFromHash())
    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('popstate', onHashChange)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('popstate', onHashChange)
    }
  }, [location.pathname, location.hash])

  function selectSection(next: Section) {
    setSection(next)
    if (typeof window !== 'undefined') {
      window.location.hash = next
    }
  }

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')

  const [prefs, setPrefs] = useState<PreferenceShape>(DEFAULT_PREFS)
  const [notifs, setNotifs] = useState<NotificationFlags>(DEFAULT_NOTIFS)

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!user) return
    setName(user.name ?? '')
    setEmail(user.email ?? '')
    setCity(user.city ?? '')
  }, [user])

  // Hydrate preferences + notifications + city from /api/user-settings.
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    http
      .get<Record<string, unknown>>('/user-settings')
      .then((res) => {
        if (cancelled) return
        const body = (res?.data ?? res) as Record<string, unknown>
        if (typeof body.city === 'string') setCity(body.city)
        if (isPreferenceShape(body.preferences)) setPrefs(body.preferences)
        if (isNotificationFlags(body.notification_prefs)) setNotifs(body.notification_prefs)
      })
      .catch(() => {
        // Non-fatal — defaults stay in place.
      })
    return () => {
      cancelled = true
    }
  }, [http, user?.id])

  async function handleSave(e?: FormEvent) {
    e?.preventDefault()
    if (!user?.id) return
    setSaving(true)
    setMessage(null)
    try {
      // Profile name / email live on the user resource.
      await http.patch(`/users/${user.id}`, { name, email })
      // City + preferences + notifications are app-specific settings.
      await http.put('/user-settings', {
        city,
        preferences: prefs,
        notification_prefs: notifs,
      })
      void track({ name: 'settings.updated', properties: { user_id: user.id } })
      setMessage({
        type: 'success',
        text: t('common.settingsSavedPeriod', {}, { defaultValue: 'Settings saved.' }),
      })
    } catch (e) {
      setMessage({
        type: 'error',
        text:
          e instanceof Error
            ? e.message
            : t('settings.saveError', {}, { defaultValue: 'Failed to save settings.' }),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.grid({ cols: 12, gap: 'lg' }))}>
      <aside className={cm.cn('col-span-12 md:col-span-3')}>
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <nav
          className={cm.cn('space-y-1')}
          aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
        >
          {SECTIONS.map((s) => {
            const isActive = section === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => selectSection(s)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block w-full text-left rounded-md',
                  isActive
                    ? cm.cn('bg-primary-container', cm.textPrimary)
                    : cm.cn(
                        'text-on-surface-variant',
                        'hover:bg-surface-container hover:text-on-surface',
                      ),
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {t(
                  `settings.section.${s}`,
                  {},
                  { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      <main className={cm.cn('col-span-12 md:col-span-9 space-y-4')}>
        {message && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-lg',
              message.type === 'success'
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-error-container text-on-error-container',
            )}
          >
            {message.text}
          </div>
        )}

        {section === 'profile' && (
          <form
            data-mol-id="settings-profile-form"
            onSubmit={handleSave}
            className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.profile.heading', {}, { defaultValue: 'Profile' })}
            </h2>
            <Field
              label={t('form.displayName', {}, { defaultValue: 'Display name' })}
              value={name}
              onChange={setName}
            />
            <Field
              label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              type="email"
              value={email}
              onChange={setEmail}
            />
            <Field
              label={t('settings.profile.city', {}, { defaultValue: 'City' })}
              value={city}
              onChange={setCity}
            />
            <div className={cm.flex({ align: 'center', gap: 'md' })}>
              <button
                type="submit"
                disabled={saving || !user?.id}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'rounded-full bg-primary text-on-primary disabled:opacity-50',
                )}
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveProfile', {}, { defaultValue: 'Save profile' })}
              </button>
            </div>
          </form>
        )}

        {section === 'preferences' && (
          <form
            data-mol-id="settings-preferences-form"
            onSubmit={handleSave}
            className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('nav.preferences', {}, { defaultValue: 'Preferences' })}
            </h2>
            <Field
              label={t('settings.preferences.radius', {}, { defaultValue: 'Search radius (km)' })}
              type="number"
              value={String(prefs.search_radius_km)}
              onChange={(v) => setPrefs((p) => ({ ...p, search_radius_km: Number(v) || 0 }))}
            />
            <Field
              label={t(
                'settings.preferences.categories',
                {},
                { defaultValue: 'Favorite categories (comma-separated)' },
              )}
              value={prefs.favorite_categories.join(', ')}
              onChange={(v) =>
                setPrefs((p) => ({
                  ...p,
                  favorite_categories: v
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
            />
            <button
              type="submit"
              disabled={saving || !user?.id}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'rounded-full bg-primary text-on-primary disabled:opacity-50',
              )}
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('settings.save', {}, { defaultValue: 'Save preferences' })}
            </button>
          </form>
        )}

        {section === 'language' && (
          <section
            data-mol-id="settings-language"
            className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('footer.language', {}, { defaultValue: 'Language' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'common.chooseTheLanguage',
                {},
                { defaultValue: 'Choose the language used throughout the app.' },
              )}
            </p>
            <LanguagePicker />
          </section>
        )}

        {section === 'notifications' && (
          <form
            data-mol-id="settings-notifications-form"
            onSubmit={handleSave}
            className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('nav.notificationPreferences', {}, { defaultValue: 'Notification preferences' })}
            </h2>
            {(
              [
                { key: 'hot', defaultLabel: 'New hot deals' },
                { key: 'expiring', defaultLabel: 'Saved coupons expiring' },
                { key: 'redeemed', defaultLabel: 'Redemption confirmations' },
                { key: 'new_merchant', defaultLabel: 'New merchants nearby' },
              ] as const
            ).map((n) => (
              <label
                key={n.key}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  'cursor-pointer',
                )}
              >
                <span className={cm.textSize('sm')}>
                  {t(`settings.notifications.${n.key}`, {}, { defaultValue: n.defaultLabel })}
                </span>
                <input
                  type="checkbox"
                  checked={notifs[n.key]}
                  onChange={(e) =>
                    setNotifs((current) => ({ ...current, [n.key]: e.target.checked }))
                  }
                  className={cm.cn('h-4 w-4')}
                />
              </label>
            ))}
            <button
              type="submit"
              disabled={saving || !user?.id}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'rounded-full bg-primary text-on-primary disabled:opacity-50',
              )}
            >
              {saving
                ? t('settings.saving', {}, { defaultValue: 'Saving…' })
                : t('settings.save', {}, { defaultValue: 'Save notification settings' })}
            </button>
          </form>
        )}

        {section === 'payment' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.payment.heading', {}, { defaultValue: 'Billing & payment' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.payment.subtitle',
                {},
                {
                  defaultValue:
                    'Manage your subscription tier, change cards, or cancel — all through the secure billing portal.',
                },
              )}
            </p>
            <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
              <Link
                to="/pricing"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'rounded-full bg-primary text-on-primary inline-block',
                )}
              >
                {t('settings.payment.viewPlans', {}, { defaultValue: 'View plans' })}
              </Link>
              <Link
                to="/plan-updated"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'rounded-full border border-outline text-on-surface inline-block hover:bg-surface-container',
                )}
              >
                {t('settings.payment.viewReceipts', {}, { defaultValue: 'View latest receipt' })}
              </Link>
            </div>
          </section>
        )}

        {section === 'account' && (
          <div data-mol-id="settings-account" className={cm.card()}>
            {/*
              Account & security flows mounted from the shared, ClassMap-themed,
              i18n-driven @molecule/app-settings-panel-react sections wired to the
              standard API (PATCH/DELETE /api/users/:id, /api/users/me, /api/devices):
                - AuthSection: change password (modal) + 2FA toggle (auto-hides for OAuth users)
                - NotificationsSection: browser push subscribe/unsubscribe via @molecule/app-push
                - DevicesSection + ThisDeviceSection: registered devices + this device
                - LogOutDeleteSection: sign out + delete-account (password-confirm) modal
              SettingsContainer provides the onClose context LogOutDeleteSection reads;
              on this full page there is no panel to dismiss, so onClose navigates home
              (LogOutDeleteSection itself routes to /login after sign-out / delete).
            */}
            <SettingsContainer onClose={() => navigate('/dashboard')}>
              <AuthSection />
              <NotificationsSection />
              <DevicesSection />
              <ThisDeviceSection />
              <LogOutDeleteSection />
            </SettingsContainer>
          </div>
        )}
        <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
          <div className={cm.sp('mb', 6)}>
            <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
              {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
            </h3>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'settings.appearance.description',
                {},
                { defaultValue: 'Toggle between light and dark mode.' },
              )}
            </p>
          </div>
          <ThemeToggle />
        </section>
      </main>
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
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}
