import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface TierPrice {
  period: 'month' | 'year'
  price: string
  stripePriceId: string | null
}

interface Tier {
  key: string
  name: string
  prices: TierPrice[]
  limits?: Record<string, number | boolean | null>
}

interface Status {
  planKey: string
  category: string
  name: string
  limits?: Record<string, number | boolean | null>
  isFree: boolean
}

function formatFeatures(limits?: Record<string, number | boolean | null>): string[] {
  if (!limits) return []
  const fmt = (n: unknown) =>
    typeof n === 'number' && n >= 999_999
      ? 'Unlimited'
      : typeof n === 'number'
        ? n.toLocaleString()
        : String(n)
  const out: string[] = []
  if (limits.maxMenu != null) out.push(`${fmt(limits.maxMenu)} menu items`)
  if (limits.maxTables != null) out.push(`${fmt(limits.maxTables)} tables`)
  if (limits.maxOrders != null) out.push(`${fmt(limits.maxOrders)} orders / day`)
  if (limits.advancedFeatures === true) out.push('Advanced analytics')
  if (limits.canExport === true) out.push('CSV export')
  if (typeof limits.retentionDays === 'number') {
    out.push(
      limits.retentionDays === 0 ? 'Unlimited history' : `${limits.retentionDays}-day history`,
    )
  }
  return out
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [tiers, setTiers] = useState<Tier[]>([])
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [tiersRes, statusRes] = await Promise.all([
        http.get('/api/billing/tiers'),
        http.get('/api/billing/status'),
      ])
      setTiers(unwrapList<Tier>(tiersRes))
      setStatus(unwrapSingle<Status>(statusRes))
    } catch (error) {
      logError('billing.load', error)
      setError(t('billing.loadError', {}, { defaultValue: 'Could not load billing.' }))
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const handleSwitch = useCallback(
    async (priceId?: string) => {
      if (!priceId) {
        setError(
          t(
            'billing.priceUnavailable',
            {},
            { defaultValue: 'This plan does not have a configured price.' },
          ),
        )
        return
      }
      setBusy(true)
      setError(null)
      setMessage(null)
      try {
        const checkout = unwrapSingle<{ checkoutUrl?: string; updated?: boolean }>(
          await http.post('/api/billing/checkout', { priceId }),
        )
        if (checkout?.checkoutUrl) {
          window.location.href = checkout.checkoutUrl
          return
        }
        if (checkout?.updated) {
          setMessage(t('billing.updated', {}, { defaultValue: 'Plan updated.' }))
          await reload()
        }
      } catch (error) {
        logError('billing.checkout', error)
        setError(t('nav.couldNotStartCheckout', {}, { defaultValue: 'Could not start checkout.' }))
      } finally {
        setBusy(false)
      }
    },
    [http, reload, t],
  )

  const handleCancel = useCallback(async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await http.post('/api/billing/cancel', {})
      setMessage(t('nav.subscriptionCancelled', {}, { defaultValue: 'Subscription cancelled.' }))
      await reload()
    } catch (error) {
      logError('billing.cancel', error)
      setError(t('billing.cancelError', {}, { defaultValue: 'Could not cancel subscription.' }))
    } finally {
      setBusy(false)
    }
  }, [http, reload, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <Link
          to="/settings"
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary hover:underline inline-flex items-center gap-1',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-base align-middle')}
            aria-hidden="true"
          >
            arrow_back
          </span>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </Link>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.sp('mt', 2),
            'font-extrabold tracking-tight font-display',
          )}
        >
          {t('nav.planAndBilling', {}, { defaultValue: 'Plan & billing' })}
        </h1>
        <p
          data-testid="billing-current"
          className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}
        >
          {status
            ? t(
                'billing.currentPlan',
                { name: status.name },
                { defaultValue: 'Current plan: {{name}}' },
              )
            : t('billing.subheading', {}, { defaultValue: 'Pick the plan that fits tonight.' })}
        </p>
      </header>

      {error ? (
        <p
          data-testid="billing-error"
          className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-error')}
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          data-testid="billing-success"
          className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-primary')}
        >
          {message}
        </p>
      ) : null}

      {loading && tiers.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : tiers.length === 0 ? (
        <p
          data-testid="billing-empty"
          className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
        >
          {t(
            'billing.noPlans',
            {},
            { defaultValue: 'No plans configured. Set Stripe price IDs in your environment.' },
          )}
        </p>
      ) : (
        <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
          {tiers.map((tier) => {
            const monthly = tier.prices.find((p) => p.period === 'month') ?? tier.prices[0]
            const yearly = tier.prices.find((p) => p.period === 'year')
            const isCurrent = status?.category === tier.key
            const isFree = tier.key === 'free'
            const features = formatFeatures(tier.limits)
            return (
              <article
                key={tier.key}
                data-testid={`billing-plan-${tier.key}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.stack(4),
                  'rounded-2xl shadow-sm relative overflow-hidden',
                  isCurrent
                    ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary'
                    : 'bg-surface-container-lowest',
                )}
              >
                {isCurrent && (
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      cm.roundedFull,
                      'absolute top-4 right-4 uppercase tracking-widest bg-surface/20 backdrop-blur-md text-on-primary',
                    )}
                  >
                    {t('nav.current', {}, { defaultValue: 'Current' })}
                  </span>
                )}
                <h3
                  className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight font-display')}
                >
                  {tier.name}
                </h3>
                <p className={cm.flex({ align: 'baseline', gap: 'xs' })}>
                  <span
                    className={cm.cn(
                      cm.textSize('4xl'),
                      'font-extrabold tabular-nums tracking-tighter font-display',
                    )}
                  >
                    {monthly?.price ?? '—'}
                  </span>
                </p>
                {yearly ? (
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      isCurrent ? 'opacity-80' : 'text-on-surface-variant',
                    )}
                  >
                    {t(
                      'billing.orYearly',
                      { price: yearly.price },
                      { defaultValue: 'or {{price}}' },
                    )}
                  </p>
                ) : null}
                {features.length > 0 ? (
                  <ul className={cm.stack(2)}>
                    {features.map((perk) => (
                      <li
                        key={perk}
                        className={cm.cn(cm.flex({ align: 'start', gap: 'xs' }), cm.textSize('sm'))}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-base mt-0.5')}
                          aria-hidden="true"
                        >
                          check_circle
                        </span>
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {isCurrent && !isFree ? (
                  <ConfirmButton
                    label={t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
                    confirmLabel={t(
                      'billing.confirmCancel',
                      {},
                      { defaultValue: 'Cancel your subscription?' },
                    )}
                    disarmSeconds={6}
                    disabled={busy}
                    data-testid={`billing-cancel-${tier.key}`}
                    onConfirm={handleCancel}
                    className="mt-2 w-full"
                  />
                ) : isCurrent ? (
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('py', 3),
                      cm.textCenter,
                      'opacity-80',
                    )}
                  >
                    {t('billing.freePlanCopy', {}, { defaultValue: 'You are on the free plan.' })}
                  </p>
                ) : (
                  <button
                    onClick={() => handleSwitch(monthly?.stripePriceId ?? undefined)}
                    disabled={busy || !monthly?.stripePriceId}
                    type="button"
                    data-testid={`billing-switch-${tier.key}`}
                    className={cm.cn(
                      cm.sp('py', 3),
                      cm.fontWeight('bold'),
                      cm.roundedFull,
                      'mt-2 transition-colors bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50',
                    )}
                  >
                    {monthly?.stripePriceId
                      ? t('billing.choose', {}, { defaultValue: 'Switch to this plan' })
                      : t(
                          'billing.notConfigured',
                          {},
                          { defaultValue: 'Stripe price not configured' },
                        )}
                  </button>
                )}
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}
