import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TierLimits {
  maxConnections: number
  maxMaps: number
  maxNodes: number
  advancedFeatures: boolean
  canExport: boolean
  retentionDays: number
}

interface TierStatus {
  planKey: string
  category: 'free' | 'pro' | 'team' | string
  name: string
  isFree: boolean
  limits: TierLimits
}

interface TierPrice {
  period: 'month' | 'year'
  price: string
  stripePriceId: string | null
}

interface PricingTier {
  key: string
  name: string
  prices: TierPrice[]
  limits: TierLimits
}

const formatLimit = (n: number, unlimited: string): string => (n >= 999_999 ? unlimited : String(n))

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [status, setStatus] = useState<TierStatus | null>(null)
  const [tiers, setTiers] = useState<PricingTier[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get<TierStatus>('/billing/status'),
      http.get<{ data?: PricingTier[] }>('/billing/tiers'),
    ])
      .then(([statusRes, tiersRes]) => {
        if (cancelled) return
        setStatus(statusRes?.data ?? null)
        setTiers(tiersRes?.data?.data ?? [])
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setError(t('billing.loadError', {}, { defaultValue: 'Could not load billing status.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const unlimitedLabel = t('billing.unlimited', {}, { defaultValue: 'Unlimited' })

  const handleCheckout = async (priceId: string | null) => {
    if (!priceId) {
      setError(
        t(
          'billing.unavailableTier',
          {},
          {
            defaultValue:
              'This tier is not configured for checkout yet — set the Stripe price ID in your environment.',
          },
        ),
      )
      return
    }
    setBusy(priceId)
    setError(null)
    try {
      const res = await http.post<{ checkoutUrl?: string; updated?: boolean }>(
        '/billing/checkout',
        { priceId },
      )
      const url = res?.data?.checkoutUrl
      if (url) {
        window.location.href = url
        return
      }
      if (res?.data?.updated) {
        const refreshed = await http.get<TierStatus>('/billing/status')
        setStatus(refreshed?.data ?? null)
        return
      }
      setError(t('nav.couldNotStartCheckout', {}, { defaultValue: 'Could not start checkout.' }))
    } catch (error) {
      logError('billing.checkout', error)
      setError(t('nav.couldNotStartCheckout', {}, { defaultValue: 'Could not start checkout.' }))
    } finally {
      setBusy(null)
    }
  }

  const handleCancel = async () => {
    setBusy('cancel')
    setError(null)
    try {
      await http.post('/billing/cancel', {})
      const refreshed = await http.get<TierStatus>('/billing/status')
      setStatus(refreshed?.data ?? null)
    } catch (error) {
      logError('billing.cancel', error)
      setError(t('billing.cancelError', {}, { defaultValue: 'Could not cancel subscription.' }))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={cm.stack(8)}>
      <header
        className={cm.cn(cm.flex({ justify: 'between', align: 'end', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(2)}>
          <Link
            to="/settings"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-primary uppercase tracking-widest hover:underline',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              arrow_back
            </span>
            {t('billing.backToSettings', {}, { defaultValue: 'Back to settings' })}
          </Link>
          <h1
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('billing.title', {}, { defaultValue: 'Billing & plan' })}
          </h1>
          {status && (
            <p
              className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}
              data-mol-id="billing-current-plan"
            >
              {t(
                'billing.currentPlan',
                { name: status.name },
                { defaultValue: 'You are on the {{name}} plan.' },
              )}
            </p>
          )}
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-xl bg-error-container/30 text-on-error-container border border-error/30',
          )}
        >
          {error}
        </div>
      )}

      {loading || !status ? (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.textCenter, cm.sp('py', 12))}>
          {t('billing.loading', {}, { defaultValue: 'Loading billing…' })}
        </p>
      ) : (
        <>
          <section className={cm.stack(4)}>
            <h2
              className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('billing.plansTitle', {}, { defaultValue: 'Plans' })}
            </h2>
            <div
              className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-3')}
              data-mol-id="billing-tier-grid"
            >
              {tiers.map((tier) => {
                const isCurrent = tier.key === status.category || tier.key === status.planKey
                const monthlyPrice = tier.prices.find((p) => p.period === 'month')
                const yearlyPrice = tier.prices.find((p) => p.period === 'year')
                return (
                  <div
                    key={tier.key}
                    data-mol-id="billing-tier"
                    data-tier-key={tier.key}
                    className={cm.cn(
                      cm.sp('p', 6),
                      cm.stack(4),
                      'rounded-2xl border shadow-sm transition-all',
                      isCurrent
                        ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary border-transparent shadow-xl'
                        : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface',
                    )}
                  >
                    <div className={cm.flex({ justify: 'between', align: 'center' })}>
                      <span className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
                        {tier.name}
                      </span>
                      {isCurrent && (
                        <span
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 1),
                            cm.fontWeight('bold'),
                            'text-[10px] uppercase tracking-widest rounded-full bg-surface/20 backdrop-blur-md',
                          )}
                        >
                          {t('nav.current', {}, { defaultValue: 'Current' })}
                        </span>
                      )}
                    </div>
                    <p className={cm.cn('text-4xl font-extrabold tracking-tighter')}>
                      {monthlyPrice?.price ?? '—'}
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'opacity-70',
                        )}
                      >
                        {monthlyPrice && monthlyPrice.price !== '$0'
                          ? t('billing.perMonth', {}, { defaultValue: ' / mo' })
                          : ''}
                      </span>
                    </p>
                    <ul className={cm.stack(2)}>
                      <li className={cm.flex({ align: 'center', gap: 'xs' })}>
                        <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                          check_circle
                        </span>
                        <span className={cm.cn(cm.textSize('sm'))}>
                          {t(
                            'billing.feature.maps',
                            { count: formatLimit(tier.limits.maxMaps, unlimitedLabel) },
                            { defaultValue: '{{count}} maps' },
                          )}
                        </span>
                      </li>
                      <li className={cm.flex({ align: 'center', gap: 'xs' })}>
                        <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                          check_circle
                        </span>
                        <span className={cm.cn(cm.textSize('sm'))}>
                          {t(
                            'billing.feature.nodes',
                            { count: formatLimit(tier.limits.maxNodes, unlimitedLabel) },
                            { defaultValue: '{{count}} nodes' },
                          )}
                        </span>
                      </li>
                      <li className={cm.flex({ align: 'center', gap: 'xs' })}>
                        <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                          {tier.limits.canExport ? 'check_circle' : 'block'}
                        </span>
                        <span className={cm.cn(cm.textSize('sm'))}>
                          {t('billing.feature.export', {}, { defaultValue: 'Export to SVG / PNG' })}
                        </span>
                      </li>
                      <li className={cm.flex({ align: 'center', gap: 'xs' })}>
                        <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                          {tier.limits.advancedFeatures ? 'check_circle' : 'block'}
                        </span>
                        <span className={cm.cn(cm.textSize('sm'))}>
                          {t('common.advancedFeatures', {}, { defaultValue: 'Advanced features' })}
                        </span>
                      </li>
                    </ul>
                    <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
                      {monthlyPrice && monthlyPrice.stripePriceId && !isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleCheckout(monthlyPrice.stripePriceId)}
                          disabled={busy === monthlyPrice.stripePriceId}
                          data-mol-id="billing-checkout-monthly"
                          data-tier-key={tier.key}
                          className={cm.cn(
                            cm.sp('px', 5),
                            cm.sp('py', 3),
                            cm.fontWeight('bold'),
                            'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md disabled:opacity-60',
                          )}
                        >
                          {busy === monthlyPrice.stripePriceId
                            ? t('billing.starting', {}, { defaultValue: 'Starting checkout…' })
                            : t(
                                'billing.upgradeMonthly',
                                { name: tier.name },
                                { defaultValue: 'Upgrade to {{name}} (monthly)' },
                              )}
                        </button>
                      )}
                      {yearlyPrice && yearlyPrice.stripePriceId && !isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleCheckout(yearlyPrice.stripePriceId)}
                          disabled={busy === yearlyPrice.stripePriceId}
                          data-mol-id="billing-checkout-yearly"
                          data-tier-key={tier.key}
                          className={cm.cn(
                            cm.sp('px', 5),
                            cm.sp('py', 2),
                            cm.fontWeight('bold'),
                            'rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-60',
                          )}
                        >
                          {t(
                            'billing.upgradeYearly',
                            { price: yearlyPrice.price },
                            { defaultValue: 'Pay yearly · {{price}}' },
                          )}
                        </button>
                      )}
                      {monthlyPrice && !monthlyPrice.stripePriceId && tier.key !== 'free' && (
                        <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                          {t(
                            'billing.priceMissing',
                            {},
                            { defaultValue: 'Stripe price ID not configured.' },
                          )}
                        </p>
                      )}
                      {isCurrent && tier.key !== 'free' && (
                        <button
                          type="button"
                          onClick={handleCancel}
                          disabled={busy === 'cancel'}
                          data-mol-id="billing-cancel"
                          className={cm.cn(
                            cm.sp('px', 5),
                            cm.sp('py', 2),
                            cm.fontWeight('bold'),
                            'rounded-xl bg-surface/15 text-on-primary border border-surface/30 hover:bg-surface/25 transition-colors disabled:opacity-60',
                          )}
                        >
                          {busy === 'cancel'
                            ? t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })
                            : t(
                                'nav.cancelSubscription',
                                {},
                                { defaultValue: 'Cancel subscription' },
                              )}
                        </button>
                      )}
                      {isCurrent && tier.key === 'free' && (
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-primary/85')}>
                          {t(
                            'billing.freeNoticeBody',
                            {},
                            { defaultValue: 'Pick a paid plan above to unlock more maps.' },
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default Billing
