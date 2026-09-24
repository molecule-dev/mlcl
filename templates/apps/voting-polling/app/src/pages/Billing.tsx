import { useCallback, useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { QuorumKpiCard } from '../components/QuorumKpiCard.js'
import { unwrap } from '../lib/api.js'

interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
  limits: {
    maxPolls?: number
    maxResults?: number
    advancedFeatures?: boolean
    canExport?: boolean
    retentionDays?: number
  }
}

interface PriceRow {
  period: 'month' | 'year'
  price: string
  stripePriceId: string | null
}

interface TierRow {
  key: string
  name: string
  prices: PriceRow[]
  limits: BillingStatus['limits']
}

interface CheckoutResponse {
  checkoutUrl?: string
  updated?: boolean
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [tiers, setTiers] = useState<TierRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionPending, setActionPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statusRes, tiersRes] = await Promise.all([
        http.get<BillingStatus>('/api/billing/status'),
        http.get<{ data: TierRow[] }>('/api/billing/tiers'),
      ])
      setStatus(statusRes.data as BillingStatus)
      const tiersData =
        (tiersRes.data as { data?: TierRow[] }).data ?? unwrap<TierRow[]>(tiersRes.data) ?? []
      setTiers(Array.isArray(tiersData) ? tiersData : [])
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load billing')
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function handleSubscribe(price: PriceRow, tier: TierRow) {
    if (!price.stripePriceId) {
      setError(
        t(
          'billing.error.noPrice',
          {},
          { defaultValue: 'This price is not configured for purchase yet.' },
        ),
      )
      return
    }
    setActionPending(price.stripePriceId)
    setError(null)
    setMessage(null)
    try {
      const res = await http.post<CheckoutResponse>('/api/billing/checkout', {
        priceId: price.stripePriceId,
      })
      const body = res.data as CheckoutResponse
      if (body?.checkoutUrl) {
        window.location.href = body.checkoutUrl
        return
      }
      if (body?.updated) {
        setMessage(
          t(
            'billing.upgraded',
            { plan: tier.name },
            { defaultValue: 'Updated to {{plan}} — limits applied immediately.' },
          ),
        )
        await refresh()
      } else {
        setError(
          t(
            'billing.error.unknown',
            {},
            { defaultValue: 'Checkout did not return a session URL.' },
          ),
        )
      }
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
          (err as Error).message ??
          'Failed to start checkout',
      )
    } finally {
      setActionPending(null)
    }
  }

  async function handleCancel() {
    if (!status || status.isFree) return
    setActionPending('cancel')
    setError(null)
    setMessage(null)
    try {
      await http.post('/api/billing/cancel', {})
      setMessage(t('nav.subscriptionCancelled', {}, { defaultValue: 'Subscription cancelled.' }))
      await refresh()
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
          (err as Error).message ??
          'Failed to cancel',
      )
    } finally {
      setActionPending(null)
    }
  }

  const planLimits = status?.limits ?? {}
  const planLabel = status ? `${status.name} · ${status.category}` : '—'
  const enrichedTiers = useMemo(
    () =>
      tiers.map((tier) => ({
        ...tier,
        isCurrent: status
          ? status.category === tier.key || status.planKey.toLowerCase().includes(tier.key)
          : false,
      })),
    [tiers, status],
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <header>
        <p className="text-[10px] font-black uppercase tracking-widest text-primary">
          {t('nav.subscription', {}, { defaultValue: 'Subscription' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 2),
            cm.textSize('4xl'),
            'font-extrabold tracking-tight text-on-surface',
          )}
          data-test="billing-title"
        >
          {t('billing.heading', {}, { defaultValue: 'Plans, limits, and invoices' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), 'font-medium text-on-surface-variant')}>
          {t(
            'billing.subheading',
            { plan: planLabel },
            { defaultValue: 'You are currently on the {{plan}} plan.' },
          )}
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          data-test="billing-error"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border border-error/30 bg-error/5 text-error text-sm font-semibold',
          )}
        >
          {error}
        </div>
      ) : null}
      {message ? (
        <div
          role="status"
          data-test="billing-message"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border border-success/30 bg-success/5 text-success text-sm font-semibold',
          )}
        >
          {message}
        </div>
      ) : null}

      <div className={cm.grid({ cols: 4, gap: 'md' })}>
        <QuorumKpiCard
          icon="payments"
          tone="primary"
          label={t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
          value={status?.name ?? '—'}
          hint={
            status?.isFree
              ? t('billing.kpi.planFree', {}, { defaultValue: 'Upgrade to remove limits.' })
              : t('billing.kpi.planActive', {}, { defaultValue: 'Active.' })
          }
        />
        <QuorumKpiCard
          icon="ballot"
          tone="accent"
          label={t('billing.kpi.maxPolls', {}, { defaultValue: 'Polls allowed' })}
          value={String(planLimits.maxPolls ?? '—')}
        />
        <QuorumKpiCard
          icon="check_circle"
          tone="warning"
          label={t('billing.kpi.exports', {}, { defaultValue: 'Exports' })}
          value={
            planLimits.canExport
              ? t('billing.kpi.exportsYes', {}, { defaultValue: 'Enabled' })
              : t('billing.kpi.exportsNo', {}, { defaultValue: 'Disabled' })
          }
        />
        <QuorumKpiCard
          icon="schedule"
          tone="navy"
          label={t('billing.kpi.retention', {}, { defaultValue: 'Retention (days)' })}
          value={
            planLimits.retentionDays === 0
              ? t('billing.kpi.retentionUnlimited', {}, { defaultValue: 'Unlimited' })
              : String(planLimits.retentionDays ?? '—')
          }
        />
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <header className={cm.sp('mb', 5)}>
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            {t('billing.plansEyebrow', {}, { defaultValue: 'Choose a plan' })}
          </p>
          <h2
            className={cm.cn(
              cm.textSize('lg'),
              'font-extrabold tracking-tight text-on-surface mt-1',
            )}
          >
            {t('billing.plansHeading', {}, { defaultValue: 'Free, Pro, and Team' })}
          </h2>
        </header>
        {loading ? (
          <p className="text-on-surface-variant text-sm" data-test="billing-loading">
            {t('nav.loadingPlans', {}, { defaultValue: 'Loading plans…' })}
          </p>
        ) : (
          <div className={cm.grid({ cols: 3, gap: 'md' })} data-test="billing-tiers">
            {enrichedTiers.map((tier) => (
              <div
                key={tier.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl border transition-all',
                  tier.isCurrent
                    ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary border-primary shadow-md shadow-primary/20'
                    : 'bg-surface-container-lowest border-outline-variant/20 hover:-translate-y-0.5 hover:shadow-md',
                )}
                data-test={`billing-tier-${tier.key}`}
              >
                <p
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest',
                    tier.isCurrent ? 'text-on-primary/80' : 'text-on-surface-variant',
                  )}
                >
                  {tier.name}
                </p>
                <ul className={cm.cn(cm.sp('mt', 4), cm.stack(2))}>
                  {tier.prices.map((p) => (
                    <li
                      key={`${tier.key}-${p.period}-${p.price}`}
                      className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}
                    >
                      <div>
                        <p
                          className={cm.cn(
                            cm.textSize('lg'),
                            'font-extrabold tabular-nums',
                            tier.isCurrent ? 'text-on-primary' : 'text-on-surface',
                          )}
                        >
                          {p.price}
                        </p>
                        <p
                          className={cm.cn(
                            'text-[10px] font-black uppercase tracking-widest',
                            tier.isCurrent ? 'text-on-primary/70' : 'text-on-surface-variant',
                          )}
                        >
                          {p.period}
                        </p>
                      </div>
                      {tier.key !== 'free' && p.stripePriceId ? (
                        <button
                          type="button"
                          onClick={() => void handleSubscribe(p, tier)}
                          disabled={actionPending === p.stripePriceId}
                          className={cm.cn(
                            'px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50',
                            tier.isCurrent
                              ? 'bg-surface/20 text-on-primary'
                              : 'bg-primary/10 text-primary hover:bg-primary/20',
                          )}
                          data-test={`billing-buy-${tier.key}-${p.period}`}
                        >
                          {actionPending === p.stripePriceId
                            ? t('common.startingEllipsis', {}, { defaultValue: 'Starting…' })
                            : tier.isCurrent
                              ? t('billing.switch', {}, { defaultValue: 'Switch' })
                              : t('settings.upgrade', {}, { defaultValue: 'Upgrade' })}
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <ul
                  className={cm.cn(
                    cm.sp('mt', 4),
                    cm.stack(1),
                    cm.textSize('xs'),
                    tier.isCurrent ? 'text-on-primary/90' : 'text-on-surface-variant',
                  )}
                >
                  <li>
                    {t(
                      'billing.feature.maxPolls',
                      { count: tier.limits.maxPolls ?? '—' },
                      { defaultValue: 'Polls: {{count}}' },
                    )}
                  </li>
                  <li>
                    {tier.limits.canExport
                      ? t('billing.feature.exportYes', {}, { defaultValue: 'CSV/JSON exports' })
                      : t('billing.feature.exportNo', {}, { defaultValue: 'No exports' })}
                  </li>
                  <li>
                    {tier.limits.advancedFeatures
                      ? t('common.advancedFeatures', {}, { defaultValue: 'Advanced features' })
                      : t('billing.feature.advNo', {}, { defaultValue: 'Core features only' })}
                  </li>
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {!status?.isFree ? (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
        >
          <header className={cm.sp('mb', 4)}>
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              {t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('lg'),
                'font-extrabold tracking-tight text-on-surface mt-1',
              )}
            >
              {t('billing.cancelHeading', {}, { defaultValue: 'Downgrade to Free' })}
            </h2>
          </header>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'billing.cancelBody',
              {},
              {
                defaultValue:
                  'Cancelling keeps your data — you simply lose access to paid features.',
              },
            )}
          </p>
          <ConfirmButton
            label={t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
            confirmLabel={t(
              'billing.confirmCancel',
              {},
              {
                defaultValue:
                  'Cancel your subscription? Your plan will revert to Free at the end of the billing period.',
              },
            )}
            pendingLabel={t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })}
            onConfirm={handleCancel}
            disarmSeconds={8}
            disabled={actionPending === 'cancel'}
            color="error"
            variant="outline"
            size="sm"
            className={cm.sp('mt', 4)}
            data-test="billing-cancel"
          />
        </section>
      ) : null}
    </div>
  )
}
