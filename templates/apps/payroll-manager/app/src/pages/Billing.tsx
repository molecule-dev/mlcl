import type { PricingTierEntry } from '@molecule/app-billing-react'
import {
  useBillingStatus,
  useCancelSubscription,
  usePricingTiers,
  useStartCheckout,
} from '@molecule/app-billing-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

interface PayrollManagerLimits {
  maxEmployees?: number
  maxPayRuns?: number
  maxDeductions?: number
  maxTaxes?: number
  advancedFeatures?: boolean
  canExport?: boolean
}

interface Tier extends PricingTierEntry<PayrollManagerLimits> {
  current?: boolean
}

/**
 * Per-tier perk copy. The quantitative claims mirror the limits declared
 * in the API's `tiers.ts` (Free: 10 each / Pro: 500 each + export /
 * Team: unlimited) — keep both in sync when the ladder changes.
 */
const PERK_KEYS_BY_TIER: Record<string, ReadonlyArray<{ key: string; defaultValue: string }>> = {
  free: [
    { key: 'billing.perk.free.employees', defaultValue: 'Up to 10 employees' },
    { key: 'billing.perk.free.payRuns', defaultValue: 'Up to 10 pay-runs' },
    { key: 'billing.perk.free.retention', defaultValue: '90-day history' },
  ],
  pro: [
    { key: 'billing.perk.pro.employees', defaultValue: 'Up to 500 employees' },
    { key: 'billing.perk.pro.payRuns', defaultValue: 'Up to 500 pay-runs' },
    { key: 'billing.perk.pro.advanced', defaultValue: 'Advanced features' },
    { key: 'billing.perk.pro.export', defaultValue: 'CSV data export' },
  ],
  team: [
    { key: 'billing.perk.team.employees', defaultValue: 'Unlimited employees' },
    { key: 'billing.perk.team.payRuns', defaultValue: 'Unlimited pay-runs' },
    { key: 'billing.perk.team.retention', defaultValue: 'Unlimited history' },
    { key: 'billing.perk.team.export', defaultValue: 'Advanced features + export' },
  ],
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const tiersResp = usePricingTiers<PayrollManagerLimits>()
  const statusResp = useBillingStatus<PayrollManagerLimits>()
  const checkout = useStartCheckout()
  const cancel = useCancelSubscription()

  const loading = tiersResp.loading || statusResp.loading
  const error = tiersResp.error || statusResp.error || checkout.error || cancel.error
  const tiers: Tier[] = (tiersResp.data?.data ?? []).map((tier) => ({
    ...tier,
    current: tier.key === statusResp.data?.category,
  }))
  const currentTier = tiers.find((t) => t.current)
  const currentMonthlyPrice = currentTier?.prices.find((p) => p.period === 'month')?.price ?? '$0'

  const onSwitch = async (priceId: string | null) => {
    if (!priceId) return
    const result = await checkout.start(priceId)
    if (result?.checkoutUrl) {
      window.location.href = result.checkoutUrl
      return
    }
    if (result?.updated) {
      await statusResp.execute()
    }
  }

  const onCancel = async () => {
    const result = await cancel.cancel()
    if (result?.canceled) await statusResp.execute()
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {currentTier
            ? t(
                'billing.eyebrow',
                { plan: currentTier.name },
                { defaultValue: 'Subscription · {{plan}}' },
              )
            : t('nav.subscription', {}, { defaultValue: 'Subscription' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('settings.billing', {}, { defaultValue: 'Billing' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'billing.subheading',
            {},
            { defaultValue: 'Manage your plan and switch tiers via Stripe.' },
          )}
        </p>
      </header>

      {error ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-error')}>
          {error.message ||
            t('billing.loadError', {}, { defaultValue: 'Could not load billing information.' })}
        </p>
      ) : null}

      <section
        className={cm.cn(
          cm.sp('p', 8),
          'rounded-2xl bg-gradient-to-br from-primary-container/30 to-surface-container-lowest shadow-sm',
        )}
      >
        <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'lg' })}>
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t(
                'billing.currentPlan',
                { plan: currentTier?.name ?? 'Free' },
                { defaultValue: 'Current plan · {{plan}}' },
              )}
            </p>
            <p
              className={cm.cn(
                cm.textSize('3xl'),
                cm.sp('mt', 1),
                'font-extrabold tabular-nums tracking-tight',
              )}
            >
              {currentMonthlyPrice}
            </p>
            {statusResp.data?.limits ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'billing.limitsSummary',
                  {
                    employees: formatNum(statusResp.data.limits.maxEmployees),
                    payRuns: formatNum(statusResp.data.limits.maxPayRuns),
                  },
                  { defaultValue: 'Up to {{employees}} employees · {{payRuns}} pay-runs/month' },
                )}
              </p>
            ) : null}
          </div>
          {currentTier && !statusResp.data?.isFree ? (
            <ConfirmButton
              variant="outline"
              color="error"
              size="sm"
              label={t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
              confirmLabel={t(
                'billing.cancelConfirm',
                {},
                { defaultValue: 'Cancel subscription at the end of the current period?' },
              )}
              pendingLabel={t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })}
              onConfirm={onCancel}
              disabled={cancel.loading}
              disarmSeconds={6}
              data-mol-id="billing-cancel-subscription"
            />
          ) : null}
        </div>
      </section>

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('billing.plansHeading', {}, { defaultValue: 'Plans' })}
        </h2>
        {loading && tiers.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : (
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
            {tiers.map((tier) => {
              const monthly = tier.prices.find((p) => p.period === 'month')
              const yearly = tier.prices.find((p) => p.period === 'year')
              const stripeId = monthly?.stripePriceId ?? yearly?.stripePriceId ?? null
              const perks = (PERK_KEYS_BY_TIER[tier.key] ?? []).map((p) =>
                t(p.key, {}, { defaultValue: p.defaultValue }),
              )
              const switchable = !tier.current && stripeId !== null
              return (
                <div
                  key={tier.key}
                  className={cm.cn(
                    cm.sp('p', 6),
                    cm.flex({ direction: 'col', gap: 'md' }),
                    'rounded-2xl bg-surface-container-lowest shadow-sm',
                    tier.current ? 'border-2 border-primary' : 'border border-outline-variant/40',
                  )}
                >
                  <div className={cm.flex({ align: 'center', justify: 'between' })}>
                    <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{tier.name}</h3>
                    {tier.current ? (
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          cm.fontWeight('bold'),
                          cm.roundedFull,
                          'text-[10px] uppercase tracking-widest bg-primary text-on-primary',
                        )}
                      >
                        {t('nav.current', {}, { defaultValue: 'Current' })}
                      </span>
                    ) : null}
                  </div>
                  <p
                    className={cm.cn(
                      cm.textSize('3xl'),
                      'font-extrabold tabular-nums tracking-tight',
                    )}
                  >
                    {monthly?.price ?? tier.prices[0]?.price ?? '$0'}
                  </p>
                  <ul className={cm.cn(cm.stack(1), cm.sp('mt', 2))}>
                    {perks.map((p) => (
                      <li
                        key={p}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.textSize('sm'),
                        )}
                      >
                        <span
                          className={cm.cn(`material-symbols-outlined text-base text-secondary`)}
                          aria-hidden="true"
                        >
                          check_circle
                        </span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={!switchable || checkout.loading}
                    onClick={() => onSwitch(stripeId)}
                    className={cm.cn(
                      cm.sp('py', 3),
                      cm.roundedFull,
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'mt-auto',
                      tier.current
                        ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                        : !switchable
                          ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                          : 'bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50',
                    )}
                  >
                    {tier.current
                      ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
                      : !stripeId
                        ? t('billing.notConfigured', {}, { defaultValue: 'Not configured' })
                        : checkout.loading
                          ? t('common.startingEllipsis', {}, { defaultValue: 'Starting…' })
                          : t(
                              'billing.switchCta',
                              { name: tier.name },
                              { defaultValue: `Switch to {{name}}` },
                            )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'billing.stripeFootnote',
            {},
            {
              defaultValue:
                'Plan changes are processed by Stripe. You will be redirected to a secure Checkout page.',
            },
          )}
        </p>
      </section>
    </div>
  )
}

const formatNum = (n: number | undefined): string =>
  n === undefined ? '—' : n >= 999_999 ? '∞' : n.toLocaleString()
