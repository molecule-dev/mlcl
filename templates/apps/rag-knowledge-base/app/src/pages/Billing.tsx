import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EngramMetricTile } from '../components/EngramMetricTile.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface PriceTier {
  stripePriceId: string | null
  period: 'month' | 'year'
  price: string
}

interface PricingTier {
  key: string
  name: string
  prices: PriceTier[]
  limits?: Record<string, number | string | null>
  highlights?: string[]
}

interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
  limits?: Record<string, number | string | null>
}

const HIGHLIGHTS_FALLBACK: Record<string, string[]> = {
  free: ['Indexed knowledge base', 'Limited Q&A volume', 'Community support'],
  pro: ['Higher Q&A and document limits', 'Email support', 'Production-ready'],
  team: ['Larger team limits', 'Priority support', 'SSO + audit log'],
}

function formatPrice(price: PriceTier): string {
  return price.price
}

function cadenceLabel(price: PriceTier): string {
  if (price.price === '$0') return 'forever'
  return price.period === 'year' ? 'per user / year' : 'per user / month'
}

function formatLimit(limit: number | string | null | undefined): string {
  if (limit == null) return '\u221E'
  if (typeof limit === 'number') {
    if (limit < 0) return '\u221E'
    return limit.toLocaleString()
  }
  return String(limit)
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [tiers, setTiers] = useState<PricingTier[]>([])
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyPriceId, setBusyPriceId] = useState<string | null>(null)
  const [updatedNotice, setUpdatedNotice] = useState<string | null>(null)
  const [canceling, setCanceling] = useState(false)

  const refresh = () =>
    Promise.all([
      http.get('/api/billing/tiers').catch(() => null),
      http.get('/api/billing/status').catch(() => null),
    ]).then(([tiersRes, statusRes]) => {
      const fetchedTiers = unwrapList<PricingTier>(tiersRes)
      const fetchedStatus = unwrapSingle<BillingStatus>(statusRes)
      setTiers(fetchedTiers)
      setStatus(fetchedStatus ?? null)
    })

  useEffect(() => {
    setLoading(true)
    refresh()
      .catch(() =>
        setError(t('billing.error.load', {}, { defaultValue: 'Could not load billing.' })),
      )
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http]) // refresh and t are stable across renders; run once on http change

  async function startCheckout(priceId: string) {
    setBusyPriceId(priceId)
    setError(null)
    setUpdatedNotice(null)
    try {
      const res = await http.post('/api/billing/checkout', { priceId })
      const body = unwrapSingle<{
        checkoutUrl?: string
        updated?: boolean
        subscription?: unknown
      }>(res)
      if (body?.checkoutUrl) {
        window.location.assign(body.checkoutUrl)
        return
      }
      if (body?.updated) {
        setUpdatedNotice(
          t('nav.subscriptionUpdated', {}, { defaultValue: 'Subscription updated.' }),
        )
        await refresh()
        return
      }
      setError(t('billing.error.checkout', {}, { defaultValue: 'Checkout did not return a URL.' }))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('billing.error.checkoutFailed', {}, { defaultValue: 'Checkout failed.' }),
      )
    } finally {
      setBusyPriceId(null)
    }
  }

  async function cancel() {
    setCanceling(true)
    setError(null)
    setUpdatedNotice(null)
    try {
      await http.post('/api/billing/cancel', {})
      setUpdatedNotice(t('billing.notice.canceled', {}, { defaultValue: 'Subscription canceled.' }))
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('billing.error.cancelFailed', {}, { defaultValue: 'Cancel failed.' }),
      )
    } finally {
      setCanceling(false)
    }
  }

  const planMetric = status?.name ?? '\u2014'
  const limits = status?.limits ?? {}
  const documentLimit = (limits.maxDocuments as number | undefined) ?? null
  const qaLimit = (limits.maxQa as number | undefined) ?? null

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-primary font-bold')}
          style={{ fontSize: 10 }}
        >
          {t('nav.subscription', {}, { defaultValue: 'Subscription' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('settings.billing', {}, { defaultValue: 'Billing' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'billing.subheading',
            {},
            { defaultValue: 'Plan, usage, and Stripe-managed checkout.' },
          )}
        </p>
        {updatedNotice ? (
          <p
            data-testid="billing-notice"
            className={cm.cn(cm.textSize('sm'), 'text-success font-semibold')}
          >
            {updatedNotice}
          </p>
        ) : null}
        {error ? (
          <p
            data-testid="billing-error"
            className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
          >
            {error}
          </p>
        ) : null}
      </header>

      <section
        data-testid="billing-metrics"
        className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 sm:grid-cols-4')}
      >
        <EngramMetricTile
          label={t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
          value={planMetric}
          icon="workspace_premium"
          tone="primary"
        />
        <EngramMetricTile
          label={t('billing.metric.documents', {}, { defaultValue: 'Document limit' })}
          value={formatLimit(documentLimit)}
          icon="folder"
          tone="info"
        />
        <EngramMetricTile
          label={t('billing.metric.qa', {}, { defaultValue: 'Q&A limit / mo' })}
          value={formatLimit(qaLimit)}
          icon="forum"
          tone="cited"
        />
        <EngramMetricTile
          label={t('billing.metric.tier', {}, { defaultValue: 'Tier' })}
          value={status?.isFree ? 'Free' : 'Paid'}
          icon="event"
          tone="accent"
        />
      </section>

      <h2 className={cm.cn(cm.textSize('xl'), 'font-bold')}>
        {t('billing.plans.heading', {}, { defaultValue: 'Plans' })}
      </h2>
      {loading ? (
        <p
          data-testid="billing-loading"
          className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}
        >
          {t('billing.loading', {}, { defaultValue: 'Loading plans\u2026' })}
        </p>
      ) : tiers.length === 0 ? (
        <p data-testid="billing-empty" className={cm.cn(cm.sp('py', 6), 'text-on-surface-variant')}>
          {t('billing.plans.empty', {}, { defaultValue: 'No pricing tiers configured.' })}
        </p>
      ) : (
        <section
          data-testid="billing-plans"
          className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 lg:grid-cols-3')}
        >
          {tiers.map((p) => {
            const active = status?.category === p.key
            const monthly = p.prices.find((pr) => pr.period === 'month') ?? p.prices[0]
            const highlights =
              p.highlights && p.highlights.length
                ? p.highlights
                : (HIGHLIGHTS_FALLBACK[p.key] ?? [])
            return (
              <div
                key={p.key}
                data-testid={`billing-plan-${p.key}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.flex({ direction: 'col', gap: 'md' }),
                  'rounded-2xl border shadow-sm transition-all',
                  active
                    ? 'bg-primary text-on-primary border-transparent shadow-lg shadow-primary/20'
                    : 'bg-surface-container-lowest border-outline-variant/30 hover:shadow-md',
                )}
              >
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <h3 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
                    {t(`billing.plan.${p.key}.name`, {}, { defaultValue: p.name })}
                  </h3>
                  {active ? (
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.textSize('xs'),
                        'rounded-full bg-surface/20 backdrop-blur-md font-bold uppercase tracking-widest py-0.5',
                      )}
                      style={{ fontSize: 10 }}
                    >
                      {t('billing.currentBadge', {}, { defaultValue: 'Current' })}
                    </span>
                  ) : null}
                </div>
                {monthly ? (
                  <div className={cm.flex({ align: 'baseline', gap: 'xs' })}>
                    <span
                      className={cm.cn(
                        cm.textSize('4xl'),
                        'font-extrabold tabular-nums tracking-tighter',
                      )}
                    >
                      {formatPrice(monthly)}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'uppercase tracking-widest font-bold opacity-80',
                      )}
                      style={{ fontSize: 10 }}
                    >
                      {cadenceLabel(monthly)}
                    </span>
                  </div>
                ) : null}
                <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.textSize('sm'))}>
                  {highlights.map((h) => (
                    <li key={h} className={cm.flex({ align: 'center', gap: 'xs' })}>
                      <span
                        className={cm.cn('material-symbols-outlined')}
                        style={{ fontSize: 16 }}
                        aria-hidden="true"
                      >
                        check_circle
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>
                {monthly?.stripePriceId ? (
                  <button
                    type="button"
                    disabled={active || busyPriceId === monthly.stripePriceId}
                    onClick={() => startCheckout(monthly.stripePriceId as string)}
                    data-testid={`billing-cta-${p.key}`}
                    className={cm.cn(
                      cm.sp('py', 3),
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'rounded-full transition-opacity disabled:opacity-50',
                      active
                        ? 'bg-surface/20 backdrop-blur-md text-white'
                        : 'bg-primary text-on-primary hover:opacity-90',
                    )}
                  >
                    {active
                      ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
                      : busyPriceId === monthly.stripePriceId
                        ? t('billing.cta.loading', {}, { defaultValue: 'Redirecting\u2026' })
                        : t('billing.cta.upgrade', {}, { defaultValue: 'Switch to this plan' })}
                  </button>
                ) : (
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')}>
                    {t(
                      'billing.cta.unavailable',
                      {},
                      { defaultValue: 'Configure STRIPE_*_PRICE_ID env to enable this plan.' },
                    )}
                  </p>
                )}
              </div>
            )
          })}
        </section>
      )}

      {status && !status.isFree ? (
        <section
          className={cm.cn(
            cm.sp('p', 5),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
          )}
        >
          <button
            type="button"
            onClick={cancel}
            disabled={canceling}
            data-testid="billing-cancel"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full border border-error text-error disabled:opacity-50 hover:bg-error/10 transition-colors',
            )}
          >
            {canceling
              ? t('billing.cancel.loading', {}, { defaultValue: 'Canceling\u2026' })
              : t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
          </button>
        </section>
      ) : null}
    </div>
  )
}
