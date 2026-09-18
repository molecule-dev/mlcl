import { type FormEvent, useEffect, useMemo, useState } from 'react'

import { useAuth, useHttpClient, usePush, useTranslation } from '@molecule/app-react'
import type { PushToggleResult } from '@molecule/app-settings-panel-react'
import {
  disablePushOnCurrentDevice,
  enablePushOnCurrentDevice,
} from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

const SECTIONS = ['notifications', 'pharmacy', 'appearance', 'language'] as const
type Section = (typeof SECTIONS)[number]

interface NotificationSettings {
  dosePush: boolean
  preDose: boolean
  missed: boolean
  refillWarn: boolean
  caregiverEscalation: boolean
  quietStart: string
  quietEnd: string
}

interface PharmacySettings {
  name: string
  address: string
  phone: string
  autoRequest: boolean
}

interface AppearanceSettings {
  largeText: boolean
  highContrast: boolean
  timeFormat: '12h' | '24h'
}

interface SettingsData {
  notifications: NotificationSettings
  pharmacy: PharmacySettings
  appearance: AppearanceSettings
}

interface AccountUser {
  id: string
  oauthData?: { settings?: Partial<SettingsData> } & Record<string, unknown>
}

const defaults: SettingsData = {
  notifications: {
    dosePush: true,
    preDose: true,
    missed: true,
    refillWarn: true,
    caregiverEscalation: false,
    quietStart: '22:00',
    quietEnd: '07:00',
  },
  pharmacy: {
    name: '',
    address: '',
    phone: '',
    autoRequest: true,
  },
  appearance: {
    largeText: false,
    highContrast: false,
    timeFormat: '12h',
  },
}

const merge = (raw: Partial<SettingsData> | undefined): SettingsData => ({
  notifications: { ...defaults.notifications, ...(raw?.notifications ?? {}) },
  pharmacy: { ...defaults.pharmacy, ...(raw?.pharmacy ?? {}) },
  appearance: { ...defaults.appearance, ...(raw?.appearance ?? {}) },
})

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth<AccountUser>()
  const http = useHttpClient()
  const { requestPermission, register, unregister } = usePush()
  const user = auth.user
  const [section, setSection] = useState<Section>('notifications')
  const [settings, setSettings] = useState<SettingsData>(defaults)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [pushError, setPushError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setSettings(merge(user.oauthData?.settings))
  }, [user])

  const baseOauthData = useMemo(() => user?.oauthData ?? {}, [user])

  const persist = async (next: SettingsData) => {
    if (!user?.id) return
    setSaving(true)
    setMessage(null)
    try {
      const nextOauth = { ...baseOauthData, settings: next }
      await http.patch(`/api/users/${user.id}`, { oauthData: nextOauth })
      auth.setUser({ ...user, oauthData: nextOauth })
      setMessage({
        kind: 'ok',
        text: t('common.savedPeriod', {}, { defaultValue: 'Saved.' }),
      })
    } catch (err) {
      setMessage({
        kind: 'error',
        text:
          err instanceof Error
            ? err.message
            : t('settings.saveError', {}, { defaultValue: 'Could not save settings.' }),
      })
    } finally {
      setSaving(false)
    }
  }

  const setNotifications = (patch: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const next: SettingsData = {
        ...prev,
        notifications: { ...prev.notifications, ...patch },
      }
      void persist(next)
      return next
    })
  }

  const pushFailureText = (result: Extract<PushToggleResult, { ok: false }>): string => {
    switch (result.reason) {
      case 'permission-denied':
        return t(
          'settings.pushPermissionDenied',
          {},
          { defaultValue: 'Notification permission was denied.' },
        )
      case 'server-unconfigured':
        return t(
          'settings.pushServerUnavailable',
          {},
          { defaultValue: 'Push notifications are not configured on this server.' },
        )
      case 'register-failed':
        return (
          result.message ||
          t(
            'settings.pushUpdateFailed',
            {},
            { defaultValue: 'Could not update push notification settings.' },
          )
        )
      case 'persist-failed':
        return t(
          'settings.pushUpdateFailed',
          {},
          { defaultValue: 'Could not update push notification settings.' },
        )
    }
  }

  /**
   * Dose-time push is the one preference that needs a REAL browser
   * subscription, not just a stored flag: enabling runs the full chain
   * (permission → VAPID key from `GET /api/devices/push/public-key` →
   * `pushManager.subscribe` → PATCH the subscription onto this device row,
   * where the due-reminder task's fan-out reads it). The preference only
   * flips on when that chain succeeds — an honest failure message shows
   * otherwise (e.g. dev builds have no service worker).
   */
  const setDosePush = async (v: boolean): Promise<void> => {
    setPushError(null)
    if (v) {
      const result = await enablePushOnCurrentDevice({ http, requestPermission, register })
      if (!result.ok) {
        setPushError(pushFailureText(result))
        return
      }
      setNotifications({ dosePush: true })
      return
    }
    // Turning it OFF flips immediately, before the unsubscribe. Enabling has to
    // wait — the flag would otherwise claim push works when the chain failed —
    // but there is nothing to verify on the way down, and awaiting a network
    // round-trip left the switch visibly stuck under the user's finger for ~1s.
    // (Playwright's uncheck() reports that as "clicking did not change its
    // state" and fails, which is exactly what a user experiences.)
    setNotifications({ dosePush: false })
    const result = await disablePushOnCurrentDevice({ http, unregister })
    if (!result.ok) {
      setPushError(pushFailureText(result))
    }
  }
  const setPharmacy = (patch: Partial<PharmacySettings>) => {
    setSettings((prev) => ({
      ...prev,
      pharmacy: { ...prev.pharmacy, ...patch },
    }))
  }
  const setAppearance = (patch: Partial<AppearanceSettings>) => {
    setSettings((prev) => {
      const next: SettingsData = {
        ...prev,
        appearance: { ...prev.appearance, ...patch },
      }
      void persist(next)
      return next
    })
  }

  const submitPharmacy = (event: FormEvent) => {
    event.preventDefault()
    void persist(settings)
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
                onClick={() => setSection(s)}
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
        {saving ? (
          <p
            className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 3))}
            aria-live="polite"
          >
            {t('settings.saving', {}, { defaultValue: 'Saving…' })}
          </p>
        ) : message ? (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 3),
              message.kind === 'ok' ? 'text-success' : 'text-error',
            )}
            role="status"
            aria-live="polite"
          >
            {message.text}
          </p>
        ) : null}
      </aside>

      <main className={cm.cn('col-span-12 md:col-span-9 space-y-4')}>
        {section === 'notifications' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.notifications.heading', {}, { defaultValue: 'Reminders' })}
            </h2>
            <Toggle
              label={t(
                'settings.notifications.dosePush',
                {},
                { defaultValue: 'Dose-time push notification' },
              )}
              checked={settings.notifications.dosePush}
              onChange={(v) => void setDosePush(v)}
            />
            {pushError ? (
              <p
                className={cm.cn(cm.textSize('xs'), cm.textError)}
                role="alert"
                data-mol-id="settings-push-error"
              >
                {pushError}
              </p>
            ) : null}
            <Toggle
              label={t(
                'settings.notifications.preDose',
                {},
                { defaultValue: '15-minute pre-dose reminder' },
              )}
              checked={settings.notifications.preDose}
              onChange={(v) => setNotifications({ preDose: v })}
            />
            <Toggle
              label={t(
                'settings.notifications.missed',
                {},
                { defaultValue: 'Missed-dose alert (after 30 min)' },
              )}
              checked={settings.notifications.missed}
              onChange={(v) => setNotifications({ missed: v })}
            />
            <Toggle
              label={t(
                'settings.notifications.refillWarn',
                {},
                { defaultValue: 'Refill warning (5 days out)' },
              )}
              checked={settings.notifications.refillWarn}
              onChange={(v) => setNotifications({ refillWarn: v })}
            />
            <Toggle
              label={t(
                'settings.notifications.caregiverEscalation',
                {},
                { defaultValue: 'Escalate missed-dose to caregivers (after 2 hours)' },
              )}
              checked={settings.notifications.caregiverEscalation}
              onChange={(v) => setNotifications({ caregiverEscalation: v })}
            />
            <Field
              label={t(
                'settings.notifications.quietStart',
                {},
                { defaultValue: 'Quiet hours start' },
              )}
              type="time"
              value={settings.notifications.quietStart}
              onChange={(v) => setNotifications({ quietStart: v })}
            />
            <Field
              label={t('settings.notifications.quietEnd', {}, { defaultValue: 'Quiet hours end' })}
              type="time"
              value={settings.notifications.quietEnd}
              onChange={(v) => setNotifications({ quietEnd: v })}
            />
          </section>
        )}

        {section === 'pharmacy' && (
          <form onSubmit={submitPharmacy} className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.pharmacy.heading', {}, { defaultValue: 'Default pharmacy' })}
            </h2>
            <Field
              label={t('settings.pharmacy.name', {}, { defaultValue: 'Pharmacy name' })}
              value={settings.pharmacy.name}
              onChange={(v) => setPharmacy({ name: v })}
            />
            <Field
              label={t('form.address', {}, { defaultValue: 'Address' })}
              value={settings.pharmacy.address}
              onChange={(v) => setPharmacy({ address: v })}
            />
            <Field
              label={t('form.phone', {}, { defaultValue: 'Phone' })}
              type="tel"
              value={settings.pharmacy.phone}
              onChange={(v) => setPharmacy({ phone: v })}
            />
            <Toggle
              label={t(
                'settings.pharmacy.autoRequest',
                {},
                { defaultValue: 'Auto-request refill when 7 days remain' },
              )}
              checked={settings.pharmacy.autoRequest}
              onChange={(v) => {
                setPharmacy({ autoRequest: v })
                void persist({
                  ...settings,
                  pharmacy: { ...settings.pharmacy, autoRequest: v },
                })
              }}
            />
            <button
              type="submit"
              disabled={saving}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'rounded-md bg-primary text-on-primary disabled:opacity-60',
              )}
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('settings.savePharmacy', {}, { defaultValue: 'Save pharmacy' })}
            </button>
          </form>
        )}

        {section === 'appearance' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.appearance.description',
                {},
                { defaultValue: 'Toggle between light and dark mode.' },
              )}
            </p>
            <ThemeToggle />
            <Toggle
              label={t(
                'settings.appearance.largeText',
                {},
                { defaultValue: 'Use larger text everywhere' },
              )}
              checked={settings.appearance.largeText}
              onChange={(v) => setAppearance({ largeText: v })}
            />
            <Toggle
              label={t(
                'settings.appearance.highContrast',
                {},
                { defaultValue: 'High-contrast colors' },
              )}
              checked={settings.appearance.highContrast}
              onChange={(v) => setAppearance({ highContrast: v })}
            />
            <label className="block">
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
              >
                {t('settings.appearance.timeFormat', {}, { defaultValue: 'Time format' })}
              </span>
              <select
                value={settings.appearance.timeFormat}
                onChange={(event) =>
                  setAppearance({
                    timeFormat: event.target.value === '24h' ? '24h' : '12h',
                  })
                }
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'w-full border border-outline-variant rounded-md',
                )}
              >
                <option value="12h">
                  {t('settings.appearance.timeFormat12h', {}, { defaultValue: '12-hour (AM/PM)' })}
                </option>
                <option value="24h">
                  {t('settings.appearance.timeFormat24h', {}, { defaultValue: '24-hour' })}
                </option>
              </select>
            </label>
          </section>
        )}

        {section === 'language' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
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
  onChange: (v: string) => void
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
        onChange={(event) => onChange(event.target.value)}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />
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
    <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={cm.cn(cm.h(4), cm.w(4))}
      />
      <span className={cm.cn(cm.textSize('sm'))}>{label}</span>
    </label>
  )
}
