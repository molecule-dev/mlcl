import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { AccountSettings } from '../components/AccountSettings.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface CompanyProfile {
  legal_name: string
  billing_email: string
  tax_id: string
  address: string
  default_tax_rate_pct: number
  filing_method: string
  fiscal_year_start: string
  currency?: string
  payment_terms?: string
  invoice_late_fee_enabled?: boolean
  invoice_recurring_enabled?: boolean
}

interface Integration {
  id: string
  name: string
  status: string
  last_synced_at?: string | null
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
}

const EMPTY_COMPANY: CompanyProfile = {
  legal_name: '',
  billing_email: '',
  tax_id: '',
  address: '',
  default_tax_rate_pct: 0,
  filing_method: 'cash',
  fiscal_year_start: 'January',
  currency: 'USD',
  payment_terms: 'net_30',
  invoice_late_fee_enabled: false,
  invoice_recurring_enabled: false,
}

const CURRENCIES = ['USD', 'EUR', 'GBP'] as const

const PAYMENT_TERMS = [
  { value: 'net_7', label: 'Net 7' },
  { value: 'net_14', label: 'Net 14' },
  { value: 'net_30', label: 'Net 30' },
] as const

const FISCAL_STARTS = ['January', 'April', 'July', 'October'] as const

function fmtSyncedAt(iso: string | null | undefined, never: string): string {
  if (!iso) return never
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  // We track only the draft + the persisted snapshot via setCompany. The
  // form binds to companyDraft and `company` is the saved baseline used for
  // the dirty-check + reset; the value itself is never rendered, so we drop
  // the `company` getter and keep just the setter.
  const [, setCompany] = useState<CompanyProfile>(EMPTY_COMPANY)
  const [companyDraft, setCompanyDraft] = useState<CompanyProfile>(EMPTY_COMPANY)
  const [companySaved, setCompanySaved] = useState<boolean>(false)
  const [companySaving, setCompanySaving] = useState<boolean>(false)

  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [integrationsLoading, setIntegrationsLoading] = useState<boolean>(true)
  const [busyIntegrationId, setBusyIntegrationId] = useState<string | null>(null)

  const [team, setTeam] = useState<TeamMember[]>([])
  const [teamLoading, setTeamLoading] = useState<boolean>(true)
  const [showInvite, setShowInvite] = useState<boolean>(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [inviteForm, setInviteForm] = useState<{ name: string; email: string; role: string }>({
    name: '',
    email: '',
    role: 'member',
  })
  const [inviteSubmitting, setInviteSubmitting] = useState<boolean>(false)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/settings/company')
      .then((res) => {
        if (cancelled) return
        const profile = unwrapSingle<CompanyProfile>(res) ?? EMPTY_COMPANY
        setCompany(profile)
        setCompanyDraft(profile)
      })
      .catch(() => {})
    http
      .get('/api/settings/integrations')
      .then((res) => {
        if (cancelled) return
        setIntegrations(unwrapList<Integration>(res))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIntegrationsLoading(false)
      })
    http
      .get('/api/settings/team')
      .then((res) => {
        if (cancelled) return
        setTeam(unwrapList<TeamMember>(res))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setTeamLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault()
    setCompanySaving(true)
    await new Promise((resolve) => setTimeout(resolve, 80))
    try {
      await http.put('/api/settings/company', companyDraft)
      setCompany(companyDraft)
      setCompanySaved(true)
      setTimeout(() => setCompanySaved(false), 2000)
    } catch (_error) {
      // ignore — save failure is silent; user can retry
    } finally {
      setCompanySaving(false)
    }
  }

  async function toggleIntegration(integration: Integration) {
    setBusyIntegrationId(integration.id)
    const nextStatus = integration.status === 'connected' ? 'not_connected' : 'connected'
    try {
      const res = await http.put(`/api/settings/integrations/${integration.id}`, {
        status: nextStatus,
        last_synced_at: new Date().toISOString(),
      })
      const updated = unwrapSingle<Integration>(res) ?? { ...integration, status: nextStatus }
      setIntegrations((prev) =>
        prev.map((i) => (i.id === integration.id ? { ...i, ...updated } : i)),
      )
    } catch (_error) {
      // ignore — toggle is optimistic; failure is silent
    } finally {
      setBusyIntegrationId(null)
    }
  }

  async function addIntegration() {
    setBusyIntegrationId('__new__')
    try {
      const res = await http.post('/api/settings/integrations', {
        name: t('settings.integrations.defaultName', {}, { defaultValue: 'New integration' }),
        status: 'not_connected',
      })
      const created = unwrapSingle<Integration>(res)
      if (created) setIntegrations((prev) => [...prev, created])
    } catch (_error) {
      // ignore — add integration failure is silent; user can retry
    } finally {
      setBusyIntegrationId(null)
    }
  }

  async function removeMember(id: string) {
    setTeam((prev) => prev.filter((m) => m.id !== id))
    try {
      await http.delete(`/api/settings/team/${id}`)
    } catch (_error) {
      // ignore — removal is optimistic; UI already reflects the change
    }
  }

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) return
    setInviteSubmitting(true)
    try {
      const res = await http.post('/api/settings/team', inviteForm)
      const created = unwrapSingle<TeamMember>(res)
      if (created) setTeam((prev) => [...prev, created])
      setInviteForm({ name: '', email: '', role: 'member' })
      setShowInvite(false)
    } catch (_error) {
      // ignore — invite failure is silent; user can retry
    } finally {
      setInviteSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8')}>
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'settings.subheading',
            {},
            {
              defaultValue: 'Manage your company profile, tax preferences, integrations, and team.',
            },
          )}
        </p>
      </header>

      <AccountSettings />

      <form onSubmit={saveCompany} className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-6')}>
        <div>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('settings.company.heading', {}, { defaultValue: 'Company & tax' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'settings.company.subheading',
              {},
              {
                defaultValue: 'Manage your business identity, contact details, and localizations.',
              },
            )}
          </p>
        </div>

        {/* Design section 1 — Business Identity */}
        <div className={cm.cn('space-y-4')}>
          <h3 className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.fontWeight('semibold'))}>
            <GlyphTile icon="domain" />{' '}
            <span>
              {t('settings.company.identityHeading', {}, { defaultValue: 'Business identity' })}
            </span>
          </h3>
          <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
            <Field
              label={t('settings.company.name', {}, { defaultValue: 'Legal name' })}
              value={companyDraft.legal_name}
              onChange={(v) => setCompanyDraft((p) => ({ ...p, legal_name: v }))}
            />
            <Field
              label={t('settings.company.taxId', {}, { defaultValue: 'Tax ID / EIN' })}
              value={companyDraft.tax_id}
              onChange={(v) => setCompanyDraft((p) => ({ ...p, tax_id: v }))}
            />
          </div>
        </div>

        {/* Design section 2 — Address & Contact */}
        <div className={cm.cn('space-y-4')}>
          <h3 className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.fontWeight('semibold'))}>
            <GlyphTile icon="location_on" />{' '}
            <span>
              {t('settings.company.addressHeading', {}, { defaultValue: 'Address & contact' })}
            </span>
          </h3>
          <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
            <Field
              label={t('form.address', {}, { defaultValue: 'Address' })}
              value={companyDraft.address}
              onChange={(v) => setCompanyDraft((p) => ({ ...p, address: v }))}
            />
            <Field
              label={t('settings.company.email', {}, { defaultValue: 'Billing email' })}
              type="email"
              value={companyDraft.billing_email}
              onChange={(v) => setCompanyDraft((p) => ({ ...p, billing_email: v }))}
            />
          </div>
        </div>

        {/* Design section 3 — Currency & Locale */}
        <div className={cm.cn('space-y-4')}>
          <h3 className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.fontWeight('semibold'))}>
            <GlyphTile icon="language" />{' '}
            <span>
              {t('settings.company.localeHeading', {}, { defaultValue: 'Currency & locale' })}
            </span>
          </h3>
          <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
            <FieldSelect
              label={t('settings.company.currency', {}, { defaultValue: 'Default currency' })}
              value={companyDraft.currency ?? 'USD'}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              onChange={(v) => setCompanyDraft((p) => ({ ...p, currency: v }))}
            />
            <FieldSelect
              label={t('settings.tax.fiscalYearStart', {}, { defaultValue: 'Fiscal year starts' })}
              value={companyDraft.fiscal_year_start}
              options={FISCAL_STARTS.map((m) => ({ value: m, label: m }))}
              onChange={(v) => setCompanyDraft((p) => ({ ...p, fiscal_year_start: v }))}
            />
          </div>
        </div>

        {/* Design section 4 — Invoice Defaults */}
        <div className={cm.cn('space-y-4')}>
          <h3 className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.fontWeight('semibold'))}>
            <GlyphTile icon="description" />{' '}
            <span>
              {t('settings.company.defaultsHeading', {}, { defaultValue: 'Invoice defaults' })}
            </span>
          </h3>
          <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
            <Field
              label={t('settings.tax.defaultRate', {}, { defaultValue: 'Default tax rate (%)' })}
              type="number"
              value={String(companyDraft.default_tax_rate_pct)}
              onChange={(v) =>
                setCompanyDraft((p) => ({ ...p, default_tax_rate_pct: Number(v) || 0 }))
              }
            />
            <FieldSelect
              label={t('settings.tax.method', {}, { defaultValue: 'Filing method' })}
              value={companyDraft.filing_method}
              options={[
                { value: 'cash', label: 'Cash basis' },
                { value: 'accrual', label: 'Accrual basis' },
              ]}
              onChange={(v) => setCompanyDraft((p) => ({ ...p, filing_method: v }))}
            />
            <FieldSelect
              label={t(
                'settings.company.paymentTerms',
                {},
                { defaultValue: 'Default payment terms' },
              )}
              value={companyDraft.payment_terms ?? 'net_30'}
              options={PAYMENT_TERMS.map((pt) => ({ value: pt.value, label: pt.label }))}
              onChange={(v) => setCompanyDraft((p) => ({ ...p, payment_terms: v }))}
            />
            <div className={cm.cn('space-y-2', cm.sp('pt', 6))}>
              <FieldCheckbox
                label={t('settings.company.lateFee', {}, { defaultValue: 'Apply late fee' })}
                checked={companyDraft.invoice_late_fee_enabled ?? false}
                onChange={(v) => setCompanyDraft((p) => ({ ...p, invoice_late_fee_enabled: v }))}
              />
              <FieldCheckbox
                label={t('settings.company.recurring', {}, { defaultValue: 'Recurring invoice' })}
                checked={companyDraft.invoice_recurring_enabled ?? false}
                onChange={(v) => setCompanyDraft((p) => ({ ...p, invoice_recurring_enabled: v }))}
              />
            </div>
          </div>
        </div>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', justify: 'between' }))}>
          {companySaved ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-success')}>
              {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
            </p>
          ) : (
            <span aria-hidden="true" />
          )}
          <button
            type="submit"
            disabled={companySaving}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md disabled:opacity-50',
            )}
          >
            {companySaving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : // Not the shared `common.saveChanges`: AccountSettings renders that
                // same label on this page, so two buttons announced identically as
                // "Save changes" left a screen-reader user no way to tell which
                // form each one submits.
                t('settings.company.saveButton', {}, { defaultValue: 'Save company profile' })}
          </button>
        </div>
      </form>

      <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
          </h2>
          <button
            type="button"
            onClick={addIntegration}
            disabled={busyIntegrationId !== null}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'border border-outline rounded-md hover:bg-surface-container disabled:opacity-50',
            )}
          >
            {t('settings.integrations.addCta', {}, { defaultValue: 'Add integration' })}
          </button>
        </div>
        {integrationsLoading ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : integrations.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t(
              'settings.integrations.empty',
              {},
              { defaultValue: 'No integrations configured yet.' },
            )}
          </p>
        ) : (
          <ul className={cm.cn('space-y-2')}>
            {integrations.map((i) => (
              <li
                key={i.id}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('py', 2),
                  'border-b border-outline-variant last:border-b-0',
                )}
              >
                <div>
                  <p className={cm.fontWeight('medium')}>{i.name}</p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {i.status === 'connected'
                      ? t(
                          'settings.integrations.connectedAt',
                          {
                            when: fmtSyncedAt(
                              i.last_synced_at,
                              t('settings.integrations.never', {}, { defaultValue: 'never' }),
                            ),
                          },
                          { defaultValue: 'Connected · synced {{when}}' },
                        )
                      : t(
                          'settings.integrations.notConnected',
                          {},
                          { defaultValue: 'Not connected' },
                        )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleIntegration(i)}
                  disabled={busyIntegrationId === i.id}
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.textPrimary,
                    'hover:underline disabled:opacity-50',
                  )}
                >
                  {i.status === 'connected'
                    ? t('common.disconnect', {}, { defaultValue: 'Disconnect' })
                    : t('common.connect', {}, { defaultValue: 'Connect' })}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('nav.team', {}, { defaultValue: 'Team' })}
          </h2>
          <button
            type="button"
            onClick={() => setShowInvite((prev) => !prev)}
            aria-expanded={showInvite}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'border border-outline rounded-md hover:bg-surface-container',
            )}
          >
            {showInvite
              ? t('common.cancel', {}, { defaultValue: 'Cancel' })
              : t('settings.team.inviteCta', {}, { defaultValue: 'Invite teammate' })}
          </button>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.team.body',
            { count: team.length },
            { defaultValue: '{{count}} team members.' },
          )}
        </p>
        {showInvite ? (
          <form
            onSubmit={inviteMember}
            className={cm.cn(cm.sp('p', 4), 'border border-outline-variant rounded-md space-y-2')}
          >
            <Field
              label={t('form.name', {}, { defaultValue: 'Name' })}
              value={inviteForm.name}
              onChange={(v) => setInviteForm((p) => ({ ...p, name: v }))}
            />
            <Field
              // Its own key, and a distinct label: AccountSettings already labels
              // the signed-in user's address "Email" on this page. Borrowing the
              // forgot-password key also made the invite form's meaning depend on
              // an unrelated screen's copy.
              label={t('settings.team.emailLabel', {}, { defaultValue: 'Teammate email' })}
              type="email"
              value={inviteForm.email}
              onChange={(v) => setInviteForm((p) => ({ ...p, email: v }))}
            />
            <Field
              label={t('form.role', {}, { defaultValue: 'Role' })}
              value={inviteForm.role}
              onChange={(v) => setInviteForm((p) => ({ ...p, role: v }))}
            />
            <div className={cm.cn(cm.flex({ justify: 'end' }))}>
              <button
                type="submit"
                disabled={inviteSubmitting}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-md disabled:opacity-50',
                )}
              >
                {inviteSubmitting
                  ? t('settings.team.invitingCta', {}, { defaultValue: 'Inviting…' })
                  : t('nav.invite', {}, { defaultValue: 'Send invite' })}
              </button>
            </div>
          </form>
        ) : null}
        {teamLoading ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : team.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('settings.team.empty', {}, { defaultValue: 'No teammates yet.' })}
          </p>
        ) : (
          <ul className={cm.cn('space-y-2')}>
            {team.map((m) => (
              <li
                key={m.id}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('py', 2),
                  'border-b border-outline-variant last:border-b-0',
                )}
              >
                <div>
                  <p className={cm.fontWeight('medium')}>{m.name}</p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {m.email} · {m.role}
                  </p>
                </div>
                {/* Destructive: two-step inline confirm — first click arms,
                    second click (or blur) commits. No accidental removals. */}
                {confirmRemoveId === m.id ? (
                  <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmRemoveId(null)
                        removeMember(m.id)
                      }}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'min-h-[36px] rounded-md bg-error text-on-error',
                      )}
                    >
                      {t('settings.team.confirmRemove', {}, { defaultValue: 'Confirm' })}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveId(null)}
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-on-surface-variant hover:underline',
                      )}
                    >
                      {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmRemoveId(m.id)}
                    className={cm.cn(cm.textSize('sm'), 'text-error hover:underline')}
                  >
                    {t('common.remove', {}, { defaultValue: 'Remove' })}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

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

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}

function Field({ label, value, onChange, type = 'text' }: FieldProps) {
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
        step={type === 'number' ? 'any' : undefined}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}

interface FieldSelectProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}

function FieldSelect({ label, value, options, onChange }: FieldSelectProps) {
  const cm = getClassMap()
  // Keep the persisted value selectable even when it isn't one of the offered
  // options (e.g. a fiscal-year start saved before the select existed).
  const known = options.some((o) => o.value === value)
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md bg-surface',
        )}
      >
        {!known && value ? <option value={value}>{value}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

interface FieldCheckboxProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}

function FieldCheckbox({ label, checked, onChange }: FieldCheckboxProps) {
  const cm = getClassMap()
  return (
    <label className={cm.flex({ align: 'center', gap: 'sm' })}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={cm.cn('h-4 w-4')}
      />
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{label}</span>
    </label>
  )
}

/** Glyph tile used by the design's section headings (icon chip + label). */
function GlyphTile({ icon }: { icon: string }) {
  const cm = getClassMap()
  return (
    <span
      className={cm.cn(
        cm.sp('p', 1),
        'rounded-md bg-surface-container flex items-center justify-center',
      )}
      aria-hidden="true"
    >
      <span className={cm.cn('material-symbols-outlined text-base text-on-surface-variant')}>
        {icon}
      </span>
    </span>
  )
}
