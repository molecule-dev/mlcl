import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface PriceRow {
  period: 'month' | 'year'
  price: string
  stripePriceId: string | null
}

interface TierLimits {
  maxMeters: number
  maxReadings: number
  maxAlerts: number
  maxCosts: number
  retentionDays: number
}

interface TierRow {
  key: string
  name: string
  prices: PriceRow[]
  limits: TierLimits
}

interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
  limits: TierLimits
}

interface CheckoutResponse {
  checkoutUrl?: string
  updated?: boolean
}

const FEATURE_LABELS: Array<{ key: keyof TierLimits; label: string; format?: 'days' }> = [
  { key: 'maxMeters', label: 'Meters' },
  { key: 'maxReadings', label: 'Readings / month' },
  { key: 'maxAlerts', label: 'Alert rules' },
  { key: 'maxCosts', label: 'Rate plans' },
  { key: 'retentionDays', label: 'History retention', format: 'days' },
]

function formatLimit(value: number | boolean | undefined, format?: 'days'): string {
  if (value === undefined || value === null) return '—'
  if (typeof value === 'boolean') return value ? '✓' : '—'
  if (value === 0) return 'Unlimited'
  if (value >= 999_999) return 'Unlimited'
  if (format === 'days') {
    if (value % 365 === 0) {
      const years = value / 365
      return years === 1 ? '1 year' : `${years} years`
    }
    return `${value.toLocaleString()} days`
  }
  return value.toLocaleString()
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [tiers, setTiers] = useState<TierRow[]>([])
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingPriceId, setPendingPriceId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  async function refreshStatus(): Promise<void> {
    try {
      const fresh = await http.get<BillingStatus>('/api/billing/status')
      const data = unwrapSingle<BillingStatus>(fresh?.data)
      if (data) setStatus(data)
    } catch (_error) {
      // ignore — status endpoint optional, UI degrades gracefully without it
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const [tiersResp, statusResp] = await Promise.all([
          http.get<TierRow[]>('/api/billing/tiers'),
          http.get<BillingStatus>('/api/billing/status').catch(() => null),
        ])
        if (cancelled) return
        const tierData = unwrapList<TierRow>(tiersResp?.data)
        setTiers(tierData)
        if (statusResp) setStatus(unwrapSingle<BillingStatus>(statusResp.data))
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : t('billing.loadError', {}, { defaultValue: 'Could not load billing.' }),
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function handleUpgrade(priceId: string | null): Promise<void> {
    if (!priceId) return
    setPendingPriceId(priceId)
    setActionMessage(null)
    setError(null)
    try {
      const resp = await http.post<CheckoutResponse>('/api/billing/checkout', { priceId })
      const data = unwrapSingle<CheckoutResponse>(resp?.data) ?? {}
      if (data.checkoutUrl) {
        // Conversion funnel: the Stripe-hosted session opened. The
        // subscription itself is confirmed by the webhook → /billing.
        void track({ name: 'billing.checkout_started', properties: { price_id: priceId } })
        if (typeof window !== 'undefined') window.location.href = data.checkoutUrl
        setActionMessage(
          t('billing.redirecting', {}, { defaultValue: 'Redirecting to Stripe checkout\u2026' }),
        )
      } else if (data.updated) {
        setActionMessage(
          t('nav.subscriptionUpdated', {}, { defaultValue: 'Subscription updated.' }),
        )
        await refreshStatus()
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('nav.couldNotStartCheckout', {}, { defaultValue: 'Could not start checkout.' }),
      )
    } finally {
      setPendingPriceId(null)
    }
  }

  async function handleCancel(): Promise<void> {
    setPendingPriceId('cancel')
    setActionMessage(null)
    setError(null)
    try {
      await http.post('/api/billing/cancel', {})
      setActionMessage(
        t('nav.subscriptionCancelled', {}, { defaultValue: 'Subscription cancelled.' }),
      )
      await refreshStatus()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('billing.cancelError', {}, { defaultValue: 'Could not cancel subscription.' }),
      )
    } finally {
      setPendingPriceId(null)
    }
  }

  const currentTierKey = status?.category ?? status?.planKey ?? 'free'

  const sortedTiers = useMemo(() => {
    const order = ['free', 'home', 'pro', 'team']
    return tiers.slice().sort((a, b) => {
      const ai = order.indexOf(a.key)
      const bi = order.indexOf(b.key)
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
    })
  }, [tiers])

  return (
    <div
      data-mol-id="billing-page"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}
    >
      <div>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tighter')}>
          {t('billing.heading', {}, { defaultValue: 'Plans & billing' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'billing.subheading',
            {},
            { defaultValue: 'Pick the plan that matches how much you meter.' },
          )}
        </p>
      </div>

      {actionMessage ? (
        <div
          data-mol-id="billing-action-status"
          role="status"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-lg bg-success/10 text-success',
          )}
        >
          {actionMessage}
        </div>
      ) : null}
      {error ? (
        <div
          data-mol-id="billing-error"
          role="alert"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-lg bg-error-container text-on-error-container',
          )}
        >
          {error}
        </div>
      ) : null}

      <section
        data-mol-id="billing-current-plan"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
          cm.sp('p', 8),
          'rounded-3xl text-white relative overflow-hidden bg-gradient-to-br from-primary to-primary-container',
        )}
      >
        <div
          className={cm.cn(
            'absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div className={cm.cn('flex-1 relative z-10')}>
          <p
            className={cm.cn('text-[10px] font-black uppercase tracking-widest text-white/80 mb-2')}
          >
            {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
          </p>
          <h2
            data-mol-id="billing-current-plan-name"
            className={cm.cn('text-4xl font-extrabold tracking-tighter')}
          >
            {status?.name ?? t('billing.loadingPlan', {}, { defaultValue: 'Loading\u2026' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-white/85 max-w-md')}>
            {status?.isFree
              ? t(
                  'billing.freeBlurb',
                  {},
                  {
                    defaultValue:
                      'You are on the Free plan. Upgrade for more meters, longer history, and more alert rules.',
                  },
                )
              : t(
                  'billing.activeBlurb',
                  {},
                  { defaultValue: 'Your subscription is active. Manage it any time.' },
                )}
          </p>
        </div>
        <div className={cm.cn('relative z-10 flex flex-col items-end gap-3')}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface/20 backdrop-blur-md text-white uppercase tracking-widest',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
              workspace_premium
            </span>
            {status?.name ?? '\u2026'}
          </span>
          {status && !status.isFree ? (
            <button
              type="button"
              data-mol-id="billing-cancel"
              onClick={() => void handleCancel()}
              disabled={pendingPriceId === 'cancel'}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl bg-surface text-on-surface hover:shadow-md disabled:opacity-50',
              )}
            >
              {pendingPriceId === 'cancel'
                ? t('billing.cancelling', {}, { defaultValue: 'Cancelling\u2026' })
                : t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
            </button>
          ) : null}
        </div>
      </section>

      <section
        data-mol-id="billing-plan-grid"
        className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}
      >
        {loading ? (
          <p
            data-mol-id="billing-plans-loading"
            className={cm.cn(cm.textSize('sm'), cm.sp('py', 4), 'text-on-surface-variant')}
          >
            {t('billing.loading', {}, { defaultValue: 'Loading plans\u2026' })}
          </p>
        ) : sortedTiers.length === 0 ? (
          <p
            data-mol-id="billing-plans-empty"
            className={cm.cn(cm.textSize('sm'), cm.sp('py', 4), 'text-on-surface-variant')}
          >
            {t('billing.plansEmpty', {}, { defaultValue: 'No plans configured yet.' })}
          </p>
        ) : (
          sortedTiers.map((plan) => {
            const isCurrent = plan.key === currentTierKey
            const monthly = plan.prices.find((p) => p.period === 'month')
            const upgradePriceId = monthly?.stripePriceId ?? null
            return (
              <div
                key={plan.key}
                data-mol-id={`billing-plan-${plan.key}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl border transition-all flex flex-col',
                  isCurrent
                    ? 'border-primary bg-surface-container-lowest'
                    : 'border-outline-variant/40 bg-surface-container-lowest hover:-translate-y-0.5 hover:shadow-md',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 2),
                  )}
                >
                  <p
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t(`billing.plan.${plan.key}.name`, {}, { defaultValue: plan.name })}
                  </p>
                  {isCurrent ? (
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.roundedFull,
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest bg-primary text-on-primary',
                      )}
                    >
                      {t('billing.currentBadge', {}, { defaultValue: 'Current' })}
                    </span>
                  ) : null}
                </div>
                <p
                  data-mol-id={`billing-plan-${plan.key}-price`}
                  className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tighter')}
                >
                  {monthly?.price ?? '\u2014'}
                </p>
                <ul
                  data-mol-id={`billing-plan-${plan.key}-features`}
                  className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('my', 4))}
                >
                  {FEATURE_LABELS.map(({ key, label, format }) => (
                    <li
                      key={key}
                      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-base text-primary')}
                        aria-hidden="true"
                      >
                        check_circle
                      </span>
                      <span className={cm.cn('flex-1')}>
                        {t(`billing.feature.${key}`, {}, { defaultValue: label })}
                      </span>
                      <span className={cm.cn('font-bold tabular-nums text-on-surface-variant')}>
                        {formatLimit(plan.limits[key], format)}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  data-mol-id={`billing-plan-${plan.key}-cta`}
                  disabled={isCurrent || !upgradePriceId || pendingPriceId === upgradePriceId}
                  onClick={() => void handleUpgrade(upgradePriceId)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'rounded-xl mt-auto transition-all',
                    isCurrent
                      ? 'bg-surface-container text-on-surface-variant cursor-default'
                      : !upgradePriceId
                        ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                        : 'bg-primary text-on-primary hover:bg-primary/90',
                  )}
                >
                  {isCurrent
                    ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
                    : !upgradePriceId
                      ? t('billing.unavailable', {}, { defaultValue: 'Contact sales' })
                      : pendingPriceId === upgradePriceId
                        ? t('billing.starting', {}, { defaultValue: 'Starting checkout\u2026' })
                        : t(
                            `billing.plan.${plan.key}.cta`,
                            {},
                            { defaultValue: `Switch to ${plan.name}` },
                          )}
                </button>
              </div>
            )
          })
        )}
      </section>

      <section
        data-mol-id="billing-history-section"
        className={cm.cn(
          cm.sp('p', 8),
          'bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/40',
        )}
      >
        <h2 className={cm.cn(cm.textSize('xl'), cm.sp('mb', 4), 'font-bold tracking-tight')}>
          {t('billing.historyHeading', {}, { defaultValue: 'Invoice history' })}
        </h2>
        <p
          data-mol-id="billing-history-empty"
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
        >
          {t(
            'billing.historyEmpty',
            {},
            { defaultValue: 'Paid invoices will appear here once your subscription bills.' },
          )}
        </p>
      </section>
    </div>
  )
}

export default Billing
