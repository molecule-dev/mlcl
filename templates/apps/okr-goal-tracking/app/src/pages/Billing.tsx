import { useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import {
  type PricingTierEntry,
  useBillingStatus,
  useCancelSubscription,
  usePricingTiers,
  useStartCheckout,
} from '@molecule/app-billing-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

interface OkrLimits {
  maxObjectives: number
  maxKeyResults: number
  maxCheckIns: number
  advancedFeatures: boolean
  canExport: boolean
  retentionDays: number
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  // Perk lines derived from the tier's real limits (api/src/tiers.ts) —
  // never a hand-maintained list that can drift from the registry.
  const tierPerks = (tier: PricingTierEntry<OkrLimits>): string[] => {
    const limits = tier.limits
    if (!limits) return []
    return [
      limits.maxObjectives >= 999_999
        ? t('billing.perk.unlimitedObjectives', {}, { defaultValue: 'Unlimited objectives' })
        : t(
            'billing.perk.objectives',
            { count: limits.maxObjectives },
            { defaultValue: '{{count}} objectives' },
          ),
      limits.maxKeyResults >= 999_999
        ? t('billing.perk.unlimitedKrs', {}, { defaultValue: 'Unlimited KRs' })
        : t(
            'billing.perk.keyResults',
            { count: limits.maxKeyResults },
            { defaultValue: '{{count}} key results' },
          ),
      limits.advancedFeatures
        ? t('billing.perk.advanced', {}, { defaultValue: 'Advanced reviews + nudges' })
        : t('billing.perk.standard', {}, { defaultValue: 'Standard reviews' }),
      limits.canExport
        ? t('billing.perk.export', {}, { defaultValue: 'Data export + API access' })
        : t('billing.perk.inApp', {}, { defaultValue: 'In-app reporting' }),
      limits.retentionDays === 0
        ? t('billing.perk.unlimitedRetention', {}, { defaultValue: 'Unlimited retention' })
        : t(
            'billing.perk.retention',
            { count: limits.retentionDays },
            { defaultValue: '{{count}} days history' },
          ),
    ]
  }

  const {
    data: tiersResponse,
    loading: tiersLoading,
    error: tiersError,
  } = usePricingTiers<OkrLimits>()
  const { data: status, execute: refetchStatus } = useBillingStatus<OkrLimits>()
  const { start, loading: startingCheckout, error: startError } = useStartCheckout()
  const { cancel, error: cancelError } = useCancelSubscription()

  const [billingPeriod, setBillingPeriod] = useState<'month' | 'year'>('month')
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const tiers = tiersResponse?.data ?? []
  const currentCategory = status?.category ?? 'free'

  const handleUpgrade = async (priceId: string | null): Promise<void> => {
    setActionMessage(null)
    if (!priceId) {
      setActionMessage(
        t(
          'billing.error.priceUnavailable',
          {},
          {
            defaultValue: 'This plan is not configured for checkout in the current environment.',
          },
        ),
      )
      return
    }
    const response = await start(priceId)
    if (response?.checkoutUrl) {
      // Conversion-flow event (fire-and-forget; no-ops without a provider).
      track({
        name: 'billing.checkout_started',
        properties: { price_id: priceId, period: billingPeriod },
      })
      window.location.assign(response.checkoutUrl)
    } else if (response?.updated) {
      setActionMessage(t('nav.subscriptionUpdated', {}, { defaultValue: 'Subscription updated.' }))
      void refetchStatus()
    }
  }

  // Confirmation is handled inline by the two-step ConfirmButton (arm →
  // confirm) — no blocking window.confirm dialog.
  const handleCancel = async (): Promise<void> => {
    setActionMessage(null)
    const response = await cancel()
    if (response?.canceled) {
      setActionMessage(
        t(
          'billing.message.canceled',
          {},
          { defaultValue: 'Subscription will end at the close of the current period.' },
        ),
      )
      void refetchStatus()
    }
  }

  const downloadInvoiceCsv = (): void => {
    setDownloadingId('current')
    const lines = [
      ['date', 'plan', 'category', 'isFree'].join(','),
      [
        new Date().toISOString().slice(0, 10),
        status?.name ?? 'Free',
        status?.category ?? 'free',
        String(status?.isFree ?? true),
      ].join(','),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `okr-billing-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setTimeout(() => setDownloadingId(null), 600)
  }

  return (
    <div className={cm.cn(cm.stack(8))} data-testid="billing-page">
      <header className={cm.cn(cm.flex({ justify: 'between', align: 'end', gap: 'md' }))}>
        <div className={cm.cn(cm.stack(2))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-[0.22em] text-indigo-700',
            )}
          >
            {t('billing.eyebrow', {}, { defaultValue: 'Workspace · Billing' })}
          </span>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
            style={{ color: 'var(--color-heading-ink)' }}
          >
            {t('billing.heading', {}, { defaultValue: 'Plan & invoices' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
            {status
              ? t(
                  'billing.subheading',
                  { name: status.name },
                  { defaultValue: "You're on the {{name}} plan. Compare tiers and upgrade below." },
                )
              : t('billing.subheading.loading', {}, { defaultValue: 'Loading your current plan…' })}
          </p>
        </div>
        <Link
          to="/settings"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-xl text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors',
          )}
        >
          {t('billing.backToSettings', {}, { defaultValue: '← Settings' })}
        </Link>
      </header>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.flex({ align: 'center', gap: 'lg' }),
          'rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/30 flex-wrap',
        )}
      >
        <div className={cm.cn(cm.stack(2), cm.flex1)}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-sky-100',
            )}
          >
            {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
          </span>
          <p
            data-testid="current-plan-name"
            className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight')}
          >
            {status?.name ?? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-sky-100')}>
            {status
              ? status.isFree
                ? t(
                    'billing.currentPlanFreeFooter',
                    {},
                    { defaultValue: 'You are on the free tier. Upgrade for higher limits.' },
                  )
                : t(
                    'billing.currentPlanPaidFooter',
                    { plan: status.planKey },
                    { defaultValue: 'Active subscription · {{plan}}' },
                  )
              : ''}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <button
            type="button"
            onClick={downloadInvoiceCsv}
            data-testid="download-billing-csv"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-xl bg-surface text-indigo-700 shadow-md hover:scale-[1.02] active:scale-[0.99] transition-transform',
            )}
          >
            {downloadingId === 'current'
              ? t('billing.downloading', {}, { defaultValue: 'Preparing…' })
              : t('billing.downloadCurrent', {}, { defaultValue: 'Download summary' })}
          </button>
          {!status?.isFree && (
            <ConfirmButton
              data-mol-id="cancel-subscription"
              label={t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
              confirmLabel={t(
                'billing.confirmCancel',
                {},
                { defaultValue: 'Cancel your subscription at the end of the current period?' },
              )}
              pendingLabel={t('billing.canceling', {}, { defaultValue: 'Canceling…' })}
              onConfirm={handleCancel}
              disarmSeconds={6}
              color="error"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl bg-surface/15 backdrop-blur-md border border-surface/20 hover:bg-surface/25 transition-colors',
              )}
            />
          )}
        </div>
      </section>

      {(actionMessage || startError || cancelError) && (
        <p
          role="alert"
          data-testid="billing-action-message"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-xl bg-warning-light text-warning border border-amber-200',
          )}
        >
          {actionMessage ?? startError?.message ?? cancelError?.message ?? ''}
        </p>
      )}

      <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
        {(['month', 'year'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setBillingPeriod(p)}
            data-testid={`billing-period-${p}`}
            aria-pressed={billingPeriod === p}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest rounded-lg ring-1 transition-colors',
              billingPeriod === p
                ? 'bg-primary text-on-primary ring-primary'
                : 'bg-surface-container-low text-on-surface ring-outline-variant hover:bg-surface-container',
            )}
          >
            {p === 'month'
              ? t('status.monthly', {}, { defaultValue: 'Monthly' })
              : t('billing.period.year', {}, { defaultValue: 'Yearly' })}
          </button>
        ))}
      </div>

      {tiersLoading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('nav.loadingPlans', {}, { defaultValue: 'Loading plans…' })}
        </p>
      ) : tiersError ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
          {t(
            'billing.tiersError',
            {},
            { defaultValue: 'Could not load pricing. Try again later.' },
          )}
        </p>
      ) : (
        <section data-testid="billing-tiers" className={cm.cn(cm.grid({ cols: 3, gap: 'lg' }))}>
          {tiers.map((tier) => {
            const price = tier.prices.find((p) => p.period === billingPeriod) ?? tier.prices[0]
            const isCurrent = currentCategory === tier.key
            const accent = tier.key === 'pro'
            return (
              <article
                key={tier.key}
                data-testid={`billing-tier-${tier.key}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.stack(4),
                  'rounded-2xl shadow-sm border transition-all duration-200 hover:-translate-y-0.5',
                  accent
                    ? 'border-indigo-300 bg-gradient-to-br from-indigo-50 to-sky-50 shadow-indigo-200/40'
                    : 'border-outline-variant/40 bg-surface-container-lowest',
                )}
              >
                <header className={cm.cn(cm.stack(2))}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest',
                      accent ? 'text-indigo-700' : 'text-on-surface-variant',
                    )}
                  >
                    {tier.name}
                  </span>
                  <p className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }))}>
                    {/* The accent card keeps its light indigo tint in dark mode,
                        so it needs fixed dark ink instead of theme-flipping
                        `text-on-surface` (which would be unreadable there). */}
                    <span
                      className={cm.cn(
                        cm.textSize('3xl'),
                        'font-extrabold tracking-tight tabular-nums',
                        accent ? 'text-indigo-950' : 'text-on-surface',
                      )}
                    >
                      {price?.price ?? '—'}
                    </span>
                  </p>
                </header>
                <ul
                  className={cm.cn(
                    cm.stack(2),
                    cm.textSize('sm'),
                    accent ? 'text-indigo-950' : 'text-on-surface',
                  )}
                >
                  {tierPerks(tier).map((perk) => (
                    <li key={perk} className={cm.cn(cm.flex({ align: 'start', gap: 'xs' }))}>
                      <span
                        aria-hidden
                        className={cm.cn(
                          'material-symbols-outlined text-[18px] mt-0.5',
                          accent ? 'text-indigo-600' : 'text-success-text',
                        )}
                      >
                        check_circle
                      </span>
                      {perk}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  data-testid={`upgrade-${tier.key}`}
                  disabled={isCurrent || startingCheckout || !price?.stripePriceId}
                  onClick={() => handleUpgrade(price?.stripePriceId ?? null)}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                    cm.w('full'),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'rounded-xl transition-transform disabled:opacity-60',
                    accent
                      ? 'text-white bg-gradient-to-br from-indigo-600 to-sky-500 shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.99]'
                      : 'text-on-surface bg-surface-container-low hover:bg-surface-container',
                  )}
                >
                  {isCurrent
                    ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
                    : !price?.stripePriceId
                      ? t('billing.tier.unavailable', {}, { defaultValue: 'Not available' })
                      : startingCheckout
                        ? t('common.startingEllipsis', {}, { defaultValue: 'Starting…' })
                        : t(
                            'billing.tier.upgrade',
                            { name: tier.name },
                            { defaultValue: 'Upgrade to {{name}}' },
                          )}
                </button>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}

export default Billing
