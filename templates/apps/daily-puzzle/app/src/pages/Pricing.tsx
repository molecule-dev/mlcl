import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface TierPrice {
  period: 'month' | 'year'
  price: string
  stripePriceId: string | null
}

interface PricingTier {
  key: string
  name: string
  prices: TierPrice[]
  limits: {
    maxArchivePlaysPerDay: number
    archiveHistoryDays: number
    advancedStats: boolean
    canExport: boolean
    retentionDays: number
  }
}

interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
}

const formatNum = (n: number): string => (n >= 999_999 ? '∞' : n.toLocaleString())

/**
 * Public pricing page. Lists tiers from `/api/billing/tiers` and routes
 * authenticated upgrades through `/api/billing/checkout`, which returns a
 * real Stripe Checkout URL the browser navigates to. Anonymous visitors
 * are sent to /signup first.
 */
export function Pricing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const http = useHttpClient()
  const [tiers, setTiers] = useState<PricingTier[]>([])
  const [period, setPeriod] = useState<'month' | 'year'>('month')
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await http.get<{ data: PricingTier[] }>('/api/billing/tiers')
        if (!cancelled) {
          const data = (res.data?.data ?? []) as PricingTier[]
          setTiers(data)
        }
      } catch (_error) {
        // Tier load failed; show error in UI
        if (!cancelled)
          setError(t('pricing.loadError', {}, { defaultValue: 'Could not load plans.' }))
      } finally {
        if (!cancelled) setLoading(false)
      }
      if (user) {
        try {
          const res = await http.get<BillingStatus>('/api/billing/status')
          if (!cancelled) setStatus(res.data ?? null)
        } catch (_error) {
          // Billing status is optional; anonymous users or envs without billing will fail here
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [http, user, t])

  async function handleCheckout(tier: PricingTier, priceId: string) {
    if (!user) {
      navigate('/signup?next=/pricing')
      return
    }
    setCheckoutLoading(tier.key)
    setError(null)
    try {
      const res = await http.post<{ checkoutUrl?: string; updated?: boolean }>(
        '/api/billing/checkout',
        { priceId },
      )
      const data = res.data
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      if (data?.updated) {
        navigate('/plan-updated')
        return
      }
      setError(
        t(
          'pricing.checkoutError',
          {},
          { defaultValue: 'Could not start checkout. Please try again.' },
        ),
      )
    } catch (_error) {
      // Checkout failed; error shown in UI
      setError(
        t(
          'pricing.checkoutError',
          {},
          { defaultValue: 'Could not start checkout. Please try again.' },
        ),
      )
    } finally {
      setCheckoutLoading(null)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-on-surface font-body',
      )}
    >
      <Header />
      <main
        data-mol-id="page-pricing"
        data-testid="pricing-page"
        className={cm.cn(cm.flex1, cm.mxAuto, 'w-full max-w-6xl', cm.sp('px', 6), cm.sp('py', 12))}
      >
        <header className={cm.cn(cm.maxW('xl'), 'mx-auto', cm.textCenter, cm.sp('mb', 8))}>
          <p
            className={cm.cn('text-[10px] uppercase tracking-widest font-black text-primary mb-2')}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </p>
          <h1
            className={cm.cn(
              'text-3xl md:text-5xl font-extrabold tracking-tight mb-3 font-display',
            )}
          >
            {t('pricing.heading', { app: APP_NAME }, { defaultValue: 'Choose your {{app}} plan' })}
          </h1>
          <p className={cm.cn('text-sm text-on-surface-variant max-w-md mx-auto')}>
            {t(
              'pricing.subhead',
              {},
              {
                defaultValue:
                  'The daily word is always free. Upgrade for unlimited archive replays and deeper stats.',
              },
            )}
          </p>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 2 }),
              cm.sp('mt', 6),
            )}
          >
            <button
              type="button"
              onClick={() => setPeriod('month')}
              data-testid="period-month"
              aria-pressed={period === 'month'}
              className={cm.cn(
                'px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-widest transition-colors',
                period === 'month'
                  ? 'bg-primary text-white'
                  : 'bg-surface-container-low text-on-surface-variant',
              )}
            >
              {t('status.monthly', {}, { defaultValue: 'Monthly' })}
            </button>
            <button
              type="button"
              onClick={() => setPeriod('year')}
              data-testid="period-year"
              aria-pressed={period === 'year'}
              className={cm.cn(
                'px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-widest transition-colors',
                period === 'year'
                  ? 'bg-primary text-white'
                  : 'bg-surface-container-low text-on-surface-variant',
              )}
            >
              {t('pricing.yearly', {}, { defaultValue: 'Yearly' })}
            </button>
          </div>
        </header>

        {error ? (
          <div className={cm.cn(cm.maxW('lg'), 'mx-auto', cm.sp('px', 6), cm.sp('mt', 6))}>
            <p
              data-testid="pricing-error"
              className={cm.cn(
                'text-sm font-bold text-error bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-2xl px-4 py-3',
              )}
            >
              {error}
            </p>
          </div>
        ) : null}

        <section className={cm.cn(cm.maxW('xl'), 'mx-auto', cm.sp('py', 4))}>
          {loading ? (
            <p
              className={cm.cn(cm.textCenter, 'text-sm font-bold text-on-surface-variant')}
              data-testid="pricing-loading"
            >
              {t('nav.loadingPlans', {}, { defaultValue: 'Loading plans…' })}
            </p>
          ) : (
            <div
              className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-3')}
              data-testid="pricing-tiers"
            >
              {tiers.map((tier) => {
                const price = tier.prices.find((p) => p.period === period) ?? tier.prices[0]
                const isCurrent = status?.category === tier.key
                const isFree = tier.key === 'free'
                return (
                  <article
                    key={tier.key}
                    data-testid={`tier-${tier.key}`}
                    className={cm.cn(
                      'rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col',
                      cm.sp('p', 6),
                    )}
                  >
                    <header className={cm.cn(cm.stack(2), cm.sp('mb', 5))}>
                      <p
                        className={cm.cn(
                          'text-[10px] uppercase tracking-widest font-black text-primary',
                        )}
                      >
                        {tier.name}
                      </p>
                      <p className={cm.cn('text-3xl font-extrabold tracking-tight')}>
                        {price?.price ?? '$0'}
                      </p>
                    </header>
                    <ul className={cm.cn(cm.stack(2), 'text-sm flex-1')}>
                      <li>{t('pricing.dailyWord', {}, { defaultValue: 'The daily word' })}</li>
                      <li>
                        {t(
                          'pricing.archivePlays',
                          { count: formatNum(tier.limits.maxArchivePlaysPerDay) },
                          { defaultValue: '{{count}} archive replays / day' },
                        )}
                      </li>
                      <li>
                        {tier.limits.archiveHistoryDays === 0
                          ? t(
                              'pricing.archiveUnlimited',
                              {},
                              { defaultValue: 'Unlimited archive history' },
                            )
                          : t(
                              'pricing.archiveHistory',
                              { count: tier.limits.archiveHistoryDays },
                              { defaultValue: '{{count}} days of archive history' },
                            )}
                      </li>
                      <li>
                        {t(
                          'pricing.advancedStats',
                          { yes: tier.limits.advancedStats ? '✓' : '—' },
                          { defaultValue: 'Advanced stats: {{yes}}' },
                        )}
                      </li>
                      <li>
                        {t(
                          'pricing.canExport',
                          { yes: tier.limits.canExport ? '✓' : '—' },
                          { defaultValue: 'Data export: {{yes}}' },
                        )}
                      </li>
                    </ul>
                    <button
                      type="button"
                      disabled={
                        isCurrent || isFree || !price?.stripePriceId || checkoutLoading === tier.key
                      }
                      onClick={() =>
                        price?.stripePriceId && handleCheckout(tier, price.stripePriceId)
                      }
                      data-testid={`checkout-${tier.key}`}
                      className={cm.cn(
                        cm.sp('mt', 6),
                        'w-full px-4 py-3 rounded-2xl font-extrabold uppercase tracking-widest text-xs transition-colors',
                        isCurrent
                          ? 'bg-emerald-500/20 text-success'
                          : isFree
                            ? 'bg-surface-container-low text-on-surface-variant cursor-default'
                            : 'bg-primary text-white hover:bg-primary/90 disabled:opacity-50',
                      )}
                    >
                      {isCurrent
                        ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
                        : isFree
                          ? t('pricing.included', {}, { defaultValue: 'Included' })
                          : checkoutLoading === tier.key
                            ? t('common.startingEllipsis', {}, { defaultValue: 'Starting…' })
                            : t('settings.upgrade', {}, { defaultValue: 'Upgrade' })}
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <p className={cm.cn(cm.textCenter, cm.sp('mt', 8), 'text-xs')}>
          <Link to="/" className={cm.cn('text-primary font-bold')}>
            {t('auth.backToHomeArrow', {}, { defaultValue: '← Back to home' })}
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  )
}

export default Pricing
