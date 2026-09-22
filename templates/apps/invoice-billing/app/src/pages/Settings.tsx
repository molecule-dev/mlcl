import { useCallback, useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { AuthSection } from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { useIsMobile } from '../components/useIsMobile.js'

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: 'person' },
  { id: 'security', label: 'Security', icon: 'lock' },
  { id: 'business', label: 'Business info', icon: 'storefront' },
  { id: 'branding', label: 'Branding', icon: 'palette' },
  { id: 'payment-methods', label: 'Payment methods', icon: 'credit_card' },
  { id: 'tax', label: 'Tax rates', icon: 'percent' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  { id: 'language', label: 'Language', icon: 'language' },
  { id: 'billing', label: 'Subscription', icon: 'workspace_premium' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

interface ProfileData {
  id?: string
  email?: string
  name?: string
  username?: string
  planKey?: string
  business?: {
    name?: string
    address?: string
    taxId?: string
    billingEmail?: string
    phone?: string
  }
  branding?: {
    primaryColor?: string
    accentColor?: string
    tagline?: string
    logoText?: string
  }
  preferences?: {
    timezone?: string
    currency?: string
    invoicePrefix?: string
    defaultDueDays?: number
  }
  notifications?: {
    emailOnPayment?: boolean
    emailOnView?: boolean
    emailOnOverdue?: boolean
    weeklyDigest?: boolean
  }
  paymentMethods?: {
    stripe?: boolean
    bank?: boolean
    paypal?: boolean
    manual?: boolean
  }
}

interface TaxRate {
  id: string
  name: string
  rate_pct: number | string
  region?: string | null
}

interface BillingStatus {
  planKey: string
  category?: string | null
  name?: string | null
  isFree?: boolean
  cancelAtPeriodEnd?: boolean
}

interface BillingTierPrice {
  period: 'month' | 'year'
  price: string
  stripePriceId: string | null
}

interface BillingTier {
  key: string
  name: string
  prices: BillingTierPrice[]
}

export function Settings() {
  const cm = getClassMap()
  const isMobile = useIsMobile()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [active, setActive] = useState<SectionId>('profile')
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [profileDraft, setProfileDraft] = useState<ProfileData | null>(null)
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [tiers, setTiers] = useState<BillingTier[]>([])
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const reloadProfile = useCallback(async () => {
    try {
      const r = await http.get<ProfileData>('/api/profile/me')
      setProfile(r.data)
      setProfileDraft(r.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load profile')
    }
  }, [http])

  const reloadTaxRates = useCallback(async () => {
    try {
      const r = await http.get<TaxRate[]>('/api/tax-rates')
      setTaxRates(Array.isArray(r.data) ? r.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load tax rates')
    }
  }, [http])

  const reloadBilling = useCallback(async () => {
    try {
      const [s, ts] = await Promise.all([
        http
          .get<BillingStatus>('/api/billing/status')
          .catch(() => ({ data: { planKey: 'free' } as BillingStatus })),
        http
          .get<{ data: BillingTier[] }>('/api/billing/tiers')
          .catch(() => ({ data: { data: [] as BillingTier[] } })),
      ])
      setBilling(s.data)
      const tierList = Array.isArray(ts.data?.data) ? ts.data.data : []
      setTiers(tierList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load billing')
    }
  }, [http])

  useEffect(() => {
    void reloadProfile()
    void reloadTaxRates()
    void reloadBilling()
  }, [reloadProfile, reloadTaxRates, reloadBilling])

  const updateDraft = (updater: (prev: ProfileData) => ProfileData) => {
    setProfileDraft((prev) => updater(prev ?? {}))
  }

  const saveProfile = async () => {
    if (!profileDraft) return
    setSaving(true)
    setError(null)
    setFeedback(null)
    try {
      const r = await http.patch<ProfileData>('/api/profile/me', profileDraft)
      setProfile(r.data)
      setProfileDraft(r.data)
      setFeedback(t('common.settingsSavedPeriod', {}, { defaultValue: 'Settings saved.' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const cancelEdits = () => {
    setProfileDraft(profile)
    setError(null)
    setFeedback(null)
  }

  const upgrade = async (priceId: string) => {
    setSaving(true)
    setError(null)
    try {
      const r = await http.post<{ checkoutUrl?: string; updated?: boolean }>(
        '/api/billing/checkout',
        { priceId },
      )
      if (r.data?.checkoutUrl) {
        window.location.assign(r.data.checkoutUrl)
      } else if (r.data?.updated) {
        setFeedback(t('nav.subscriptionUpdated', {}, { defaultValue: 'Subscription updated.' }))
        await reloadBilling()
      } else {
        setError(
          t(
            'settings.billing.checkoutMissing',
            {},
            { defaultValue: 'Stripe Checkout URL missing.' },
          ),
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upgrade failed')
    } finally {
      setSaving(false)
    }
  }

  const cancelSubscription = async () => {
    setSaving(true)
    try {
      await http.post('/api/billing/cancel', {})
      setFeedback(t('nav.subscriptionCancelled', {}, { defaultValue: 'Subscription cancelled.' }))
      await reloadBilling()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div data-mol-id="page-settings" className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <div>
        <span
          style={{
            fontSize: '11px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-primary-dark)',
            fontWeight: 700,
          }}
        >
          {t('nav.workspace', {}, { defaultValue: 'Workspace' })}
        </span>
        <h1
          className={cm.cn(cm.fontWeight('bold'))}
          style={{
            fontSize: '28px',
            letterSpacing: '-0.02em',
            color: 'var(--mol-color-text)',
            margin: '4px 0 0',
          }}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
      </div>

      {feedback ? (
        <div
          role="status"
          data-testid="settings-feedback"
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-paid-light)',
            color: 'var(--color-paid)',
            borderRadius: '12px',
            fontSize: '13px',
          }}
        >
          {feedback}
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-overdue-light)',
            color: 'var(--color-danger-hover)',
            borderRadius: '12px',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '240px 1fr',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        <nav
          className={cm.cn(cm.sp('p', 4), 'bg-surface rounded-2xl shadow-sm')}
          style={{ border: '1px solid var(--mol-color-border)' }}
        >
          {SECTIONS.map((s) => {
            const isActive = s.id === active
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(s.id)}
                data-section={s.id}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.fontWeight(isActive ? 'bold' : 'medium'),
                )}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: isActive ? 'var(--mol-color-primary-light)' : 'transparent',
                  color: isActive ? 'var(--color-primary-dark)' : 'var(--mol-color-text-secondary)',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {s.icon}
                </span>
                {t(`settings.section.${s.id}`, {}, { defaultValue: s.label })}
              </button>
            )
          })}
        </nav>

        <section
          className={cm.cn(cm.sp('p', 8), 'bg-surface rounded-2xl shadow-sm')}
          style={{ border: '1px solid var(--mol-color-border)' }}
          data-active-section={active}
        >
          {active === 'profile' && profileDraft ? (
            <ProfileSection draft={profileDraft} onChange={updateDraft} />
          ) : null}
          {active === 'security' ? <SecuritySection /> : null}
          {active === 'business' && profileDraft ? (
            <BusinessSection draft={profileDraft} onChange={updateDraft} />
          ) : null}
          {active === 'branding' && profileDraft ? (
            <BrandingSection draft={profileDraft} onChange={updateDraft} />
          ) : null}
          {active === 'payment-methods' && profileDraft ? (
            <PaymentMethodsSection draft={profileDraft} onChange={updateDraft} />
          ) : null}
          {active === 'notifications' && profileDraft ? (
            <NotificationsSection draft={profileDraft} onChange={updateDraft} />
          ) : null}
          {active === 'tax' ? (
            <TaxRatesSection
              taxRates={taxRates}
              reload={reloadTaxRates}
              http={http}
              onError={setError}
              onFeedback={setFeedback}
            />
          ) : null}
          {active === 'billing' ? (
            <BillingSection
              status={billing}
              tiers={tiers}
              busy={saving}
              onUpgrade={upgrade}
              onCancel={cancelSubscription}
            />
          ) : null}
          {active === 'language' ? <LanguageSection /> : null}

          {active !== 'tax' &&
          active !== 'billing' &&
          active !== 'language' &&
          active !== 'security' ? (
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'end', gap: 'sm' }))}
              style={{
                marginTop: '24px',
                borderTop: '1px solid var(--color-draft-light)',
                paddingTop: '16px',
              }}
            >
              <button
                type="button"
                onClick={cancelEdits}
                style={{
                  padding: '10px 18px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--mol-color-surface)',
                  color: 'var(--mol-color-text-secondary)',
                  fontWeight: 600,
                  fontSize: '13px',
                  border: '1px solid var(--mol-color-border)',
                  cursor: 'pointer',
                }}
              >
                {t('settings.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                data-action="save-profile"
                style={{
                  padding: '10px 22px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-sidebar-text-active)',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 18px var(--color-accent-shadow)',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}

function SectionHeading({
  id,
  defaultLabel,
  caption,
}: {
  id: string
  defaultLabel: string
  caption: string
}) {
  const { t } = useTranslation()
  return (
    <div>
      <h2
        style={{
          fontSize: '20px',
          fontWeight: 700,
          color: 'var(--mol-color-text)',
          letterSpacing: '-0.01em',
        }}
      >
        {t(`settings.section.${id}.heading`, {}, { defaultValue: defaultLabel })}
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--mol-color-text-secondary)', marginTop: '4px' }}>
        {t(`settings.section.${id}.caption`, {}, { defaultValue: caption })}
      </p>
    </div>
  )
}

function ProfileSection({
  draft,
  onChange,
}: {
  draft: ProfileData
  onChange: (updater: (prev: ProfileData) => ProfileData) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <SectionHeading
        id="profile"
        defaultLabel="Profile"
        caption={`How you appear on invoices and inside ${APP_NAME}.`}
      />
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '20px' }}
      >
        <SettingField
          label={t('settings.profile.name', {}, { defaultValue: 'Display name' })}
          value={draft.name ?? ''}
          onChange={(v) => onChange((p) => ({ ...p, name: v }))}
          name="name"
        />
        <SettingField
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          value={draft.email ?? ''}
          onChange={(v) => onChange((p) => ({ ...p, email: v }))}
          name="email"
        />
        <SettingField
          label={t('form.timezone', {}, { defaultValue: 'Timezone' })}
          value={draft.preferences?.timezone ?? ''}
          onChange={(v) =>
            onChange((p) => ({ ...p, preferences: { ...(p.preferences ?? {}), timezone: v } }))
          }
          name="timezone"
        />
        <SettingField
          label={t('settings.profile.currency', {}, { defaultValue: 'Default currency' })}
          value={draft.preferences?.currency ?? ''}
          onChange={(v) =>
            onChange((p) => ({ ...p, preferences: { ...(p.preferences ?? {}), currency: v } }))
          }
          name="currency"
        />
        <SettingField
          label={t('settings.profile.invoicePrefix', {}, { defaultValue: 'Invoice prefix' })}
          value={draft.preferences?.invoicePrefix ?? ''}
          onChange={(v) =>
            onChange((p) => ({ ...p, preferences: { ...(p.preferences ?? {}), invoicePrefix: v } }))
          }
          name="invoicePrefix"
        />
      </div>
    </>
  )
}

function SecuritySection() {
  return (
    <>
      <SectionHeading
        id="security"
        defaultLabel="Security"
        caption="Change your password and enable two-factor authentication to protect your account."
      />
      <div style={{ marginTop: '20px' }}>
        <AuthSection />
      </div>
    </>
  )
}

function BusinessSection({
  draft,
  onChange,
}: {
  draft: ProfileData
  onChange: (updater: (prev: ProfileData) => ProfileData) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <SectionHeading
        id="business"
        defaultLabel="Business info"
        caption="Address, EIN, billing email — appears on every invoice."
      />
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '20px' }}
      >
        <SettingField
          label={t('settings.business.name', {}, { defaultValue: 'Business name' })}
          value={draft.business?.name ?? ''}
          onChange={(v) =>
            onChange((p) => ({ ...p, business: { ...(p.business ?? {}), name: v } }))
          }
          name="businessName"
        />
        <SettingField
          label={t('settings.business.email', {}, { defaultValue: 'Billing email' })}
          value={draft.business?.billingEmail ?? ''}
          onChange={(v) =>
            onChange((p) => ({ ...p, business: { ...(p.business ?? {}), billingEmail: v } }))
          }
          name="businessEmail"
        />
        <SettingField
          label={t('form.phone', {}, { defaultValue: 'Phone' })}
          value={draft.business?.phone ?? ''}
          onChange={(v) =>
            onChange((p) => ({ ...p, business: { ...(p.business ?? {}), phone: v } }))
          }
          name="businessPhone"
        />
        <SettingField
          label={t('form.address', {}, { defaultValue: 'Address' })}
          value={draft.business?.address ?? ''}
          onChange={(v) =>
            onChange((p) => ({ ...p, business: { ...(p.business ?? {}), address: v } }))
          }
          name="businessAddress"
        />
        <SettingField
          label={t('settings.business.taxId', {}, { defaultValue: 'Tax ID / EIN' })}
          value={draft.business?.taxId ?? ''}
          onChange={(v) =>
            onChange((p) => ({ ...p, business: { ...(p.business ?? {}), taxId: v } }))
          }
          name="businessTaxId"
        />
      </div>
    </>
  )
}

function BrandingSection({
  draft,
  onChange,
}: {
  draft: ProfileData
  onChange: (updater: (prev: ProfileData) => ProfileData) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <SectionHeading
        id="branding"
        defaultLabel="Branding"
        caption="Logo and colors that appear on every invoice you send."
      />
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '20px' }}
      >
        <SettingField
          label={t('settings.branding.tagline', {}, { defaultValue: 'Tagline' })}
          value={draft.branding?.tagline ?? ''}
          onChange={(v) =>
            onChange((p) => ({ ...p, branding: { ...(p.branding ?? {}), tagline: v } }))
          }
          name="brandingTagline"
        />
        <div />
        <SettingColorField
          label={t('settings.branding.primary', {}, { defaultValue: 'Primary color' })}
          value={draft.branding?.primaryColor ?? '#0a5c5f'}
          onChange={(v) =>
            onChange((p) => ({ ...p, branding: { ...(p.branding ?? {}), primaryColor: v } }))
          }
          name="primaryColor"
        />
        <SettingColorField
          label={t('settings.branding.accent', {}, { defaultValue: 'Accent color' })}
          value={draft.branding?.accentColor ?? '#e86c3a'}
          onChange={(v) =>
            onChange((p) => ({ ...p, branding: { ...(p.branding ?? {}), accentColor: v } }))
          }
          name="accentColor"
        />
      </div>
    </>
  )
}

function PaymentMethodsSection({
  draft,
  onChange,
}: {
  draft: ProfileData
  onChange: (updater: (prev: ProfileData) => ProfileData) => void
}) {
  const { t } = useTranslation()
  const methods: Array<keyof NonNullable<ProfileData['paymentMethods']>> = [
    'stripe',
    'bank',
    'paypal',
    'manual',
  ]
  return (
    <>
      <SectionHeading
        id="payment-methods"
        defaultLabel="Payment methods"
        caption="Toggle which payment methods appear on the pay page."
      />
      <div style={{ display: 'grid', gap: '12px', marginTop: '20px' }}>
        {methods.map((m) => {
          const checked = Boolean(draft.paymentMethods?.[m])
          return (
            <label
              key={m}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '12px',
                backgroundColor: 'var(--mol-color-surface-secondary)',
                border: '1px solid var(--mol-color-border)',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  textTransform: 'capitalize',
                  fontSize: '14px',
                  color: 'var(--mol-color-text)',
                  fontWeight: 600,
                }}
              >
                {m}
              </span>
              <input
                type="checkbox"
                data-method={m}
                checked={checked}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    paymentMethods: { ...(p.paymentMethods ?? {}), [m]: e.target.checked },
                  }))
                }
                aria-label={t(`settings.method.${m}`, {}, { defaultValue: m })}
              />
            </label>
          )
        })}
      </div>
    </>
  )
}

function NotificationsSection({
  draft,
  onChange,
}: {
  draft: ProfileData
  onChange: (updater: (prev: ProfileData) => ProfileData) => void
}) {
  const { t } = useTranslation()
  const fields: Array<{ id: keyof NonNullable<ProfileData['notifications']>; label: string }> = [
    {
      id: 'emailOnPayment',
      label: t('settings.notify.paid', {}, { defaultValue: 'Email me when an invoice is paid' }),
    },
    {
      id: 'emailOnView',
      label: t('settings.notify.view', {}, { defaultValue: 'Email me when an invoice is viewed' }),
    },
    {
      id: 'emailOnOverdue',
      label: t(
        'settings.notify.overdue',
        {},
        { defaultValue: 'Email me when an invoice goes overdue' },
      ),
    },
    {
      id: 'weeklyDigest',
      label: t('settings.notify.digest', {}, { defaultValue: 'Send a weekly digest summary' }),
    },
  ]
  return (
    <>
      <SectionHeading
        id="notifications"
        defaultLabel="Notifications"
        caption={`Choose when ${APP_NAME} emails you.`}
      />
      <div style={{ display: 'grid', gap: '12px', marginTop: '20px' }}>
        {fields.map((f) => {
          const checked = Boolean(draft.notifications?.[f.id])
          return (
            <label
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '12px',
                backgroundColor: 'var(--mol-color-surface-secondary)',
                border: '1px solid var(--mol-color-border)',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '13px', color: 'var(--mol-color-text)' }}>{f.label}</span>
              <input
                type="checkbox"
                data-toggle={f.id}
                checked={checked}
                onChange={(e) =>
                  onChange((p) => ({
                    ...p,
                    notifications: { ...(p.notifications ?? {}), [f.id]: e.target.checked },
                  }))
                }
              />
            </label>
          )
        })}
      </div>
    </>
  )
}

function TaxRatesSection({
  taxRates,
  reload,
  http,
  onError,
  onFeedback,
}: {
  taxRates: TaxRate[]
  reload: () => Promise<void>
  http: ReturnType<typeof useHttpClient>
  onError: (msg: string | null) => void
  onFeedback: (msg: string | null) => void
}) {
  const { t } = useTranslation()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [rate, setRate] = useState('')
  const [region, setRegion] = useState('')
  const [busy, setBusy] = useState(false)

  const create = async () => {
    if (!name.trim() || !rate.trim()) {
      onError(t('settings.tax.missing', {}, { defaultValue: 'Name and rate are required.' }))
      return
    }
    const numericRate = Number(rate)
    if (!Number.isFinite(numericRate) || numericRate < 0 || numericRate > 100) {
      onError(
        t('settings.tax.invalidRate', {}, { defaultValue: 'Rate must be between 0 and 100.' }),
      )
      return
    }
    setBusy(true)
    onError(null)
    onFeedback(null)
    try {
      await http.post('/api/tax-rates', {
        name: name.trim(),
        rate_pct: numericRate,
        region: region.trim() || undefined,
      })
      setName('')
      setRate('')
      setRegion('')
      setShowForm(false)
      onFeedback(t('settings.tax.added', {}, { defaultValue: 'Tax rate added.' }))
      await reload()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not add tax rate')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (rate: TaxRate) => {
    onError(null)
    try {
      await http.delete(`/api/tax-rates/${rate.id}`)
      onFeedback(t('settings.tax.deleted', {}, { defaultValue: 'Tax rate removed.' }))
      await reload()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not delete')
    }
  }

  return (
    <>
      <SectionHeading
        id="tax"
        defaultLabel="Tax rates"
        caption="Tax lines applied to invoices and reports."
      />
      <div
        style={{
          marginTop: '20px',
          borderRadius: '14px',
          overflow: 'hidden',
          border: '1px solid var(--mol-color-border)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '560px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1.5fr 0.5fr',
                padding: '12px 16px',
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--mol-color-text-tertiary)',
                backgroundColor: 'var(--mol-color-surface-secondary)',
                borderBottom: '1px solid var(--mol-color-border)',
              }}
            >
              <span>{t('form.name', {}, { defaultValue: 'Name' })}</span>
              <span>{t('form.rate', {}, { defaultValue: 'Rate' })}</span>
              <span>{t('settings.tax.col.region', {}, { defaultValue: 'Region' })}</span>
              <span />
            </div>
            {taxRates.length === 0 ? (
              <div
                data-testid="tax-rates-empty"
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: 'var(--mol-color-text-tertiary)',
                  fontSize: '13px',
                }}
              >
                {t('settings.tax.empty', {}, { defaultValue: 'No tax rates yet.' })}
              </div>
            ) : (
              taxRates.map((r) => (
                <div
                  key={r.id}
                  data-testid={`tax-rate-${r.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1.5fr 0.5fr',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--color-draft-light)',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--mol-color-text)' }}>{r.name}</span>
                  <span
                    style={{
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--color-primary-dark)',
                      fontWeight: 700,
                    }}
                  >
                    {Number(r.rate_pct)}%
                  </span>
                  <span style={{ color: 'var(--mol-color-text-secondary)' }}>
                    {r.region ?? '—'}
                  </span>
                  <button
                    type="button"
                    data-action="delete"
                    onClick={() => remove(r)}
                    aria-label={t('settings.tax.delete', {}, { defaultValue: 'Delete tax rate' })}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--mol-color-text-tertiary)',
                      cursor: 'pointer',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      delete
                    </span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {showForm ? (
        <div
          style={{
            marginTop: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid var(--mol-color-border)',
            backgroundColor: 'var(--mol-color-surface-secondary)',
            display: 'grid',
            gap: '12px',
          }}
        >
          <SettingField
            label={t('form.name', {}, { defaultValue: 'Name' })}
            value={name}
            onChange={setName}
            name="taxName"
          />
          <SettingField
            label={t('invoiceEditor.field.taxRate', {}, { defaultValue: 'Tax rate %' })}
            value={rate}
            onChange={setRate}
            name="taxRateValue"
          />
          <SettingField
            label={t('settings.tax.col.region', {}, { defaultValue: 'Region' })}
            value={region}
            onChange={setRegion}
            name="taxRegion"
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                padding: '8px 14px',
                borderRadius: '9999px',
                backgroundColor: 'var(--mol-color-surface)',
                border: '1px solid var(--mol-color-border)',
                color: 'var(--mol-color-text-secondary)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {t('settings.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="button"
              onClick={create}
              disabled={busy}
              data-action="create-tax-rate"
              style={{
                padding: '8px 14px',
                borderRadius: '9999px',
                backgroundColor: 'var(--color-primary-dark)',
                color: 'var(--color-sidebar-text-active)',
                border: 'none',
                fontWeight: 700,
                fontSize: '12px',
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              {busy
                ? t('settings.tax.adding', {}, { defaultValue: 'Adding…' })
                : t('settings.tax.addRate', {}, { defaultValue: 'Add rate' })}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          data-action="add-tax-rate"
          style={{
            marginTop: '14px',
            padding: '8px 14px',
            borderRadius: '9999px',
            backgroundColor: 'var(--mol-color-primary-light)',
            color: 'var(--color-primary-dark)',
            border: '1px dashed var(--color-primary-dark)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t('settings.tax.add', {}, { defaultValue: '+ Add tax rate' })}
        </button>
      )}
    </>
  )
}

function BillingSection({
  status,
  tiers,
  busy,
  onUpgrade,
  onCancel,
}: {
  status: BillingStatus | null
  tiers: BillingTier[]
  busy: boolean
  onUpgrade: (priceId: string) => void | Promise<void>
  onCancel: () => void | Promise<void>
}) {
  const { t } = useTranslation()
  const currentCategory = status?.category ?? 'free'
  const currentTierLabel = status?.name ?? 'Free'
  return (
    <>
      <SectionHeading
        id="billing"
        defaultLabel="Subscription"
        caption={`Your ${APP_NAME} plan, paid via Stripe.`}
      />
      <div
        style={{
          marginTop: '20px',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid var(--mol-color-border)',
          background:
            'linear-gradient(135deg, var(--mol-color-primary-light) 0%, var(--mol-color-surface) 100%)',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          alignItems: 'center',
          gap: '24px',
        }}
        data-current-tier={currentCategory}
        data-plan-key={status?.planKey ?? ''}
      >
        <div>
          <span
            style={{
              fontSize: '10px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-primary-dark)',
              fontWeight: 700,
            }}
          >
            {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
          </span>
          <p
            data-testid="current-tier"
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: 'var(--color-primary-dark)',
              margin: '4px 0 0',
              textTransform: 'capitalize',
            }}
          >
            {currentTierLabel}
          </p>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--mol-color-text-secondary)',
              margin: '4px 0 0',
            }}
          >
            {status?.cancelAtPeriodEnd
              ? t('settings.billing.cancelling', {}, { defaultValue: 'Cancelling at period end.' })
              : status?.isFree
                ? t(
                    'settings.billing.freeTier',
                    {},
                    { defaultValue: 'Free plan — upgrade to unlock exports & higher limits.' },
                  )
                : t('settings.billing.active', {}, { defaultValue: 'Active subscription.' })}
          </p>
        </div>
        {currentCategory !== 'free' ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            data-action="cancel-subscription"
            style={{
              padding: '10px 18px',
              borderRadius: '9999px',
              backgroundColor: 'var(--mol-color-surface)',
              color: 'var(--color-danger-hover)',
              fontWeight: 700,
              fontSize: '13px',
              border:
                '1px solid color-mix(in srgb, var(--mol-color-error) 40%, var(--mol-color-surface))',
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {t('settings.billing.cancel', {}, { defaultValue: 'Cancel plan' })}
          </button>
        ) : null}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginTop: '20px',
        }}
      >
        {tiers.map((tier) => {
          const isCurrent = tier.key === currentCategory
          return (
            <div
              key={tier.key}
              data-tier={tier.key}
              style={{
                padding: '16px',
                borderRadius: '14px',
                border: '1px solid var(--mol-color-border)',
                backgroundColor: isCurrent
                  ? 'var(--mol-color-primary-light)'
                  : 'var(--mol-color-surface)',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--mol-color-text)',
                  textTransform: 'capitalize',
                }}
              >
                {tier.name}
              </div>
              {tier.prices.length > 0 ? (
                <div
                  data-testid={`tier-price-${tier.key}`}
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: 'var(--color-primary-dark)',
                    marginTop: '4px',
                  }}
                >
                  {tier.prices[0].price}
                </div>
              ) : null}
              {isCurrent ? (
                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-primary-dark)',
                    marginTop: '8px',
                    fontWeight: 700,
                  }}
                >
                  {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
                </p>
              ) : (
                <div style={{ marginTop: '12px', display: 'grid', gap: '6px' }}>
                  {tier.prices.map((price) =>
                    price.stripePriceId ? (
                      <button
                        key={price.stripePriceId}
                        type="button"
                        onClick={() => onUpgrade(price.stripePriceId as string)}
                        disabled={busy}
                        data-action="upgrade"
                        data-tier-target={tier.key}
                        data-period={price.period}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '9999px',
                          backgroundColor: 'var(--color-primary-dark)',
                          color: 'var(--color-sidebar-text-active)',
                          fontWeight: 700,
                          fontSize: '12px',
                          border: 'none',
                          cursor: busy ? 'not-allowed' : 'pointer',
                          width: '100%',
                        }}
                      >
                        {t(
                          'settings.billing.upgradeTo',
                          { tier: tier.name, period: price.period },
                          { defaultValue: '{{tier}} {{period}}' },
                        )}
                      </button>
                    ) : (
                      <div
                        key={`${tier.key}-${price.period}`}
                        data-period={price.period}
                        style={{
                          fontSize: '11px',
                          color: 'var(--mol-color-text-tertiary)',
                          textAlign: 'center',
                        }}
                      >
                        {price.price}
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

function LanguageSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <>
      <SectionHeading
        id="language"
        defaultLabel="Language"
        caption="Choose the language used throughout the app."
      />
      <div style={{ marginTop: '20px' }}>
        <LanguagePicker />
      </div>
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
    </>
  )
}

function SettingField({
  label,
  value,
  onChange,
  name,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  name?: string
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span
        style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--mol-color-text-secondary)',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        data-field={name}
        style={{
          padding: '10px 12px',
          borderRadius: '10px',
          border: '1px solid var(--mol-color-border)',
          backgroundColor: 'var(--mol-color-surface-secondary)',
          fontSize: '13px',
          color: 'var(--mol-color-text)',
          outline: 'none',
        }}
      />
    </label>
  )
}

function SettingColorField({
  label,
  value,
  onChange,
  name,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  name?: string
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span
        style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--mol-color-text-secondary)',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 10px',
          borderRadius: '10px',
          border: '1px solid var(--mol-color-border)',
          backgroundColor: 'var(--mol-color-surface-secondary)',
        }}
      >
        <span
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '8px',
            backgroundColor: value,
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          data-field={name}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '13px',
            color: 'var(--mol-color-text)',
          }}
        />
      </div>
    </label>
  )
}

export default Settings
