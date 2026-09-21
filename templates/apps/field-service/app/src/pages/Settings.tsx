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

const SECTIONS = ['organization', 'scheduling', 'notifications', 'language', 'account'] as const
type Section = (typeof SECTIONS)[number]

interface CompanySettings {
  organizationName?: string
  timezone?: string
  officeHours?: string
  quoteValidDays?: number
  reminderLeadHours?: number
  invoiceDueDays?: number
  morningTechEmails?: boolean
  requireChecklistDone?: boolean
  notifyUnassignedJobs?: boolean
  notifyQuoteActivity?: boolean
  notifyJobCompletions?: boolean
  notifyInvoicePayments?: boolean
  notifyWeekly?: boolean
}

interface UserMe {
  id?: string
  props?: { id?: string }
}

const DEFAULTS: Required<CompanySettings> = {
  organizationName: 'Ridgeline Services, Inc.',
  timezone: 'America/New_York',
  officeHours: '7:00am – 6:00pm',
  quoteValidDays: 14,
  reminderLeadHours: 24,
  invoiceDueDays: 15,
  morningTechEmails: true,
  requireChecklistDone: true,
  notifyUnassignedJobs: true,
  notifyQuoteActivity: true,
  notifyJobCompletions: true,
  notifyInvoicePayments: true,
  notifyWeekly: true,
}

function readSettings(
  company: Partial<CompanySettings> | null | undefined,
): Required<CompanySettings> {
  if (!company || typeof company !== 'object') return { ...DEFAULTS }
  return { ...DEFAULTS, ...company }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [section, setSection] = useState<Section>('organization')
  const [userId, setUserId] = useState<string | null>(null)
  const [settings, setSettings] = useState<Required<CompanySettings>>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    // The user id (for the PATCH target) comes from /users/me; the company
    // settings come from the app's own /api/settings route — the shared user
    // resource strips oauthData from every client-facing read, so /users/me
    // can never return the persisted companySettings back.
    Promise.all([
      http.get('/users/me').then((res) => unwrapSingle<UserMe>(res)),
      http
        .get('/api/settings')
        .then((res) => unwrapSingle<Partial<CompanySettings>>(res) ?? {})
        .catch(() => ({}) as Partial<CompanySettings>),
    ])
      .then(([me, company]) => {
        if (cancelled) return
        const id = me?.props?.id ?? me?.id ?? null
        setUserId(id)
        setSettings(readSettings(company))
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
    if (!userId) return
    setSaving(true)
    setError(null)
    try {
      // PATCH /api/settings merges the companySettings slice into the user's
      // oauthData server-side — a direct PATCH /api/users/:id would have to
      // send the whole oauthData bag, which the client can never read back
      // (the shared resource strips it) and would clobber sibling keys.
      await http.patch('/api/settings', settings)
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
          {t('settings.eyebrow', {}, { defaultValue: 'Company & scheduling' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
          {t(
            'settings.subheading',
            {},
            {
              defaultValue: 'Company profile, scheduling defaults, and notification preferences.',
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

          {section === 'scheduling' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.scheduling.heading', {}, { defaultValue: 'Scheduling defaults' })}
              </h2>
              <NumField
                label={t(
                  'settings.scheduling.quoteValidDays',
                  {},
                  { defaultValue: 'Quote validity (days)' },
                )}
                value={settings.quoteValidDays}
                onChange={(v) => update('quoteValidDays', v)}
              />
              <NumField
                label={t(
                  'settings.scheduling.reminderLeadHours',
                  {},
                  { defaultValue: 'Job reminder lead time (hours)' },
                )}
                value={settings.reminderLeadHours}
                onChange={(v) => update('reminderLeadHours', v)}
              />
              <NumField
                label={t(
                  'settings.scheduling.invoiceDueDays',
                  {},
                  { defaultValue: 'Invoice due (days after sending)' },
                )}
                value={settings.invoiceDueDays}
                onChange={(v) => update('invoiceDueDays', v)}
              />
              <Toggle
                label={t(
                  'settings.scheduling.morningTechEmails',
                  {},
                  { defaultValue: 'Email each technician their morning schedule' },
                )}
                checked={settings.morningTechEmails}
                onChange={(v) => update('morningTechEmails', v)}
              />
              <Toggle
                label={t(
                  'settings.scheduling.requireChecklistDone',
                  {},
                  { defaultValue: 'Warn when completing a job with open checklist items' },
                )}
                checked={settings.requireChecklistDone}
                onChange={(v) => update('requireChecklistDone', v)}
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
                  'settings.notifications.unassignedJobs',
                  {},
                  { defaultValue: 'Unassigned job alerts' },
                )}
                checked={settings.notifyUnassignedJobs}
                onChange={(v) => update('notifyUnassignedJobs', v)}
              />
              <Toggle
                label={t(
                  'settings.notifications.quoteActivity',
                  {},
                  { defaultValue: 'Quote accepted or declined' },
                )}
                checked={settings.notifyQuoteActivity}
                onChange={(v) => update('notifyQuoteActivity', v)}
              />
              <Toggle
                label={t(
                  'settings.notifications.jobCompletions',
                  {},
                  { defaultValue: 'Job completions' },
                )}
                checked={settings.notifyJobCompletions}
                onChange={(v) => update('notifyJobCompletions', v)}
              />
              <Toggle
                label={t(
                  'settings.notifications.invoicePayments',
                  {},
                  { defaultValue: 'Invoice payments' },
                )}
                checked={settings.notifyInvoicePayments}
                onChange={(v) => update('notifyInvoicePayments', v)}
              />
              <Toggle
                label={t(
                  'settings.notifications.weekly',
                  {},
                  { defaultValue: 'Weekly revenue digest' },
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
                disabled={saving || loading || !userId}
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
