import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import {
  AccountSection,
  AuthSection,
  DevicesSection,
  LogOutDeleteSection,
  NotificationsSection,
  SettingsContainer,
  ThisDeviceSection,
} from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = ['organization', 'thresholds', 'notifications', 'language', 'account'] as const
type Section = (typeof SECTIONS)[number]

interface FleetSettings {
  organizationName?: string
  timezone?: string
  dispatchHours?: string
  speedingThreshold?: number
  idleThreshold?: number
  fuelThreshold?: number
  detectHardBrake?: boolean
  detectHardAccel?: boolean
  notifySpeeding?: boolean
  notifyMaintenance?: boolean
  notifyGeofence?: boolean
  notifyWeekly?: boolean
}

// The platform user resource NEVER returns `oauthData` on reads, so the
// settings slice persists through the server-side `/settings` channel
// (fleet_settings table, merged server-side) — not through PATCH /users/:id.
interface SettingsPayload {
  fleetSettings?: Partial<FleetSettings> | null
}

const DEFAULTS: Required<FleetSettings> = {
  organizationName: 'Eastline Logistics, Inc.',
  timezone: 'America/New_York',
  dispatchHours: '6:00am – 8:00pm',
  speedingThreshold: 10,
  idleThreshold: 15,
  fuelThreshold: 15,
  detectHardBrake: true,
  detectHardAccel: true,
  notifySpeeding: true,
  notifyMaintenance: true,
  notifyGeofence: true,
  notifyWeekly: true,
}

function readSettings(
  fleetSettings: Partial<FleetSettings> | null | undefined,
): Required<FleetSettings> {
  if (!fleetSettings || typeof fleetSettings !== 'object') return { ...DEFAULTS }
  return { ...DEFAULTS, ...fleetSettings }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [section, setSection] = useState<Section>('organization')
  const [settings, setSettings] = useState<Required<FleetSettings>>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/settings')
      .then((res) => {
        if (cancelled) return
        const payload = unwrapSingle<SettingsPayload>(res)
        setSettings(readSettings(payload?.fleetSettings))
      })
      .catch(() =>
        setError(t('settings.loadError', {}, { defaultValue: 'Failed to load settings.' })),
      )
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await http.patch('/settings', { fleetSettings: settings })
      const payload = unwrapSingle<SettingsPayload>(res)
      setSettings(readSettings(payload?.fleetSettings))
      void track({ name: 'settings.updated', properties: { section: 'fleetSettings' } })
      setSavedAt(new Date().toISOString())
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.saveError', {}, { defaultValue: 'Failed to save settings.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  function update<K extends keyof Required<FleetSettings>>(
    key: K,
    value: Required<FleetSettings>[K],
  ) {
    setSettings((s) => ({ ...s, [key]: value }))
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('settings.eyebrow', {}, { defaultValue: 'Operations & dispatch' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
          {t(
            'settings.subheading',
            {},
            {
              defaultValue: 'Organization profile, alert thresholds, and notification preferences.',
            },
          )}
        </p>
      </header>
      <div className={cm.grid({ cols: 12, gap: 'lg' })}>
        <aside className={'col-span-12 md:col-span-3'}>
          <nav
            className={'space-y-1'}
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
        </aside>

        <main className={'col-span-12 md:col-span-9 space-y-4'}>
          {loading ? (
            <p className={cm.cn('text-on-surface-variant text-sm')}>
              {t('settings.loading', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : null}
          {section === 'organization' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('form.organization', {}, { defaultValue: 'Organization' })}
              </h2>
              <Field
                label={t('settings.organization.name', {}, { defaultValue: 'Organization name' })}
                value={settings.organizationName}
                onChange={(v) => update('organizationName', v)}
              />
              <Field
                label={t('form.timezone', {}, { defaultValue: 'Timezone' })}
                value={settings.timezone}
                onChange={(v) => update('timezone', v)}
              />
              <Field
                label={t(
                  'settings.organization.dispatchHours',
                  {},
                  { defaultValue: 'Dispatch hours' },
                )}
                value={settings.dispatchHours}
                onChange={(v) => update('dispatchHours', v)}
              />
            </section>
          )}

          {section === 'thresholds' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.thresholds.heading', {}, { defaultValue: 'Alert thresholds' })}
              </h2>
              <NumField
                label={t(
                  'settings.thresholds.speed',
                  {},
                  { defaultValue: 'Speeding threshold (mph over limit)' },
                )}
                value={settings.speedingThreshold}
                onChange={(v) => update('speedingThreshold', v)}
              />
              <NumField
                label={t(
                  'settings.thresholds.idle',
                  {},
                  { defaultValue: 'Idle threshold (minutes)' },
                )}
                value={settings.idleThreshold}
                onChange={(v) => update('idleThreshold', v)}
              />
              <NumField
                label={t(
                  'settings.thresholds.fuel',
                  {},
                  { defaultValue: 'Low fuel threshold (%)' },
                )}
                value={settings.fuelThreshold}
                onChange={(v) => update('fuelThreshold', v)}
              />
              <Toggle
                label={t(
                  'settings.thresholds.hardBrake',
                  {},
                  { defaultValue: 'Detect hard braking events' },
                )}
                checked={settings.detectHardBrake}
                onChange={(v) => update('detectHardBrake', v)}
              />
              <Toggle
                label={t(
                  'settings.thresholds.hardAccel',
                  {},
                  { defaultValue: 'Detect hard acceleration events' },
                )}
                checked={settings.detectHardAccel}
                onChange={(v) => update('detectHardAccel', v)}
              />
            </section>
          )}

          {section === 'notifications' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
              </h2>
              <Toggle
                label={t(
                  'settings.notifications.speeding',
                  {},
                  { defaultValue: 'Speeding alerts' },
                )}
                checked={settings.notifySpeeding}
                onChange={(v) => update('notifySpeeding', v)}
              />
              <Toggle
                label={t(
                  'settings.notifications.maintenance',
                  {},
                  { defaultValue: 'Maintenance reminders' },
                )}
                checked={settings.notifyMaintenance}
                onChange={(v) => update('notifyMaintenance', v)}
              />
              <Toggle
                label={t(
                  'settings.notifications.geofence',
                  {},
                  { defaultValue: 'Geofence breaches' },
                )}
                checked={settings.notifyGeofence}
                onChange={(v) => update('notifyGeofence', v)}
              />
              <Toggle
                label={t(
                  'settings.notifications.weekly',
                  {},
                  { defaultValue: 'Weekly performance digest' },
                )}
                checked={settings.notifyWeekly}
                onChange={(v) => update('notifyWeekly', v)}
              />
            </section>
          )}

          {section === 'language' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('footer.language', {}, { defaultValue: 'Language' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 2), 'text-on-surface-variant')}>
                {t(
                  'common.chooseTheLanguage',
                  {},
                  { defaultValue: 'Choose the language used throughout the app.' },
                )}
              </p>
              <LanguagePicker />
            </section>
          )}

          {section === 'account' && (
            <div className={cm.card()}>
              <SettingsContainer onClose={() => {}}>
                <AccountSection />
                <AuthSection />
                <NotificationsSection />
                <DevicesSection />
                <ThisDeviceSection />
                <LogOutDeleteSection />
              </SettingsContainer>
            </div>
          )}

          {section !== 'account' && (
            <div className={cm.flex({ align: 'center', gap: 'md' })}>
              <button
                type="button"
                onClick={save}
                disabled={saving || loading}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-md disabled:opacity-50',
                )}
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
              {savedAt ? (
                <span className={cm.cn(cm.textSize('xs'), 'text-success')}>
                  {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
                </span>
              ) : null}
              {error ? (
                <span className={cm.cn(cm.textSize('xs'), 'text-error')}>{error}</span>
              ) : null}
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
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type="text"
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

function NumField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
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
        onChange={(e) => onChange(e.target.checked)}
        className={cm.cn(cm.h(4), cm.w(4))}
      />
      <span className={cm.cn(cm.textSize('sm'))}>{label}</span>
    </label>
  )
}
