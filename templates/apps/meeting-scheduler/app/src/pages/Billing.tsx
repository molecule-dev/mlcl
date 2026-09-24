/**
 * Billing — load real plan + tiers from the backend, drive Stripe
 * Checkout via POST /api/billing/checkout. No invoice fixtures (the
 * Stripe customer portal owns that surface in production).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
}

interface Tier {
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: Record<string, unknown>
}

interface CheckoutResponse {
  checkoutUrl?: string
  updated?: boolean
}

interface UnwrappedTiersResponse {
  data: Tier[]
}

const PLAN_FEATURES: Record<string, string[]> = {
  free: ['Up to 5 booking links', 'Email confirmations', 'Basic availability rules'],
  pro: [
    'Unlimited booking links',
    'Buffers + minimum notice',
    'Custom branding on confirmations',
    'Priority email support',
  ],
  team: [
    'Everything in Pro',
    'Round-robin event types',
    'Shared availability rules',
    'Per-host workload reporting',
  ],
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [tiers, setTiers] = useState<Tier[]>([])
  const [period, setPeriod] = useState<'month' | 'year'>('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkoutId, setCheckoutId] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http
        .get<BillingStatus>('/api/billing/status')
        .then((res) => unwrapSingle<BillingStatus>(res)),
      http.get<UnwrappedTiersResponse>('/api/billing/tiers').then((res) => {
        const inner = unwrapSingle<UnwrappedTiersResponse>(res)
        if (inner?.data) return inner.data
        return unwrapList<Tier>(res)
      }),
    ])
      .then(([s, tierList]) => {
        if (cancelled) return
        if (s) setStatus(s)
        setTiers(tierList)
      })
      .catch(() => {
        if (cancelled) return
        setError(t('billing.loadError', {}, { defaultValue: 'Could not load billing details.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const handleCheckout = useCallback(
    async (priceId: string | null, key: string) => {
      if (!priceId) return
      setCheckoutId(key)
      setCheckoutError(null)
      try {
        const res = await http.post<CheckoutResponse>('/api/billing/checkout', { priceId })
        const data = unwrapSingle<CheckoutResponse>(res)
        if (data?.checkoutUrl) {
          window.location.href = data.checkoutUrl
          return
        }
        if (data?.updated) {
          // No checkout needed (subscription updated in-place).
          window.location.reload()
          return
        }
        setCheckoutError(
          t(
            'billing.checkoutError',
            {},
            {
              defaultValue: 'Could not start checkout — try again in a moment.',
            },
          ),
        )
      } catch (err) {
        const status = (err as { response?: { data?: { error?: string } } })?.response
        setCheckoutError(
          status?.data?.error ??
            t(
              'billing.checkoutError',
              {},
              {
                defaultValue: 'Could not start checkout — try again in a moment.',
              },
            ),
        )
      } finally {
        setCheckoutId(null)
      }
    },
    [http, t],
  )

  const handleCancelSubscription = useCallback(async () => {
    setCheckoutError(null)
    try {
      await http.post('/api/billing/cancel', {})
      window.location.reload()
    } catch (err) {
      const status = (err as { response?: { data?: { error?: string } } })?.response
      setCheckoutError(
        status?.data?.error ??
          t('billing.cancelError', {}, { defaultValue: 'Could not cancel subscription.' }),
      )
    }
  }, [http, t])

  const currentPlanCategory = status?.category ?? 'free'

  const ordered = useMemo(
    () => tiers.slice().sort((a, b) => (a.key === 'free' ? -1 : b.key === 'free' ? 1 : 0)),
    [tiers],
  )

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('p', 8), 'max-w-[1200px] mx-auto')}>
      <header className={cm.stack(2)}>
        <Link
          to="/settings"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            'font-bold text-primary hover:underline',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            arrow_back
          </span>
          {t('billing.back', {}, { defaultValue: 'Back to settings' })}
        </Link>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('settings.billing', {}, { defaultValue: 'Billing' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('medium'),
            'text-on-surface-variant/80 max-w-2xl',
          )}
        >
          {t(
            'billing.subtitle',
            {},
            { defaultValue: 'Plans and Stripe-powered checkout. Manage saved cards via Stripe.' },
          )}
        </p>
      </header>

      {error ? (
        <p
          role="alert"
          data-testid="billing-error"
          className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
        >
          {error}
        </p>
      ) : null}
      {checkoutError ? (
        <p
          role="alert"
          data-testid="billing-checkout-error"
          className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
        >
          {checkoutError}
        </p>
      ) : null}

      {status ? (
        <section
          data-testid="billing-current-plan"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
            cm.sp('p', 8),
            'bg-gradient-to-br from-primary to-primary-container text-white rounded-3xl shadow-md shadow-primary/20',
          )}
        >
          <div className={cm.stack(2)}>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-primary-fixed/90',
              )}
            >
              {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
            </p>
            <p
              data-testid="billing-current-plan-name"
              className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}
            >
              {status.name}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-primary-fixed/90')}>
              {status.isFree
                ? t('billing.freeNote', {}, { defaultValue: 'You are on the free plan.' })
                : t('billing.paidNote', {}, { defaultValue: 'Subscription active.' })}
            </p>
          </div>
          {!status.isFree ? (
            <ConfirmButton
              label={t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
              confirmLabel={t(
                'billing.confirmCancel',
                {},
                {
                  defaultValue:
                    'Cancel your subscription? You will be downgraded to Free at period end.',
                },
              )}
              onConfirm={handleCancelSubscription}
              disarmSeconds={6}
              color="secondary"
              data-mol-id="billing-cancel-subscription"
            />
          ) : null}
        </section>
      ) : null}

      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' })}>
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              'font-bold uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('billing.compareHeading', {}, { defaultValue: 'Compare plans' })}
          </h2>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('p', 1),
              'gap-1 bg-surface-container-low rounded-full',
            )}
          >
            {(['month', 'year'] as const).map((p) => (
              <button
                key={p}
                type="button"
                data-testid={`billing-period-${p}`}
                onClick={() => setPeriod(p)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'rounded-full uppercase tracking-widest transition-colors',
                  period === p
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface',
                )}
              >
                {t(
                  `billing.period.${p}`,
                  {},
                  { defaultValue: p === 'month' ? 'Monthly' : 'Yearly' },
                )}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('billing.loading', {}, { defaultValue: 'Loading plans…' })}
          </p>
        ) : (
          <div
            data-testid="billing-tiers"
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}
          >
            {ordered.map((tier) => {
              const price =
                tier.prices.find((p) => p.period === period) ??
                tier.prices.find((p) => p.period === 'month') ??
                tier.prices[0]
              const isCurrent = tier.key === currentPlanCategory
              const highlight = tier.key === 'pro' && !isCurrent
              return (
                <div
                  key={tier.key}
                  data-testid={`billing-tier-${tier.key}`}
                  className={cm.cn(
                    cm.sp('p', 6),
                    cm.flex({ direction: 'col' }),
                    'gap-5 rounded-3xl shadow-sm border-t-4 bg-surface-container-lowest',
                    highlight ? 'border-primary' : 'border-outline-variant',
                  )}
                >
                  <div className={cm.stack(1)}>
                    <p
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest',
                        highlight ? 'text-primary' : 'text-on-surface-variant',
                      )}
                    >
                      {tier.name}
                    </p>
                    <p className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
                      {price?.price ?? '—'}
                    </p>
                  </div>
                  <ul className={cm.stack(2)}>
                    {(PLAN_FEATURES[tier.key] ?? []).map((f) => (
                      <li
                        key={f}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.textSize('sm'),
                          'text-on-surface',
                        )}
                      >
                        <span
                          className={'material-symbols-outlined text-base text-success'}
                          aria-hidden="true"
                        >
                          check
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    data-testid={`billing-cta-${tier.key}-${period}`}
                    disabled={
                      isCurrent || !price?.stripePriceId || checkoutId === `${tier.key}-${period}`
                    }
                    onClick={() =>
                      handleCheckout(price?.stripePriceId ?? null, `${tier.key}-${period}`)
                    }
                    className={cm.cn(
                      cm.sp('py', 3),
                      cm.roundedFull,
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'transition-colors mt-auto',
                      isCurrent
                        ? 'border border-outline-variant text-on-surface-variant cursor-not-allowed'
                        : highlight
                          ? 'text-white hover:shadow-md hover:shadow-primary/30'
                          : 'border border-primary/40 text-primary hover:bg-primary/5',
                      !price?.stripePriceId && !isCurrent ? 'opacity-50 cursor-not-allowed' : '',
                    )}
                    style={
                      highlight && !isCurrent
                        ? {
                            background:
                              'linear-gradient(135deg, var(--color-primary), var(--color-primary-gradient-to))',
                          }
                        : undefined
                    }
                  >
                    {checkoutId === `${tier.key}-${period}`
                      ? t('billing.checkout.loading', {}, { defaultValue: 'Redirecting…' })
                      : isCurrent
                        ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
                        : !price?.stripePriceId
                          ? t(
                              'billing.checkout.unavailable',
                              {},
                              { defaultValue: 'Plan unavailable' },
                            )
                          : t(
                              `billing.checkout.cta.${tier.key}`,
                              {},
                              {
                                defaultValue: `Upgrade to ${tier.name}`,
                              },
                            )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 8),
          cm.stack(2),
          'bg-surface-container-lowest rounded-3xl shadow-sm',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
          {t('billing.invoiceHeading', {}, { defaultValue: 'Invoice history' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'billing.invoiceBody',
            {},
            {
              defaultValue:
                'View, download, and manage invoices in your Stripe customer portal — accessible from your subscription receipt email.',
            },
          )}
        </p>
      </section>
    </div>
  )
}

export default Billing
