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
  organizationEin?: string
  timezone?: string
  officeHours?: string
  defaultFund?: string
  receiptFooterNote?: string
  receiptNumberPrefix?: string
  signatoryName?: string
  signatoryTitle?: string
  notifyNewGifts?: boolean
  notifyCampaignGoals?: boolean
  notifyLapsedDonors?: boolean
  notifyReceiptsIssued?: boolean
  notifyWeekly?: boolean
}

const DEFAULTS: Required<CompanySettings> = {
  organizationName: 'Harbor Community Foundation',
  organizationEin: '',
  timezone: 'America/New_York',
  officeHours: '9:00am – 5:00pm',
  defaultFund: 'general',
  receiptFooterNote: 'Thank you for your generous support.',
  receiptNumberPrefix: 'R',
  signatoryName: '',
  signatoryTitle: '',
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
                label={t('settings.organization.ein', {}, { defaultValue: 'Federal EIN / Tax ID' })}
                value={settings.organizationEin}
                onChange={(v) => update('organizationEin', v)}
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
              {/* Statutory identity + compliance health — the design's
                  501(c)(3) block, driven by the saved settings values. */}
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), cm.sp('pt', 2))}>
                {t(
                  'settings.compliance.statutoryHeading',
                  {},
                  { defaultValue: '501(c)(3) Statutory Identity' },
                )}
              </h3>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'settings.compliance.statutorySub',
                  {},
                  {
                    defaultValue:
                      'The legal registration details printed on every receipt and year-end statement.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.sp('p', 4),
                  'rounded-lg bg-surface-container-low flex items-start justify-between gap-3 flex-wrap',
                )}
              >
                <div className={cm.stack(1)}>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {settings.organizationName}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {settings.organizationEin
                      ? t(
                          'settings.compliance.ein',
                          { ein: settings.organizationEin },
                          { defaultValue: 'EIN {{ein}}' },
                        )
                      : t(
                          'settings.compliance.einMissing',
                          {},
                          { defaultValue: 'No EIN on file — add it above and save.' },
                        )}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'rounded-full',
                    settings.organizationEin
                      ? 'bg-success-container text-on-success-container'
                      : 'bg-warning-container text-on-warning-container',
                  )}
                >
                  {settings.organizationEin
                    ? t('settings.compliance.verified', {}, { defaultValue: 'On file' })
                    : t('settings.compliance.pending', {}, { defaultValue: 'Missing' })}
                </span>
              </div>
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                {t(
                  'settings.compliance.healthHeading',
                  {},
                  { defaultValue: 'IRS Compliance Health' },
                )}
              </h3>
              <ul className={cm.stack(2)}>
                {[
                  {
                    key: 'ein',
                    label: t(
                      'settings.compliance.checkEin',
                      {},
                      { defaultValue: 'Federal EIN recorded for statutory identity' },
                    ),
                    done: settings.organizationEin.trim().length > 0,
                  },
                  {
                    key: 'disclosure',
                    label: t(
                      'settings.compliance.checkDisclosure',
                      {},
                      {
                        defaultValue:
                          'Quid pro quo disclosure armed — receipts state whether goods or services were provided',
                      },
                    ),
                    done: true,
                  },
                  {
                    key: 'prefix',
                    label: t(
                      'settings.compliance.checkPrefix',
                      {},
                      {
                        defaultValue:
                          'Sequential receipt numbering active — issued receipts are immutable',
                      },
                    ),
                    done: settings.receiptNumberPrefix.trim().length > 0,
                  },
                  {
                    key: 'signatory',
                    label: t(
                      'settings.compliance.checkSignatory',
                      {},
                      { defaultValue: 'Authorized signatory named for receipt sign-off' },
                    ),
                    done: settings.signatoryName.trim().length > 0,
                  },
                  {
                    key: 'footer',
                    label: t(
                      'settings.compliance.checkFooter',
                      {},
                      { defaultValue: 'Receipt footer note personalized' },
                    ),
                    done: settings.receiptFooterNote.trim().length > 0,
                  },
                ].map((check) => (
                  <li
                    key={check.key}
                    className={cm.cn(cm.flex({ align: 'start', gap: 2 }), cm.textSize('sm'))}
                  >
                    <span
                      className={
                        check.done
                          ? 'material-symbols-outlined text-success text-base'
                          : 'material-symbols-outlined text-on-surface-variant text-base'
                      }
                      aria-hidden="true"
                    >
                      {check.done ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span className="text-on-surface-variant">{check.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {section === 'giving' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t(
                  'settings.giving.heading',
                  {},
                  {
                    defaultValue: 'Automated Receipting & Substantiation Rules',
                  },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'settings.giving.subheading',
                  {},
                  {
                    defaultValue:
                      'Codify the acknowledgment logic every issued receipt follows — cadence, numbering, and the signatory who authorizes it.',
                  },
                )}
              </p>
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
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), cm.sp('pt', 2))}>
                {t(
                  'settings.giving.signatureHeading',
                  {},
                  { defaultValue: 'Digital Authorized Signature & Letterhead' },
                )}
              </h3>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'settings.giving.signatureSub',
                  {},
                  {
                    defaultValue:
                      'The officer whose name stamps formal written substantiations, printed with your footer note as the letterhead line.',
                  },
                )}
              </p>
              <Field
                label={t(
                  'settings.giving.signatoryName',
                  {},
                  { defaultValue: 'Authorized signatory name' },
                )}
                value={settings.signatoryName}
                onChange={(v) => update('signatoryName', v)}
              />
              <Field
                label={t('settings.giving.signatoryTitle', {}, { defaultValue: 'Signatory title' })}
                value={settings.signatoryTitle}
                onChange={(v) => update('signatoryTitle', v)}
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
