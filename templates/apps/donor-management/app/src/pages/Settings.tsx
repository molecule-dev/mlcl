import { useEffect, useState } from 'react'

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

const SECTIONS = ['organization', 'giving', 'notifications', 'language', 'account'] as const
type Section = (typeof SECTIONS)[number]

interface CompanySettings {
  organizationName?: string
  timezone?: string
  officeHours?: string
  defaultFund?: string
  receiptFooterNote?: string
  receiptNumberPrefix?: string
  notifyNewGifts?: boolean
  notifyCampaignGoals?: boolean
  notifyLapsedDonors?: boolean
  notifyReceiptsIssued?: boolean
  notifyWeekly?: boolean
}

const DEFAULTS: Required<CompanySettings> = {
  organizationName: 'Harbor Community Foundation',
  timezone: 'America/New_York',
  officeHours: '9:00am – 5:00pm',
  defaultFund: 'general',
  receiptFooterNote: 'Thank you for your generous support.',
  receiptNumberPrefix: 'R',
  notifyNewGifts: true,
  notifyCampaignGoals: true,
  notifyLapsedDonors: true,
  notifyReceiptsIssued: true,
  notifyWeekly: true,
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [section, setSection] = useState<Section>('organization')
  const [settings, setSettings] = useState<Required<CompanySettings>>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    // Server-side settings channel: the platform /users/me read NEVER
    // returns oauthData, so preferences stored through the user resource
    // silently reset to defaults on reload. GET/PATCH /api/settings
    // read/merge the stored slice server-side instead.
    http
      .get('/settings')
      .then((res) => {
        if (cancelled) return
        const data = unwrapSingle<{ settings?: Partial<CompanySettings> }>(res)
        setSettings({ ...DEFAULTS, ...(data?.settings ?? {}) })
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
      const res = await http.patch('/settings', settings)
      const data = unwrapSingle<{ settings?: Partial<CompanySettings> }>(res)
      setSettings({ ...DEFAULTS, ...(data?.settings ?? settings) })
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

  function update<K extends keyof Required<CompanySettings>>(
    key: K,
    value: Required<CompanySettings>[K],
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
          {t('settings.eyebrow', {}, { defaultValue: 'Organization & giving' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
          {t(
            'settings.subheading',
            {},
            {
              defaultValue: 'Organization profile, giving defaults, and notification preferences.',
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
                label={t('settings.organization.officeHours', {}, { defaultValue: 'Office hours' })}
                value={settings.officeHours}
                onChange={(v) => update('officeHours', v)}
              />
            </section>
          )}

          {section === 'giving' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.giving.heading', {}, { defaultValue: 'Giving & receipt defaults' })}
              </h2>
              <Field
                label={t('settings.giving.defaultFund', {}, { defaultValue: 'Default fund' })}
                value={settings.defaultFund}
                onChange={(v) => update('defaultFund', v)}
              />
              <Field
                label={t(
                  'settings.giving.receiptNumberPrefix',
                  {},
                  { defaultValue: 'Receipt number prefix' },
                )}
                value={settings.receiptNumberPrefix}
                onChange={(v) => update('receiptNumberPrefix', v)}
              />
              <Field
                label={t(
                  'settings.giving.receiptFooterNote',
                  {},
                  { defaultValue: 'Receipt footer note' },
                )}
                value={settings.receiptFooterNote}
                onChange={(v) => update('receiptFooterNote', v)}
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
                  'settings.notifications.newGifts',
                  {},
                  { defaultValue: 'New gift recorded' },
                )}
                checked={settings.notifyNewGifts}
                onChange={(v) => update('notifyNewGifts', v)}
              />
              <Toggle
                label={t(
                  'settings.notifications.campaignGoals',
                  {},
                  { defaultValue: 'Campaign reaches its goal' },
                )}
                checked={settings.notifyCampaignGoals}
                onChange={(v) => update('notifyCampaignGoals', v)}
              />
              <Toggle
                label={t(
                  'settings.notifications.lapsedDonors',
                  {},
                  { defaultValue: 'Lapsed donor reminders' },
                )}
                checked={settings.notifyLapsedDonors}
                onChange={(v) => update('notifyLapsedDonors', v)}
              />
              <Toggle
                label={t(
                  'settings.notifications.receiptsIssued',
                  {},
                  { defaultValue: 'Tax receipt issued' },
                )}
                checked={settings.notifyReceiptsIssued}
                onChange={(v) => update('notifyReceiptsIssued', v)}
              />
              <Toggle
                label={t(
                  'settings.notifications.weekly',
                  {},
                  { defaultValue: 'Weekly giving digest' },
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
