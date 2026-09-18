import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

interface PersistedSettings {
  storeName: string
  tagline: string
  payoutEmail: string
  brandColor: string
}

const DEFAULT_SETTINGS: PersistedSettings = {
  storeName: 'Trove by Indie Studio',
  tagline: 'Your creations, delivered instantly.',
  payoutEmail: '',
  brandColor: '#e05a2d',
}

function unwrap<T>(res: unknown): T | null {
  if (!res || typeof res !== 'object') return null
  if ('data' in res) {
    const d = (res as { data: unknown }).data
    if (d && typeof d === 'object') return d as T
  }
  return res as T
}

interface SettingsCardProps {
  icon: string
  title: string
  description: string
  children: React.ReactNode
}

function SettingsCard({ icon, title, description, children }: SettingsCardProps) {
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl bg-surface-container-lowest shadow-sm border border-border-light',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }), cm.sp('mb', 4))}>
        <div
          className={cm.cn(
            cm.sp('p', 2),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'bg-primary-light text-primary',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
            {icon}
          </span>
        </div>
        <div>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
            {title}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [persisted, setPersisted] = useState<PersistedSettings>(DEFAULT_SETTINGS)
  const [storeName, setStoreName] = useState(DEFAULT_SETTINGS.storeName)
  const [tagline, setTagline] = useState(DEFAULT_SETTINGS.tagline)
  const [payoutEmail, setPayoutEmail] = useState(DEFAULT_SETTINGS.payoutEmail)
  const [brandColor, setBrandColor] = useState(DEFAULT_SETTINGS.brandColor)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [planKey, setPlanKey] = useState<string>('free')

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/profile/me')
      .then((res) => {
        if (cancelled) return
        const inner = unwrap<{ settings?: Partial<PersistedSettings>; planKey?: string }>(res)
        // The API returns '' for never-saved fields — drop those so the
        // spread below doesn't blank out the defaults on first load.
        const saved = Object.fromEntries(
          Object.entries(inner?.settings ?? {}).filter(([, v]) => v != null && v !== ''),
        ) as Partial<PersistedSettings>
        const s = { ...DEFAULT_SETTINGS, ...saved }
        setPersisted(s)
        setStoreName(s.storeName)
        setTagline(s.tagline)
        setPayoutEmail(s.payoutEmail)
        setBrandColor(s.brandColor)
        if (inner?.planKey) setPlanKey(inner.planKey)
      })
      .catch(() => {
        // First-time render with no profile — keep defaults.
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSavedMessage(null)
    const next: PersistedSettings = { storeName, tagline, payoutEmail, brandColor }
    try {
      const res = await http.patch('/api/profile/me', next)
      const inner = unwrap<{ settings?: Partial<PersistedSettings> }>(res)
      const s = { ...DEFAULT_SETTINGS, ...next, ...(inner?.settings ?? {}) }
      setPersisted(s)
      setSavedMessage(t('common.settingsSavedPeriod', {}, { defaultValue: 'Settings saved.' }))
      window.setTimeout(() => setSavedMessage(null), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }
  const handleDiscard = () => {
    setStoreName(persisted.storeName)
    setTagline(persisted.tagline)
    setPayoutEmail(persisted.payoutEmail)
    setBrandColor(persisted.brandColor)
    setSavedMessage(t('settings.discarded', {}, { defaultValue: 'Changes discarded.' }))
    window.setTimeout(() => setSavedMessage(null), 3000)
  }

  const fieldClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.textSize('sm'),
    'rounded-xl bg-surface border border-border focus:outline-none focus:border-primary text-on-surface',
  )
  const labelClass = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('bold'),
    cm.sp('mb', 2),
    'block uppercase tracking-widest text-on-surface-variant',
  )

  return (
    <div className={cm.cn(cm.sp('p', 8), cm.stack(6))}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary-dark',
          )}
        >
          {t('settings.eyebrow', {}, { defaultValue: 'Storefront' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 1),
            'text-on-surface',
          )}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'settings.subtitle',
            {},
            { defaultValue: 'Brand your storefront, set up payments, and manage your account.' },
          )}
        </p>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            cm.sp('mt', 2),
            'text-on-surface-variant',
          )}
          data-testid="settings-plan-key"
        >
          {t('settings.plan', { plan: planKey }, { defaultValue: 'Current plan: {{plan}}' })}
        </p>
      </header>

      <SettingsCard
        icon="storefront"
        title={t('settings.branding.title', {}, { defaultValue: 'Branding' })}
        description={t('settings.branding.body', {}, { defaultValue: 'How buyers see your shop.' })}
      >
        <div className={cm.stack(4)}>
          <div>
            <label className={labelClass} htmlFor="store-name">
              {t('settings.branding.storeName', {}, { defaultValue: 'Store name' })}
            </label>
            <input
              id="store-name"
              data-testid="settings-store-name"
              className={fieldClass}
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="tagline">
              {t('settings.branding.tagline', {}, { defaultValue: 'Tagline' })}
            </label>
            <input
              id="tagline"
              data-testid="settings-tagline"
              className={fieldClass}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>
          <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
            {['#e05a2d', '#7c3aed', '#16a34a', '#0d9488', '#1e1b4b'].map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setBrandColor(color)}
                aria-label={t(
                  'settings.branding.colorAria',
                  { color },
                  { defaultValue: 'Pick {{color}}' },
                )}
                aria-pressed={brandColor === color}
                data-testid={`settings-color-${color.replace('#', '')}`}
                className={cm.cn(
                  cm.roundedFull,
                  'border-2 shadow-sm hover:scale-110 transition-transform',
                  brandColor === color ? 'border-on-surface' : 'border-white',
                )}
                style={{ width: 32, height: 32, backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        icon="account_balance"
        title={t('settings.payments.title', {}, { defaultValue: 'Payments' })}
        description={t(
          'settings.payments.body',
          {},
          { defaultValue: 'Stripe-backed payouts the next business day.' },
        )}
      >
        <div className={cm.stack(4)}>
          <div>
            <label className={labelClass} htmlFor="payout-email">
              {t('settings.payments.email', {}, { defaultValue: 'Payout email' })}
            </label>
            <input
              id="payout-email"
              type="email"
              data-testid="settings-payout-email"
              className={fieldClass}
              value={payoutEmail}
              onChange={(e) => setPayoutEmail(e.target.value)}
            />
          </div>
          <div
            className={cm.cn(
              cm.sp('p', 4),
              cm.flex({ align: 'center', gap: 'sm' }),
              'rounded-xl bg-success-light text-success',
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              verified
            </span>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {t('settings.payments.connected', {}, { defaultValue: 'Stripe is connected.' })}
            </p>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        icon="translate"
        title={t('footer.language', {}, { defaultValue: 'Language' })}
        description={t(
          'common.chooseTheLanguage',
          {},
          { defaultValue: 'Choose the language used throughout the app.' },
        )}
      >
        <LanguagePicker />
      </SettingsCard>

      <SettingsCard
        icon="upgrade"
        title={t('settings.plan.title', {}, { defaultValue: 'Subscription plan' })}
        description={t(
          'settings.plan.body',
          {},
          { defaultValue: 'Upgrade for more products, downloads, and analytics retention.' },
        )}
      >
        <div className={cm.cn(cm.flex({ gap: 'sm', align: 'center' }), 'flex-wrap')}>
          <span className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
            {t(
              'settings.plan.current',
              { plan: planKey },
              { defaultValue: 'Current plan: {{plan}}' },
            )}
          </span>
          <Link
            to="/pricing"
            data-testid="settings-upgrade-link"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-xl bg-primary text-on-primary hover:bg-primary-hover transition-colors',
            )}
          >
            {t('settings.plan.upgrade', {}, { defaultValue: 'View pricing & upgrade' })}
          </Link>
        </div>
      </SettingsCard>

      <SettingsCard
        icon="contrast"
        title={t('nav.appearance', {}, { defaultValue: 'Appearance' })}
        description={t(
          'common.toggleLightDark',
          {},
          { defaultValue: 'Toggle between light and dark mode.' },
        )}
      >
        <ThemeToggle />
      </SettingsCard>

      {error && (
        <p
          role="alert"
          data-testid="settings-error"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl bg-error-container text-on-error-container text-sm',
          )}
        >
          {error}
        </p>
      )}

      <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm', align: 'center' }), 'flex-wrap')}>
        {savedMessage && (
          <span
            data-testid="settings-saved-message"
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-success')}
            role="status"
          >
            {savedMessage}
          </span>
        )}
        <button
          type="button"
          onClick={handleDiscard}
          data-testid="settings-discard"
          disabled={saving}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'rounded-xl bg-bg-secondary text-on-surface hover:bg-border-light transition-colors disabled:opacity-60',
          )}
        >
          {t('settings.cta.cancel', {}, { defaultValue: 'Discard changes' })}
        </button>
        <button
          type="button"
          onClick={handleSave}
          data-testid="settings-save"
          disabled={saving}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'rounded-xl bg-primary text-on-primary hover:bg-primary-hover shadow-md shadow-primary/30 transition-colors disabled:opacity-60',
          )}
        >
          {saving
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
        </button>
      </div>
    </div>
  )
}

export default Settings
