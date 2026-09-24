import { useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { getClient as getHttpClient } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { BRAND_COLOR } from '../branding.js'
import { DeliverySparkline } from '../components/DeliverySparkline.js'
import { MetricStatCard } from '../components/MetricStatCard.js'
import { StatusPill } from '../components/StatusPill.js'
import { useApi } from '../lib/useApi.js'
import { SettingsTabs } from './Settings.js'

const PANEL_BG = 'var(--mol-color-surface)'
const PANEL_BORDER = 'var(--mol-color-border)'

interface BillingStatus {
  planKey: string
  category: 'free' | 'pro' | 'team' | string
  name: string
  limits: {
    maxDeliveries: number
    maxEvents: number
    maxWebhooks: number
    advancedFeatures: boolean
    canExport: boolean
    retentionDays: number
  }
  isFree: boolean
}

interface PricingTier {
  key: string
  name: string
  prices: Array<{
    period: 'month' | 'year'
    price: string
    stripePriceId: string | null
  }>
  limits: BillingStatus['limits']
}

interface ApiDelivery {
  id: string
  delivered_at: string | null
  created_at: string
}

interface ApiWebhook {
  id: string
  is_active: boolean
}

const buildUsageTrend = (deliveries: ApiDelivery[]): number[] => {
  const buckets = Array.from({ length: 30 }, () => 0)
  const now = Date.now()
  for (const d of deliveries) {
    const ts = new Date(d.delivered_at ?? d.created_at).getTime()
    const ageDays = Math.floor((now - ts) / 86_400_000)
    if (ageDays < 0 || ageDays >= 30) continue
    buckets[29 - ageDays] += 1
  }
  return buckets
}

const fmtCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`
  return String(n)
}

const fmtLimit = (n: number): string => {
  if (n >= 999_999) return '∞'
  return fmtCount(n)
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { data: status, refetch: refetchStatus } = useApi<BillingStatus>('/billing/status')
  const { data: tiersResp } = useApi<{ data: PricingTier[] }>('/billing/tiers')
  const { data: deliveriesData } = useApi<ApiDelivery[]>('/deliveries?limit=500')
  // webhooks list caps limit at 200 (zod .max(200) server-side) — 400s on 500.
  const { data: webhooksData } = useApi<ApiWebhook[]>('/webhooks?limit=200')

  const [showPlans, setShowPlans] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'month' | 'year'>('month')

  const deliveries = useMemo(() => deliveriesData ?? [], [deliveriesData])
  const webhooks = useMemo(() => webhooksData ?? [], [webhooksData])
  const tiers = tiersResp?.data ?? []
  const usageTrend = useMemo(() => buildUsageTrend(deliveries), [deliveries])

  const totalDelivered = deliveries.length
  const activeEndpoints = webhooks.filter((w) => w.is_active).length
  const limits = status?.limits

  const monthlyDelivered = useMemo(() => {
    const cutoff = Date.now() - 30 * 86_400_000
    return deliveries.filter((d) => new Date(d.delivered_at ?? d.created_at).getTime() >= cutoff)
      .length
  }, [deliveries])
  const usagePct =
    limits && limits.maxDeliveries > 0
      ? Math.min(
          100,
          Math.round((monthlyDelivered / Math.min(limits.maxDeliveries, 999_998)) * 100),
        )
      : 0

  const planLabel = status?.name ?? '—'

  const subscribe = async (priceId: string) => {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const client = getHttpClient()
      const res = await client.post<{ checkoutUrl?: string; updated?: boolean }>(
        '/billing/checkout',
        { priceId },
      )
      const data = res.data
      if (data?.checkoutUrl) {
        track({ name: 'billing.checkout_started', properties: { price_id: priceId } })
        window.location.href = data.checkoutUrl
        return
      }
      if (data?.updated) {
        track({ name: 'billing.plan_updated', properties: { price_id: priceId } })
        setShowPlans(false)
        refetchStatus()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const cancelPlan = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const client = getHttpClient()
      await client.post('/billing/cancel', {})
      refetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={cm.cn(cm.sp('p', 6), 'max-w-5xl mx-auto')}
      style={{ color: 'var(--mol-color-text)' }}
      data-mol-id="billing-root"
    >
      <div className={cm.cn('mb-6')}>
        <p
          className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
          style={{ color: BRAND_COLOR }}
        >
          {t('billing.eyebrow', {}, { defaultValue: 'workspace · subscription' })}
        </p>
        <h1
          className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
          style={{ color: 'var(--mol-color-text)' }}
        >
          {t('settings.billing', {}, { defaultValue: 'Billing' })}
        </h1>
        <p
          className={cm.cn('mt-2 text-sm max-w-xl')}
          style={{ color: 'var(--mol-color-text-secondary)' }}
        >
          {t('billing.body', {}, { defaultValue: 'Plan, usage, and payment methods.' })}
        </p>
      </div>

      <SettingsTabs active="billing" />

      {error && (
        <p
          className={cm.cn('mb-4 text-xs font-mono')}
          style={{ color: 'var(--mol-color-error)' }}
          role="alert"
        >
          {error}
        </p>
      )}

      <section
        className={cm.cn('rounded-2xl p-6 mb-6 relative overflow-hidden')}
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)',
          boxShadow: '0 30px 80px -30px rgba(16, 185, 129, 0.45)',
        }}
        data-mol-id="billing-current-plan"
      >
        <div
          className={cm.cn('absolute -right-20 -top-20 w-64 h-64 rounded-full pointer-events-none')}
          style={{ backgroundColor: 'rgba(255,255,255,0.10)', filter: 'blur(60px)' }}
          aria-hidden="true"
        />
        <div className={cm.cn('relative flex items-end justify-between flex-wrap gap-4')}>
          <div>
            <p
              className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              {t('billing.currentPlanEyebrow', {}, { defaultValue: 'current plan' })}
            </p>
            <div className={cm.cn('mt-2 flex items-baseline gap-3 flex-wrap')}>
              <span
                className={cm.cn('text-4xl font-extrabold tracking-tighter')}
                style={{ color: '#f8fafc' }}
                data-mol-id="billing-plan-name"
              >
                {planLabel}
              </span>
              <StatusPill status="live" label={status?.isFree ? 'FREE' : 'ACTIVE'} emphasis />
            </div>
            <p className={cm.cn('mt-2 text-sm')} style={{ color: 'rgba(255,255,255,0.85)' }}>
              {status?.isFree
                ? t(
                    'billing.freeBody',
                    {},
                    {
                      defaultValue:
                        "You're on the Free tier. Upgrade for higher limits and longer retention.",
                    },
                  )
                : t(
                    'billing.paidBody',
                    {},
                    { defaultValue: 'Auto-charge enabled. Cancel anytime.' },
                  )}
            </p>
          </div>
          <div className={cm.cn('flex items-center gap-2 flex-wrap')}>
            <button
              type="button"
              onClick={() => setShowPlans((v) => !v)}
              className={cm.cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono font-semibold text-sm transition-colors',
              )}
              style={{
                border: '1px solid rgba(255,255,255,0.4)',
                color: '#f8fafc',
              }}
              data-mol-id="billing-change-plan"
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                trending_up
              </span>
              {showPlans
                ? t('billing.hidePlans', {}, { defaultValue: 'Hide plans' })
                : t('billing.changePlan', {}, { defaultValue: 'Change plan' })}
            </button>
            {!status?.isFree && (
              <ConfirmButton
                label={
                  <>
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      cancel
                    </span>
                    {t('billing.cancel', {}, { defaultValue: 'Cancel plan' })}
                  </>
                }
                confirmLabel={t(
                  'billing.confirmCancel',
                  {},
                  {
                    defaultValue:
                      "Cancel your subscription? You'll be downgraded to Free at the end of the period.",
                  },
                )}
                onConfirm={cancelPlan}
                disarmSeconds={6}
                disabled={submitting}
                data-mol-id="billing-cancel-plan"
              />
            )}
          </div>
        </div>
      </section>

      {showPlans && tiers.length > 0 && (
        <section
          className={cm.cn('rounded-xl p-6 mb-6')}
          style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
          data-mol-id="billing-plans"
        >
          <div className={cm.cn('flex items-center justify-between mb-4 flex-wrap gap-3')}>
            <h2
              className={cm.cn('text-base font-extrabold tracking-tight')}
              style={{ color: 'var(--mol-color-text)' }}
            >
              {t('billing.choosePlan', {}, { defaultValue: 'Choose a plan' })}
            </h2>
            <div className={cm.cn('inline-flex rounded-md overflow-hidden')}>
              {(['month', 'year'] as const).map((p) => {
                const active = period === p
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={cm.cn(
                      'px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-widest',
                    )}
                    style={{
                      backgroundColor: active
                        ? 'color-mix(in srgb, var(--mol-color-primary) 15%, transparent)'
                        : 'transparent',
                      color: active
                        ? 'var(--mol-color-primary)'
                        : 'var(--mol-color-text-secondary)',
                      boxShadow: 'inset 0 0 0 1px var(--mol-color-border)',
                    }}
                    data-mol-id={`billing-period-${p}`}
                  >
                    {p === 'month'
                      ? t('status.monthly', {}, { defaultValue: 'Monthly' })
                      : t('billing.yearly', {}, { defaultValue: 'Yearly' })}
                  </button>
                )
              })}
            </div>
          </div>
          <div className={cm.cn('grid gap-4 grid-cols-1 md:grid-cols-3')}>
            {tiers.map((tier) => {
              const price = tier.prices.find((p) => p.period === period) ?? tier.prices[0]
              const isCurrent = (status?.category ?? 'free') === tier.key
              const canCheckout = price.stripePriceId && !isCurrent
              return (
                <div
                  key={tier.key}
                  className={cm.cn('rounded-xl p-5 flex flex-col')}
                  style={{
                    backgroundColor:
                      'color-mix(in srgb, var(--mol-color-background) 60%, transparent)',
                    border: `1px solid ${isCurrent ? 'color-mix(in srgb, var(--mol-color-primary) 40%, transparent)' : PANEL_BORDER}`,
                  }}
                  data-mol-id={`billing-tier-${tier.key}`}
                >
                  <p
                    className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                    style={{
                      color: isCurrent
                        ? 'var(--mol-color-primary)'
                        : 'var(--mol-color-text-secondary)',
                    }}
                  >
                    {tier.name}
                    {isCurrent ? ' · current' : ''}
                  </p>
                  <p
                    className={cm.cn('mt-2 text-2xl font-extrabold')}
                    style={{ color: 'var(--mol-color-text)' }}
                  >
                    {price.price}
                  </p>
                  <ul
                    className={cm.cn('mt-3 flex flex-col gap-1 text-xs')}
                    style={{ color: 'var(--mol-color-text-secondary)' }}
                  >
                    <li>{fmtLimit(tier.limits.maxWebhooks)} endpoints</li>
                    <li>{fmtLimit(tier.limits.maxDeliveries)} deliveries / mo</li>
                    <li>
                      {tier.limits.retentionDays === 0
                        ? 'Unlimited retention'
                        : `${tier.limits.retentionDays}-day retention`}
                    </li>
                    <li>{tier.limits.canExport ? 'Audit export' : 'No audit export'}</li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => price.stripePriceId && subscribe(price.stripePriceId)}
                    disabled={!canCheckout || submitting}
                    className={cm.cn(
                      'mt-4 px-4 py-2 rounded-md font-mono text-sm font-semibold disabled:opacity-50',
                    )}
                    style={{
                      backgroundColor: canCheckout ? BRAND_COLOR : 'transparent',
                      color: canCheckout
                        ? 'var(--color-on-primary)'
                        : 'var(--mol-color-text-secondary)',
                      border: canCheckout ? 'none' : '1px solid var(--mol-color-border)',
                    }}
                    data-mol-id={`billing-tier-subscribe-${tier.key}`}
                  >
                    {isCurrent
                      ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
                      : !price.stripePriceId
                        ? t('billing.unavailable', {}, { defaultValue: 'Unavailable' })
                        : t('billing.upgrade', {}, { defaultValue: 'Subscribe' })}
                  </button>
                </div>
              )
            })}
          </div>
          <p
            className={cm.cn('mt-4 text-xs font-mono')}
            style={{ color: 'var(--mol-color-text-tertiary)' }}
          >
            {t(
              'billing.checkoutHint',
              {},
              {
                defaultValue:
                  "Subscriptions are processed by Stripe. After checkout, you'll return here with your new plan active.",
              },
            )}
          </p>
        </section>
      )}

      <div className={cm.cn('grid gap-4 mb-6 grid-cols-1 sm:grid-cols-3')}>
        <MetricStatCard
          eyebrow={t('billing.metric.delivered', {}, { defaultValue: 'Delivered · 30d' })}
          value={fmtCount(monthlyDelivered)}
          unit={limits ? `/ ${fmtLimit(limits.maxDeliveries)}` : undefined}
          caption={
            limits
              ? t(
                  'billing.metric.deliveredCaption',
                  { pct: usagePct },
                  { defaultValue: '{{pct}}% of monthly cap' },
                )
              : undefined
          }
          tone={usagePct >= 90 ? 'warning' : 'success'}
          icon="send"
          sparkline={usageTrend}
        />
        <MetricStatCard
          eyebrow={t('billing.metric.endpoints', {}, { defaultValue: 'Endpoints active' })}
          value={String(activeEndpoints)}
          caption={
            limits
              ? t(
                  'billing.metric.endpointsCaption',
                  { max: fmtLimit(limits.maxWebhooks) },
                  { defaultValue: 'cap: {{max}}' },
                )
              : undefined
          }
          tone="info"
          icon="cloud_sync"
        />
        <MetricStatCard
          eyebrow={t('billing.metric.retention', {}, { defaultValue: 'Retention' })}
          value={limits ? (limits.retentionDays === 0 ? '∞' : `${limits.retentionDays}d`) : '—'}
          caption={t(
            'billing.metric.retentionCaption',
            {},
            { defaultValue: 'searchable payload history' },
          )}
          tone="primary"
          icon="history"
        />
      </div>

      <section
        className={cm.cn('rounded-xl p-6 mb-6')}
        style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
        data-mol-id="billing-usage"
      >
        <div className={cm.cn('flex items-center justify-between mb-4')}>
          <h2
            className={cm.cn('text-base font-extrabold tracking-tight')}
            style={{ color: 'var(--mol-color-text)' }}
          >
            {t('billing.usageTitle', {}, { defaultValue: 'Daily delivery volume · 30d' })}
          </h2>
          <span
            className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
            style={{
              color: usagePct >= 90 ? 'var(--mol-color-warning)' : 'var(--mol-color-primary)',
            }}
          >
            {usagePct >= 90
              ? t('billing.usageWarning', {}, { defaultValue: 'near cap' })
              : t('billing.usageHealthy', {}, { defaultValue: 'within plan' })}
          </span>
        </div>
        {totalDelivered === 0 ? (
          <p
            className={cm.cn('text-sm font-mono')}
            style={{ color: 'var(--mol-color-text-tertiary)' }}
          >
            {t(
              'billing.usageEmpty',
              {},
              {
                defaultValue:
                  'No deliveries yet — usage chart appears after your first webhook fires.',
              },
            )}
          </p>
        ) : (
          <DeliverySparkline
            values={usageTrend}
            width={760}
            height={140}
            stroke="var(--mol-color-primary)"
            strokeWidth={2}
            ariaLabel="Daily delivery volume last 30 days"
            className={cm.cn('w-full')}
          />
        )}
      </section>

      <section
        className={cm.cn('rounded-xl p-6')}
        style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
        data-mol-id="billing-payment-method"
      >
        <h2
          className={cm.cn('text-base font-extrabold tracking-tight mb-2')}
          style={{ color: 'var(--mol-color-text)' }}
        >
          {t('nav.paymentMethod', {}, { defaultValue: 'Payment method' })}
        </h2>
        {status?.isFree ? (
          <p
            className={cm.cn('text-sm font-mono')}
            style={{ color: 'var(--mol-color-text-tertiary)' }}
          >
            {t(
              'billing.paymentEmptyFree',
              {},
              { defaultValue: 'No payment method on file. Subscribe to a paid plan to add one.' },
            )}
          </p>
        ) : (
          <p
            className={cm.cn('text-sm font-mono')}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            {t(
              'billing.paymentManaged',
              {},
              {
                defaultValue:
                  'Card details are managed via Stripe. Click "Change plan" or visit your Stripe portal to update.',
              },
            )}
          </p>
        )}
      </section>
    </div>
  )
}
