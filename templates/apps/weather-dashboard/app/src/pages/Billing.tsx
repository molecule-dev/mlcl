import { useCallback, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

interface WeatherLimits {
  maxLocations?: number
  maxAlerts?: number
  maxForecasts?: number
  maxHistory?: number
  advancedFeatures?: boolean
  canExport?: boolean
  retentionDays?: number
}

interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
  limits: WeatherLimits
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
  limits: WeatherLimits
}

interface CheckoutResponse {
  checkoutUrl?: string
  updated?: boolean
}

function unwrap<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== 'object') return null
  const wrapped = payload as { data?: unknown; error?: unknown }
  if (wrapped.error) return null
  if ('data' in wrapped && wrapped.data !== undefined) return wrapped.data as T
  return payload as T
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
      const statusBody = unwrap<BillingStatus>(statusRes.data ?? statusRes)
      const tiersBody = unwrap<TierRow[]>(tiersRes.data ?? tiersRes)
      setStatus(statusBody)
      setTiers(Array.isArray(tiersBody) ? tiersBody : [])
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
          {
            defaultValue: 'This price is not configured for purchase yet.',
          },
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
      const body = (res.data ?? res) as CheckoutResponse
      if (body?.checkoutUrl) {
        // Conversion-funnel point: the user is leaving for Stripe.
        track({
          name: 'billing.checkout_started',
          properties: { tier: tier.key, period: price.period, price_id: price.stripePriceId },
        })
        window.location.href = body.checkoutUrl
        return
      }
      if (body?.updated) {
        track({ name: 'billing.plan_updated', properties: { tier: tier.key, status: 'updated' } })
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
      const errorObj = err as { response?: { data?: { error?: string } }; message?: string }
      setError(errorObj.response?.data?.error ?? errorObj.message ?? 'Failed to start checkout')
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
      track({
        name: 'billing.subscription_cancelled',
        properties: { tier: status.planKey, status: 'cancelled' },
      })
      setMessage(t('nav.subscriptionCancelled', {}, { defaultValue: 'Subscription cancelled.' }))
      await refresh()
    } catch (err) {
      const errorObj = err as { response?: { data?: { error?: string } }; message?: string }
      setError(errorObj.response?.data?.error ?? errorObj.message ?? 'Failed to cancel')
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
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('nav.subscription', {}, { defaultValue: 'Subscription' })}
        </p>
        <h1
          className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}
          data-test="billing-title"
        >
          {t('billing.heading', {}, { defaultValue: 'Plans, limits, and invoices' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant max-w-xl')}>
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

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-2 lg:grid-cols-4')}>
        <BillingKpi
          icon="payments"
          label={t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
          value={status?.name ?? '—'}
          hint={
            status?.isFree
              ? t('billing.kpi.planFree', {}, { defaultValue: 'Upgrade to remove limits.' })
              : t('billing.kpi.planActive', {}, { defaultValue: 'Active.' })
          }
        />
        <BillingKpi
          icon="location_on"
          label={t('billing.kpi.maxLocations', {}, { defaultValue: 'Locations' })}
          value={String(planLimits.maxLocations ?? '—')}
        />
        <BillingKpi
          icon="warning"
          label={t('billing.kpi.maxAlerts', {}, { defaultValue: 'Active alerts' })}
          value={String(planLimits.maxAlerts ?? '—')}
        />
        <BillingKpi
          icon="schedule"
          label={t('billing.kpi.retention', {}, { defaultValue: 'History (days)' })}
          value={
            planLimits.retentionDays === 0
              ? t('billing.kpi.retentionUnlimited', {}, { defaultValue: 'Unlimited' })
              : String(planLimits.retentionDays ?? '—')
          }
        />
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <header className={cm.sp('mb', 5)}>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('billing.plansEyebrow', {}, { defaultValue: 'Choose a plan' })}
          </p>
          <h2
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'tracking-tight mt-1 text-on-surface',
            )}
          >
            {t('billing.plansHeading', {}, { defaultValue: 'Free, Pro, and Team' })}
          </h2>
        </header>
        {loading ? (
          <p
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
            data-test="billing-loading"
          >
            {t('nav.loadingPlans', {}, { defaultValue: 'Loading plans…' })}
          </p>
        ) : (
          <div
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}
            data-test="billing-tiers"
          >
            {enrichedTiers.map((tier) => (
              <article
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
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest',
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
                            cm.fontWeight('bold'),
                            'tabular-nums',
                            tier.isCurrent ? 'text-on-primary' : 'text-on-surface',
                          )}
                        >
                          {p.price}
                        </p>
                        <p
                          className={cm.cn(
                            cm.fontWeight('bold'),
                            'text-[10px] uppercase tracking-widest',
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
                            cm.sp('px', 3),
                            cm.sp('py', 2),
                            cm.fontWeight('bold'),
                            'rounded-lg text-xs uppercase tracking-widest transition-colors disabled:opacity-50',
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
                      'billing.feature.maxLocations',
                      { count: tier.limits.maxLocations ?? '—' },
                      { defaultValue: 'Locations: {{count}}' },
                    )}
                  </li>
                  <li>
                    {t(
                      'billing.feature.maxAlerts',
                      { count: tier.limits.maxAlerts ?? '—' },
                      { defaultValue: 'Alerts: {{count}}' },
                    )}
                  </li>
                  <li>
                    {tier.limits.canExport
                      ? t('billing.feature.exportYes', {}, { defaultValue: 'CSV / JSON exports' })
                      : t('billing.feature.exportNo', {}, { defaultValue: 'No exports' })}
                  </li>
                  <li>
                    {tier.limits.advancedFeatures
                      ? t('billing.feature.advYes', {}, { defaultValue: 'Advanced radar layers' })
                      : t('billing.feature.advNo', {}, { defaultValue: 'Core forecast only' })}
                  </li>
                  <li>
                    {tier.limits.retentionDays === 0
                      ? t(
                          'billing.feature.retentionUnlimited',
                          {},
                          { defaultValue: 'Unlimited history' },
                        )
                      : t(
                          'billing.feature.retentionDays',
                          { count: tier.limits.retentionDays ?? '—' },
                          { defaultValue: '{{count}} days history' },
                        )}
                  </li>
                </ul>
              </article>
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
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                'tracking-tight mt-1 text-on-surface',
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
            onConfirm={handleCancel}
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
            disarmSeconds={8}
            className={cm.cn(
              cm.sp('mt', 4),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-error/10 hover:text-error text-sm disabled:opacity-50',
            )}
            data-test="billing-cancel"
          />
        </section>
      ) : null}
    </div>
  )
}

interface BillingKpiProps {
  icon: string
  label: string
  value: string
  hint?: string
}

function BillingKpi({ icon, label, value, hint }: BillingKpiProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        cm.stack(1),
        'rounded-2xl bg-surface-container-lowest',
        cm.accentCard({ tone: 'primary' }),
      )}
    >
      <span
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.accentCardLabel({ tone: 'primary' }),
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-primary', cm.textSize('base'))}
          aria-hidden="true"
        >
          {icon}
        </span>
        {label}
      </span>
      <span
        className={cm.cn(cm.fontWeight('bold'), cm.textSize('2xl'), 'tabular-nums tracking-tight')}
      >
        {value}
      </span>
      {hint ? (
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{hint}</span>
      ) : null}
    </div>
  )
}
