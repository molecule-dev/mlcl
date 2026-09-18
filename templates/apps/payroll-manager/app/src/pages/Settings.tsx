import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

interface CompanySettings {
  legal_name: string
  ein: string
  address: string
  fiscal_year: string
  cadence: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'
  cycle_end_day: string
  pay_date_offset: number
  holiday_behavior: string
}

const DEFAULTS: CompanySettings = {
  legal_name: '',
  ein: '',
  address: '',
  fiscal_year: 'January – December',
  cadence: 'biweekly',
  cycle_end_day: 'Friday',
  pay_date_offset: 3,
  holiday_behavior: 'Pay one business day early',
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [settings, setSettings] = useState<CompanySettings>(DEFAULTS)
  const [draft, setDraft] = useState<CompanySettings>(DEFAULTS)
  const [editing, setEditing] = useState<'profile' | 'schedule' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<CompanySettings>('/api/company-settings')
      .then((res) => {
        if (cancelled) return
        const next = (
          res?.data && typeof res.data === 'object' ? res.data : DEFAULTS
        ) as CompanySettings
        setSettings({ ...DEFAULTS, ...next })
        setDraft({ ...DEFAULTS, ...next })
      })
      .catch(() => {
        if (!cancelled) {
          setSettings(DEFAULTS)
          setDraft(DEFAULTS)
        }
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const startEdit = (section: 'profile' | 'schedule') => {
    setDraft(settings)
    setEditing(section)
    setError(null)
  }

  const cancelEdit = () => {
    setDraft(settings)
    setEditing(null)
    setError(null)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await http.put<CompanySettings>('/api/company-settings', draft)
      const next = (res?.data && typeof res.data === 'object' ? res.data : draft) as CompanySettings
      setSettings({ ...DEFAULTS, ...next })
      setDraft({ ...DEFAULTS, ...next })
      setEditing(null)
      setSavedAt(Date.now())
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('common.couldNotSaveChanges', {}, { defaultValue: 'Could not save changes.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  const showSaved = savedAt !== null && Date.now() - savedAt < 4_000

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('nav.workspace', {}, { defaultValue: 'Workspace' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'settings.subheading',
            {},
            { defaultValue: 'Company profile, pay schedule, and integrations.' },
          )}
        </p>
        {showSaved ? (
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-success font-bold')}>
            {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
          </p>
        ) : null}
        {error ? (
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-error font-bold')}>
            {error}
          </p>
        ) : null}
      </header>

      <SettingsCard
        icon="business"
        title={t('settings.companyProfile', {}, { defaultValue: 'Company profile' })}
        description={t(
          'settings.companyProfileDesc',
          {},
          { defaultValue: 'Legal name, EIN, primary address, fiscal year.' },
        )}
        onEdit={() => startEdit('profile')}
        editing={editing === 'profile'}
        onSave={save}
        onCancel={cancelEdit}
        saving={saving}
      >
        {editing === 'profile' ? (
          <>
            <FieldInput
              label={t('settings.companyName', {}, { defaultValue: 'Legal name' })}
              value={draft.legal_name}
              onChange={(v) => setDraft((d) => ({ ...d, legal_name: v }))}
            />
            <FieldInput
              label={t('settings.ein', {}, { defaultValue: 'EIN' })}
              value={draft.ein}
              onChange={(v) => setDraft((d) => ({ ...d, ein: v }))}
              mono
            />
            <FieldInput
              label={t('settings.address', {}, { defaultValue: 'Primary address' })}
              value={draft.address}
              onChange={(v) => setDraft((d) => ({ ...d, address: v }))}
            />
            <FieldInput
              label={t('settings.fiscalYear', {}, { defaultValue: 'Fiscal year' })}
              value={draft.fiscal_year}
              onChange={(v) => setDraft((d) => ({ ...d, fiscal_year: v }))}
            />
          </>
        ) : (
          <>
            <Field
              label={t('settings.companyName', {}, { defaultValue: 'Legal name' })}
              value={settings.legal_name || '\u2014'}
            />
            <Field
              label={t('settings.ein', {}, { defaultValue: 'EIN' })}
              value={settings.ein || '\u2014'}
              mono
            />
            <Field
              label={t('settings.address', {}, { defaultValue: 'Primary address' })}
              value={settings.address || '\u2014'}
            />
            <Field
              label={t('settings.fiscalYear', {}, { defaultValue: 'Fiscal year' })}
              value={settings.fiscal_year}
            />
          </>
        )}
      </SettingsCard>

      <SettingsCard
        icon="event_repeat"
        title={t('settings.paySchedule', {}, { defaultValue: 'Pay schedule' })}
        description={t(
          'settings.payScheduleDesc',
          {},
          { defaultValue: 'Cycle cadence, pay date offset, holiday handling.' },
        )}
        onEdit={() => startEdit('schedule')}
        editing={editing === 'schedule'}
        onSave={save}
        onCancel={cancelEdit}
        saving={saving}
      >
        {editing === 'schedule' ? (
          <>
            <FieldSelect
              label={t('settings.cadence', {}, { defaultValue: 'Cadence' })}
              value={draft.cadence}
              onChange={(v) =>
                setDraft((d) => ({ ...d, cadence: v as CompanySettings['cadence'] }))
              }
              options={[
                { value: 'weekly', label: t('settings.weekly', {}, { defaultValue: 'Weekly' }) },
                {
                  value: 'biweekly',
                  label: t('settings.biweekly', {}, { defaultValue: 'Biweekly' }),
                },
                {
                  value: 'semimonthly',
                  label: t('settings.semimonthly', {}, { defaultValue: 'Semi-monthly' }),
                },
                { value: 'monthly', label: t('status.monthly', {}, { defaultValue: 'Monthly' }) },
              ]}
            />
            <FieldInput
              label={t('settings.cycleEnd', {}, { defaultValue: 'Cycle end' })}
              value={draft.cycle_end_day}
              onChange={(v) => setDraft((d) => ({ ...d, cycle_end_day: v }))}
            />
            <FieldInput
              label={t('settings.payDate', {}, { defaultValue: 'Pay date offset (days)' })}
              type="number"
              value={String(draft.pay_date_offset)}
              onChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  pay_date_offset: Math.max(0, Math.min(7, Number(v) || 0)),
                }))
              }
            />
            <FieldInput
              label={t('settings.holidayBehavior', {}, { defaultValue: 'Holiday behavior' })}
              value={draft.holiday_behavior}
              onChange={(v) => setDraft((d) => ({ ...d, holiday_behavior: v }))}
            />
          </>
        ) : (
          <>
            <Field
              label={t('settings.cadence', {}, { defaultValue: 'Cadence' })}
              value={cadenceLabel(settings.cadence, t)}
            />
            <Field
              label={t('settings.cycleEnd', {}, { defaultValue: 'Cycle end' })}
              value={settings.cycle_end_day}
            />
            <Field
              label={t('settings.payDate', {}, { defaultValue: 'Pay date offset' })}
              value={`+${settings.pay_date_offset} ${t('settings.businessDays', {}, { defaultValue: 'business days' })}`}
            />
            <Field
              label={t('settings.holidayBehavior', {}, { defaultValue: 'Holiday behavior' })}
              value={settings.holiday_behavior}
            />
          </>
        )}
      </SettingsCard>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest shadow-sm space-y-4',
        )}
      >
        <header className={cm.flex({ align: 'start', gap: 'sm' })}>
          <span
            className={cm.cn(cm.sp('p', 2), cm.roundedFull, 'bg-primary/10 text-primary')}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>language</span>
          </span>
          <div>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('footer.language', {}, { defaultValue: 'Language' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'common.chooseTheLanguage',
                {},
                { defaultValue: 'Choose the language used throughout the app.' },
              )}
            </p>
          </div>
        </header>
        <LanguagePicker />
      </section>
      <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
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

function cadenceLabel(
  c: CompanySettings['cadence'],
  t: ReturnType<typeof useTranslation>['t'],
): string {
  switch (c) {
    case 'weekly':
      return t('settings.weekly', {}, { defaultValue: 'Weekly' })
    case 'semimonthly':
      return t('settings.semimonthly', {}, { defaultValue: 'Semi-monthly' })
    case 'monthly':
      return t('status.monthly', {}, { defaultValue: 'Monthly' })
    default:
      return t('settings.biweekly', {}, { defaultValue: 'Biweekly' })
  }
}

function SettingsCard({
  icon,
  title,
  description,
  children,
  onEdit,
  editing,
  onSave,
  onCancel,
  saving,
}: {
  icon: string
  title: string
  description: string
  children: React.ReactNode
  onEdit: () => void
  editing: boolean
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl bg-surface-container-lowest shadow-sm space-y-4',
      )}
    >
      <header className={cm.flex({ align: 'start', justify: 'between', gap: 'sm' })}>
        <div className={cm.flex({ align: 'start', gap: 'sm' })}>
          <span
            className={cm.cn(cm.sp('p', 2), cm.roundedFull, 'bg-primary/10 text-primary')}
            aria-hidden="true"
          >
            <span className={cm.cn(`material-symbols-outlined text-base`)}>{icon}</span>
          </span>
          <div>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{title}</h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{description}</p>
          </div>
        </div>
        {editing ? (
          <div className={cm.flex({ gap: 'xs' })}>
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'uppercase tracking-widest border border-outline-variant disabled:opacity-50',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'uppercase tracking-widest bg-primary text-on-primary hover:opacity-90 disabled:opacity-50',
              )}
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.save', {}, { defaultValue: 'Save' })}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'uppercase tracking-widest border border-outline-variant hover:bg-surface-container-low',
            )}
          >
            {t('common.edit', {}, { defaultValue: 'Edit' })}
          </button>
        )}
      </header>
      <div className={cm.stack(0)}>{children}</div>
    </section>
  )
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        cm.sp('py', 3),
        'border-b border-outline-variant/40 last:border-b-0',
      )}
    >
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{label}</p>
      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'text-on-surface',
          mono ? 'tabular-nums font-mono' : '',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function FieldInput({
  label,
  value,
  onChange,
  type = 'text',
  mono = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'number'
  mono?: boolean
}) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        cm.sp('py', 3),
        'border-b border-outline-variant/40 last:border-b-0',
      )}
    >
      <label className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.textSize('sm'),
          cm.sp('px', 3),
          cm.sp('py', 1),
          'rounded-md bg-surface-container-low border border-outline-variant focus:ring-2 focus:ring-primary/30 focus:outline-none min-w-[12rem] text-right',
          mono ? 'tabular-nums font-mono' : '',
        )}
      />
    </div>
  )
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        cm.sp('py', 3),
        'border-b border-outline-variant/40 last:border-b-0',
      )}
    >
      <label className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.textSize('sm'),
          cm.sp('px', 3),
          cm.sp('py', 1),
          'rounded-md bg-surface-container-low border border-outline-variant focus:ring-2 focus:ring-primary/30 focus:outline-none min-w-[12rem]',
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
