import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatusPill } from '../components/StatusPill.js'

interface PriceRow {
  period: 'month' | 'year'
  price: string
  stripePriceId: string | null
}

interface TierRow {
  key: string
  name: string
  prices: PriceRow[]
  limits: {
    maxDrafts: number
    maxTemplates: number
    advancedFeatures: boolean
    canExport: boolean
    retentionDays: number
  }
}

interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
  limits: TierRow['limits']
}

interface CheckoutResponse {
  checkoutUrl?: string
  updated?: boolean
}

const FEATURE_LABELS: Array<{ key: keyof TierRow['limits']; label: string }> = [
  { key: 'maxDrafts', label: 'Drafts allowed' },
  { key: 'maxTemplates', label: 'Templates allowed' },
  { key: 'advancedFeatures', label: 'Advanced AI features' },
  { key: 'canExport', label: 'Export your data' },
  { key: 'retentionDays', label: 'Retention (days)' },
]

function formatLimit(value: number | boolean): string {
  if (typeof value === 'boolean') return value ? '✓' : '—'
  if (value === 0) return 'Unlimited'
  if (value >= 999_999) return 'Unlimited'
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

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const [tiersResp, statusResp] = await Promise.all([
          http.get<{ data: TierRow[] }>('/billing/tiers'),
          http.get<BillingStatus>('/billing/status').catch(() => null),
        ])
        if (cancelled) return
        const tierData = (tiersResp.data?.data ?? []) as TierRow[]
        setTiers(tierData)
        if (statusResp) setStatus(statusResp.data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load billing')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http])

  const handleUpgrade = async (priceId: string | null) => {
    if (!priceId) return
    setPendingPriceId(priceId)
    setActionMessage(null)
    setError(null)
    try {
      const resp = await http.post<CheckoutResponse>('/billing/checkout', { priceId })
      if (resp.data.checkoutUrl) {
        if (typeof window !== 'undefined') window.location.href = resp.data.checkoutUrl
        setActionMessage(
          t('billing.redirecting', {}, { defaultValue: 'Redirecting to Stripe checkout…' }),
        )
      } else if (resp.data.updated) {
        setActionMessage(
          t('nav.subscriptionUpdated', {}, { defaultValue: 'Subscription updated.' }),
        )
        // Refresh status
        const fresh = await http.get<BillingStatus>('/billing/status').catch(() => null)
        if (fresh) setStatus(fresh.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout')
    } finally {
      setPendingPriceId(null)
    }
  }

  const handleCancel = async () => {
    setPendingPriceId('cancel')
    setActionMessage(null)
    setError(null)
    try {
      await http.post('/billing/cancel', {})
      setActionMessage(
        t('nav.subscriptionCancelled', {}, { defaultValue: 'Subscription cancelled.' }),
      )
      const fresh = await http.get<BillingStatus>('/billing/status').catch(() => null)
      if (fresh) setStatus(fresh.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel subscription')
    } finally {
      setPendingPriceId(null)
    }
  }

  const currentTierKey = status?.category ?? 'free'

  const sortedTiers = useMemo(() => {
    const order = ['free', 'pro', 'team']
    return tiers.slice().sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
  }, [tiers])

  return (
    <div
      data-mol-id="billing-page"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), 'mx-auto', cm.stack(8))}
    >
      <header>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tighter')}>
          {t('billing.heading', {}, { defaultValue: 'Plans & billing' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'billing.subheading',
            {},
            { defaultValue: 'Pick the plan that matches how you send.' },
          )}
        </p>
      </header>

      {actionMessage && (
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
      )}
      {error && (
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
      )}

      <section
        data-mol-id="billing-current-plan"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
          cm.sp('p', 8),
          'rounded-3xl text-white relative overflow-hidden border border-secondary/40',
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 70%, #a78bfa) 100%)',
          boxShadow: '0 16px 48px color-mix(in srgb, var(--color-primary) 25%, transparent)',
        }}
      >
        <div
          className={cm.cn('absolute -right-16 -bottom-16 w-64 h-64 rounded-full blur-3xl')}
          style={{ background: 'color-mix(in srgb, var(--color-secondary) 45%, transparent)' }}
          aria-hidden="true"
        />
        <div className={cm.cn('flex-1 relative z-10')}>
          <p
            className={cm.cn('text-[10px] font-black uppercase tracking-widest text-white/70 mb-2')}
          >
            {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
          </p>
          <h2
            data-mol-id="billing-current-plan-name"
            className={cm.cn('text-4xl font-extrabold tracking-tighter')}
          >
            {status?.name ?? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-white/85 max-w-md')}>
            {status?.isFree
              ? t(
                  'billing.freeBlurb',
                  {},
                  { defaultValue: 'You are on the Free plan. Upgrade for unlimited sends.' },
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
            style={{
              border: '1px solid color-mix(in srgb, var(--color-secondary) 45%, transparent)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
              workspace_premium
            </span>
            {status?.name ?? '…'}
          </span>
          {!status?.isFree && (
            <button
              type="button"
              data-mol-id="billing-cancel"
              onClick={handleCancel}
              disabled={pendingPriceId === 'cancel'}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl transition-all hover:shadow-md disabled:opacity-50',
              )}
              style={{ background: 'var(--color-secondary)', color: 'var(--color-on-secondary)' }}
            >
              {pendingPriceId === 'cancel'
                ? t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })
                : t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
            </button>
          )}
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
            {t('nav.loadingPlans', {}, { defaultValue: 'Loading plans…' })}
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
                  'rounded-2xl shadow-sm border transition-all flex flex-col',
                  isCurrent
                    ? 'border-secondary bg-surface-container-lowest'
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
                  {isCurrent && (
                    <StatusPill
                      status="ai-generated"
                      label={t('billing.currentBadge', {}, { defaultValue: 'Current' })}
                      icon="check_circle"
                    />
                  )}
                </div>
                <p className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tighter')}>
                  {monthly?.price ?? '—'}
                </p>
                <ul
                  data-mol-id={`billing-plan-${plan.key}-features`}
                  className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('my', 4))}
                >
                  {FEATURE_LABELS.map(({ key, label }) => (
                    <li
                      key={key}
                      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-base text-secondary')}
                        aria-hidden="true"
                      >
                        check_circle
                      </span>
                      <span className={cm.cn('flex-1')}>
                        {t(`billing.feature.${key}`, {}, { defaultValue: label })}
                      </span>
                      <span className={cm.cn('font-bold tabular-nums text-on-surface-variant')}>
                        {formatLimit(plan.limits[key])}
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
                        : 'text-white hover:shadow-md',
                  )}
                  style={
                    !isCurrent && upgradePriceId
                      ? {
                          background:
                            'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #a78bfa))',
                        }
                      : undefined
                  }
                >
                  {isCurrent
                    ? t('billing.currentBadge', {}, { defaultValue: 'Current plan' })
                    : !upgradePriceId
                      ? t('billing.unavailable', {}, { defaultValue: 'Contact sales' })
                      : pendingPriceId === upgradePriceId
                        ? t('billing.starting', {}, { defaultValue: 'Starting checkout…' })
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
export { Billing as BillingPage }
