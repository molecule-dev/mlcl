import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, Switch, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { AccountSettings } from '../components/AccountSettings.js'
import { PhotoEditorLayout } from '../components/PhotoEditorLayout.js'

const COLOR_PROFILES = [
  { id: 'srgb', label: 'sRGB', description: 'Universal — match the web.', recommended: true },
  {
    id: 'display-p3',
    label: 'Display P3',
    description: 'Wide gamut for modern displays.',
    recommended: false,
  },
  {
    id: 'adobe-rgb',
    label: 'Adobe RGB',
    description: 'Print-prep workflows; conversions on export.',
    recommended: false,
  },
  {
    id: 'prophoto-rgb',
    label: 'ProPhoto RGB',
    description: 'Maximum gamut for ETTR / studio masters.',
    recommended: false,
  },
] as const

const SHORTCUTS: Array<{ keys: string; labelKey: string; defaultLabel: string }> = [
  { keys: 'V', labelKey: 'settings.kb.select', defaultLabel: 'Select tool' },
  { keys: 'C', labelKey: 'settings.kb.crop', defaultLabel: 'Crop tool' },
  { keys: 'M', labelKey: 'settings.kb.mask', defaultLabel: 'Mask tool' },
  { keys: 'B', labelKey: 'settings.kb.brush', defaultLabel: 'Brush' },
  { keys: '⌘ + Z', labelKey: 'settings.kb.undo', defaultLabel: 'Undo' },
  { keys: '⌘ + ⇧ + Z', labelKey: 'settings.kb.redo', defaultLabel: 'Redo' },
  { keys: '⌘ + S', labelKey: 'settings.kb.save', defaultLabel: 'Save' },
  { keys: '⌘ + E', labelKey: 'settings.kb.export', defaultLabel: 'Export' },
  { keys: 'Space + drag', labelKey: 'settings.kb.pan', defaultLabel: 'Pan canvas' },
  { keys: '⌘ + 0', labelKey: 'settings.kb.fit', defaultLabel: 'Fit to screen' },
  { keys: '⌘ + 1', labelKey: 'settings.kb.actual', defaultLabel: 'Actual pixels' },
  { keys: '⌘ + ⇧ + N', labelKey: 'settings.kb.newLayer', defaultLabel: 'New layer' },
]

const TOGGLES = [
  { id: 'autosave', defaultLabel: 'Autosave every 30s', defaultOn: true },
  { id: 'overlays', defaultLabel: 'Show rule-of-thirds overlay', defaultOn: true },
  { id: 'highBitDepth', defaultLabel: 'Process in 32-bit float', defaultOn: true },
  { id: 'aiSuggest', defaultLabel: 'AI preset suggestions', defaultOn: false },
] as const

const PROFILE_STORAGE_KEY = 'lustra:colorProfile'
const TOGGLE_STORAGE_KEY = 'lustra:editorToggles'

interface BillingTierPrice {
  period: string
  price: string
  stripePriceId: string | null
}
interface BillingTier {
  key: string
  name: string
  prices: BillingTierPrice[]
  limits: { maxImages: number; canExport: boolean; advancedFeatures: boolean }
}
interface BillingStatus {
  planKey: string
  name: string
  isFree: boolean
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [profile, setProfile] = useState<(typeof COLOR_PROFILES)[number]['id']>(() => {
    if (typeof globalThis.localStorage === 'undefined') return 'srgb'
    const stored = globalThis.localStorage.getItem(PROFILE_STORAGE_KEY)
    return (stored as (typeof COLOR_PROFILES)[number]['id'] | null) ?? 'srgb'
  })
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const defaults = Object.fromEntries(TOGGLES.map((tog) => [tog.id, tog.defaultOn]))
    if (typeof globalThis.localStorage === 'undefined') return defaults
    const raw = globalThis.localStorage.getItem(TOGGLE_STORAGE_KEY)
    if (!raw) return defaults
    try {
      return { ...defaults, ...(JSON.parse(raw) as Record<string, boolean>) }
    } catch (_error) {
      // Corrupted localStorage value — ignore and fall back to defaults
      return defaults
    }
  })
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [tiers, setTiers] = useState<BillingTier[]>([])
  const [billingError, setBillingError] = useState<string | null>(null)
  const [checkoutInProgress, setCheckoutInProgress] = useState(false)
  const [cancelStatus, setCancelStatus] = useState<'idle' | 'cancelling' | 'cancelled' | 'error'>(
    'idle',
  )

  useEffect(() => {
    if (typeof globalThis.localStorage === 'undefined') return
    globalThis.localStorage.setItem(PROFILE_STORAGE_KEY, profile)
  }, [profile])

  useEffect(() => {
    if (typeof globalThis.localStorage === 'undefined') return
    globalThis.localStorage.setItem(TOGGLE_STORAGE_KEY, JSON.stringify(toggles))
  }, [toggles])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get<BillingStatus>('/billing/status'),
      http.get<{ data: BillingTier[] }>('/billing/tiers'),
    ])
      .then(([statusRes, tiersRes]) => {
        if (cancelled) return
        setBilling(statusRes.data)
        setTiers(tiersRes.data?.data ?? [])
      })
      .catch((err: Error) => {
        if (cancelled) return
        setBillingError(err.message ?? 'Could not load plan info.')
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const proTier = tiers.find((t) => t.key === 'pro')
  const teamTier = tiers.find((t) => t.key === 'team')

  const handleCheckout = async (priceId: string | null) => {
    if (!priceId) return
    setCheckoutInProgress(true)
    setBillingError(null)
    try {
      const res = await http.post<{ checkoutUrl?: string; updated?: boolean }>(
        '/billing/checkout',
        { priceId },
      )
      if (res.data.checkoutUrl) {
        track({ name: 'billing.checkout_started', properties: { price_id: priceId } })
        globalThis.location.href = res.data.checkoutUrl
        return
      }
      if (res.data.updated) {
        const status = await http.get<BillingStatus>('/billing/status')
        setBilling(status.data)
      }
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Checkout failed.')
    } finally {
      setCheckoutInProgress(false)
    }
  }

  const handleCancel = async () => {
    setCancelStatus('cancelling')
    try {
      await http.post('/billing/cancel', {})
      setCancelStatus('cancelled')
      track({ name: 'billing.subscription_cancelled' })
      const status = await http.get<BillingStatus>('/billing/status')
      setBilling(status.data)
    } catch (_error) {
      // Error state surfaced to UI via setCancelStatus('error')
      setCancelStatus('error')
    }
  }

  return (
    <PhotoEditorLayout
      title={t('nav.settings', {}, { defaultValue: 'Settings' })}
      breadcrumb={t('settings.breadcrumb', {}, { defaultValue: '// account › preferences' })}
    >
      <AccountSettings />
      <div className={cm.cn('grid grid-cols-1 xl:grid-cols-12 gap-6')}>
        {/* Color profile */}
        <section className={cm.cn('xl:col-span-7')}>
          <div
            className={cm.cn(
              'rounded-2xl bg-[var(--photo-surface)] border border-[var(--photo-border)] p-6',
            )}
          >
            <p
              className={cm.cn(
                'text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--photo-panel-text-accent)]',
              )}
            >
              {t('settings.color.eyebrow', {}, { defaultValue: '// color' })}
            </p>
            <h3 className={cm.cn('text-xl font-bold tracking-tight text-[var(--photo-text)] mt-1')}>
              {t('settings.color.title', {}, { defaultValue: 'Working color profile' })}
            </h3>
            <p className={cm.cn('text-sm text-[var(--photo-text-muted)] mt-1 max-w-md')}>
              {t(
                'settings.color.body',
                {},
                {
                  defaultValue:
                    'The canvas always renders in this profile. Conversions happen on export.',
                },
              )}
            </p>
            <ul className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-3 mt-5')}>
              {COLOR_PROFILES.map((p) => {
                const active = profile === p.id
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setProfile(p.id)
                        track({
                          name: 'settings.updated',
                          properties: { setting: 'colorProfile', value: p.id },
                        })
                      }}
                      data-mol-id={`settings-profile-${p.id}`}
                      data-active={active ? 'true' : 'false'}
                      className={cm.cn(
                        'w-full text-left rounded-xl border p-4 transition-all hover:-translate-y-0.5',
                        active
                          ? 'border-[var(--photo-accent)] bg-[var(--photo-accent)]/15 shadow-lg'
                          : 'border-[var(--photo-border)] hover:border-[var(--photo-accent)]/40 hover:bg-[var(--photo-surface-elevated)]',
                      )}
                    >
                      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                        <p
                          className={cm.cn(
                            'text-sm font-bold tracking-tight',
                            active
                              ? 'text-[var(--photo-panel-text-highlight)]'
                              : 'text-[var(--photo-text)]',
                          )}
                        >
                          {p.label}
                        </p>
                        {p.recommended && (
                          <span
                            className={cm.cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest rounded-full bg-[var(--mol-color-success)]/20 text-[var(--mol-color-success)] border border-[var(--mol-color-success)]/40',
                            )}
                          >
                            {t('settings.color.recommended', {}, { defaultValue: 'Recommended' })}
                          </span>
                        )}
                      </div>
                      <p
                        className={cm.cn(
                          'text-[11px] text-[var(--photo-text-muted)] mt-1 leading-relaxed',
                        )}
                      >
                        {t(`settings.color.desc.${p.id}`, {}, { defaultValue: p.description })}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div
            className={cm.cn(
              'rounded-2xl bg-[var(--photo-surface)] border border-[var(--photo-border)] p-6 mt-6',
            )}
          >
            <p
              className={cm.cn(
                'text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--photo-panel-text-accent)]',
              )}
            >
              {t('settings.preferences.eyebrow', {}, { defaultValue: '// preferences' })}
            </p>
            <h3 className={cm.cn('text-xl font-bold tracking-tight text-[var(--photo-text)] mt-1')}>
              {t('settings.preferences.title', {}, { defaultValue: 'Editor behaviour' })}
            </h3>
            <ul className={cm.cn('divide-y divide-[var(--photo-border)] mt-3')}>
              {TOGGLES.map((tog) => {
                const on = toggles[tog.id]
                const toggleLabel = t(
                  `settings.toggle.${tog.id}`,
                  {},
                  { defaultValue: tog.defaultLabel },
                )
                return (
                  <li key={tog.id} className={cm.cn('flex items-center justify-between py-3')}>
                    <span className={cm.cn('text-sm text-[var(--photo-text)] font-medium')}>
                      {toggleLabel}
                    </span>
                    <Switch
                      checked={on}
                      onChange={(e) => {
                        const next = (e.target as HTMLInputElement).checked
                        setToggles((prev) => ({ ...prev, [tog.id]: next }))
                        track({
                          name: 'settings.updated',
                          properties: { setting: tog.id, value: next },
                        })
                      }}
                      aria-label={toggleLabel}
                      data-mol-id={`settings-toggle-${tog.id}`}
                    />
                  </li>
                )
              })}
            </ul>
          </div>

          <section
            className={cm.cn(
              'rounded-2xl bg-[var(--photo-surface)] border border-[var(--photo-border)] p-6 mt-6',
            )}
            data-mol-id="settings-language"
          >
            <p
              className={cm.cn(
                'text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--photo-panel-text-accent)]',
              )}
            >
              {t('settings.language.eyebrow', {}, { defaultValue: '// language' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 1),
                cm.sp('mb', 2),
                'tracking-tight text-[var(--photo-text)]',
              )}
            >
              {t('footer.language', {}, { defaultValue: 'Language' })}
            </h2>
            <p
              className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-[var(--photo-text-muted)]')}
            >
              {t(
                'common.chooseTheLanguage',
                {},
                { defaultValue: 'Choose the language used throughout the app.' },
              )}
            </p>
            <LanguagePicker />
          </section>
          <section
            className={cm.cn(
              'rounded-2xl bg-[var(--photo-surface)] border border-[var(--photo-border)] p-6 mt-6',
            )}
            data-mol-id="settings-appearance"
          >
            <p
              className={cm.cn(
                'text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--photo-panel-text-accent)]',
              )}
            >
              {t('settings.appearance.eyebrow', {}, { defaultValue: '// appearance' })}
            </p>
            <h3 className={cm.cn('text-xl font-bold tracking-tight text-[var(--photo-text)] mt-1')}>
              {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
            </h3>
            <p className={cm.cn('text-sm text-[var(--photo-text-muted)] mt-1 mb-4')}>
              {t(
                'common.toggleLightDark',
                {},
                { defaultValue: 'Toggle between light and dark mode.' },
              )}
            </p>
            <ThemeToggle />
          </section>
        </section>

        {/* Shortcuts */}
        <section className={cm.cn('xl:col-span-5')}>
          <div
            className={cm.cn(
              'rounded-2xl bg-[var(--photo-surface)] border border-[var(--photo-border)] p-6',
            )}
          >
            <p
              className={cm.cn(
                'text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--photo-panel-text-accent)]',
              )}
            >
              {t('settings.kb.eyebrow', {}, { defaultValue: '// keyboard' })}
            </p>
            <h3 className={cm.cn('text-xl font-bold tracking-tight text-[var(--photo-text)] mt-1')}>
              {t('settings.kb.title', {}, { defaultValue: 'Keyboard shortcuts' })}
            </h3>
            <p className={cm.cn('text-sm text-[var(--photo-text-muted)] mt-1')}>
              {t(
                'settings.kb.body',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} is keyboard-first. Customise any binding from the editor command palette (⌘K).',
                },
              )}
            </p>
            <ul className={cm.cn('divide-y divide-[var(--photo-border)] mt-3')}>
              {SHORTCUTS.map((s) => (
                <li key={s.keys} className={cm.cn('flex items-center justify-between py-2.5')}>
                  <span className={cm.cn('text-[13px] text-[var(--photo-text)]')}>
                    {t(s.labelKey, {}, { defaultValue: s.defaultLabel })}
                  </span>
                  <kbd
                    className={cm.cn(
                      'px-2 py-0.5 rounded font-mono text-[11px] tabular-nums bg-[var(--photo-surface-elevated)] border border-[var(--photo-border)] text-[var(--photo-panel-text-highlight)]',
                    )}
                  >
                    {s.keys}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>

          <div
            className={cm.cn(
              'rounded-2xl border border-[var(--photo-border)] p-6 mt-6 relative overflow-hidden',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--photo-hero-from) 0%, var(--photo-hero-via) 100%)',
            }}
            data-mol-id="settings-plan-card"
            data-plan-key={billing?.planKey ?? 'unknown'}
          >
            <div
              className={cm.cn(
                'absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-[var(--photo-accent)]/30 blur-3xl',
              )}
              aria-hidden="true"
            />
            <div className={cm.cn('relative z-10')}>
              <p
                className={cm.cn(
                  'text-[10px] font-mono font-bold uppercase tracking-widest text-white/70',
                )}
              >
                {t('settings.plan.eyebrow', {}, { defaultValue: '// plan' })}
              </p>
              <h3
                className={cm.cn('text-2xl font-bold tracking-tight text-white mt-1')}
                data-mol-id="settings-plan-name"
              >
                {billing
                  ? t(
                      'settings.plan.namedHeading',
                      { name: billing.name, appName: APP_NAME },
                      { defaultValue: `${APP_NAME} ${billing.name}` },
                    )
                  : t('settings.plan.loadingHeading', {}, { defaultValue: 'Loading plan…' })}
              </h3>
              <p className={cm.cn('text-sm text-white/85 mt-2 leading-relaxed')}>
                {billing?.isFree
                  ? t(
                      'settings.plan.bodyFree',
                      {},
                      {
                        defaultValue:
                          'Upgrade to unlock unlimited exports, premium presets, and 1TB cloud library.',
                      },
                    )
                  : t(
                      'settings.plan.bodyPaid',
                      {},
                      {
                        defaultValue:
                          'Unlimited exports, 1 TB cloud library, premium preset packs.',
                      },
                    )}
              </p>
              {billingError && (
                <p
                  className={cm.cn('mt-3 text-xs text-[var(--mol-color-error)]')}
                  data-mol-id="settings-billing-error"
                >
                  {billingError}
                </p>
              )}
              <div className={cm.cn('mt-4 flex flex-wrap gap-2')}>
                {billing?.isFree && proTier && (
                  <button
                    type="button"
                    onClick={() =>
                      handleCheckout(
                        proTier.prices.find((p) => p.period === 'month')?.stripePriceId ?? null,
                      )
                    }
                    disabled={checkoutInProgress}
                    data-mol-id="settings-plan-upgrade-pro"
                    className={cm.cn(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-white/15 hover:bg-white/25 text-white backdrop-blur transition-colors disabled:opacity-60 disabled:cursor-wait',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[16px]')}
                      aria-hidden="true"
                    >
                      credit_card
                    </span>
                    {checkoutInProgress
                      ? t('settings.plan.upgrading', {}, { defaultValue: 'Redirecting…' })
                      : t(
                          'settings.plan.upgradePro',
                          { price: proTier.prices.find((p) => p.period === 'month')?.price ?? '' },
                          { defaultValue: 'Upgrade to Pro {{price}}' },
                        )}
                  </button>
                )}
                {billing?.isFree && teamTier && (
                  <button
                    type="button"
                    onClick={() =>
                      handleCheckout(
                        teamTier.prices.find((p) => p.period === 'month')?.stripePriceId ?? null,
                      )
                    }
                    disabled={checkoutInProgress}
                    data-mol-id="settings-plan-upgrade-team"
                    className={cm.cn(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 text-white backdrop-blur transition-colors disabled:opacity-60 disabled:cursor-wait',
                    )}
                  >
                    {t(
                      'settings.plan.upgradeTeam',
                      { price: teamTier.prices.find((p) => p.period === 'month')?.price ?? '' },
                      {
                        defaultValue: `Team ${teamTier.prices.find((p) => p.period === 'month')?.price ?? ''}`,
                      },
                    )}
                  </button>
                )}
                {billing && !billing.isFree && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelStatus === 'cancelling'}
                    data-mol-id="settings-plan-cancel"
                    className={cm.cn(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 text-white backdrop-blur transition-colors disabled:opacity-60 disabled:cursor-wait',
                    )}
                  >
                    {cancelStatus === 'cancelling'
                      ? t('settings.plan.cancelling', {}, { defaultValue: 'Cancelling…' })
                      : t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
                  </button>
                )}
                {cancelStatus === 'cancelled' && (
                  <span className={cm.cn('text-xs text-[var(--mol-color-success)]')}>
                    {t(
                      'nav.subscriptionCancelled',
                      {},
                      { defaultValue: 'Subscription cancelled.' },
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </PhotoEditorLayout>
  )
}

export default Settings
