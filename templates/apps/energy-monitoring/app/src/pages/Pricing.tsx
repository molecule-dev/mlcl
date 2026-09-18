import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
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
  category: string
  isFree: boolean
}

interface CheckoutResponse {
  checkoutUrl?: string
}

const FEATURES: Array<{ key: keyof TierLimits; label: string; format?: 'days' }> = [
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

export function Pricing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tiers, setTiers] = useState<TierRow[]>([])
  const [period, setPeriod] = useState<'month' | 'year'>('month')
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const tiersResp = await http.get<TierRow[]>('/api/billing/tiers')
        if (!cancelled) setTiers(unwrapList<TierRow>(tiersResp?.data))
        if (user) {
          const statusResp = await http.get<BillingStatus>('/api/billing/status').catch(() => null)
          if (statusResp && !cancelled) setStatus(unwrapSingle<BillingStatus>(statusResp.data))
        }
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : t('pricing.loadError', {}, { defaultValue: 'Could not load pricing.' }),
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t, user])

  const sortedTiers = useMemo(() => {
    const order = ['free', 'home', 'pro', 'team']
    return tiers.slice().sort((a, b) => {
      const ai = order.indexOf(a.key)
      const bi = order.indexOf(b.key)
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
    })
  }, [tiers])

  async function selectPlan(plan: TierRow): Promise<void> {
    if (!user) {
      navigate('/signup')
      return
    }
    if (plan.key === 'free') {
      navigate('/dashboard')
      return
    }
    const price = plan.prices.find((p) => p.period === period) ?? plan.prices[0]
    if (!price?.stripePriceId) {
      setError(
        t(
          'pricing.unavailable',
          {},
          { defaultValue: 'This plan is not available right now — Stripe is not configured.' },
        ),
      )
      return
    }
    setBusy(plan.key)
    try {
      const resp = await http.post<CheckoutResponse>('/api/billing/checkout', {
        priceId: price.stripePriceId,
      })
      const data = unwrapSingle<CheckoutResponse>(resp?.data) ?? {}
      if (data.checkoutUrl && typeof window !== 'undefined') {
        window.location.href = data.checkoutUrl
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('nav.couldNotStartCheckout', {}, { defaultValue: 'Could not start checkout.' }),
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <ContentPageShell bare containerSize="xl" header={<Header />} footer={<Footer />}>
      <div
        data-mol-id="pricing-page"
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 12), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}
      >
        <header className={cm.cn('text-center', cm.stack(3))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </p>
          <h1 className={cm.cn(cm.textSize('5xl'), 'font-extrabold font-display tracking-tighter')}>
            {t('pricing.heading', {}, { defaultValue: 'Plans for every meter' })}
          </h1>
          <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant max-w-2xl mx-auto')}>
            {t(
              'pricing.subheading',
              {},
              {
                defaultValue:
                  'Start free. Upgrade when you need more meters, longer history, or more alert rules.',
              },
            )}
          </p>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'sm' }))}>
            {(['month', 'year'] as const).map((p) => (
              <button
                key={p}
                type="button"
                data-mol-id={`pricing-period-${p}`}
                onClick={() => setPeriod(p)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'uppercase tracking-widest transition-all',
                  period === p
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
                )}
              >
                {t(
                  `pricing.period.${p}`,
                  {},
                  { defaultValue: p === 'month' ? 'Monthly' : 'Yearly' },
                )}
              </button>
            ))}
          </div>
        </header>

        {error ? (
          <p
            data-mol-id="pricing-error"
            role="alert"
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-xl bg-error-container text-on-error-container text-sm',
            )}
          >
            {error}
          </p>
        ) : null}

        {loading ? (
          <p
            data-mol-id="pricing-loading"
            className={cm.cn(cm.textCenter, cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t('pricing.loading', {}, { defaultValue: 'Loading plans…' })}
          </p>
        ) : (
          <section
            data-mol-id="pricing-grid"
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}
          >
            {sortedTiers.map((plan) => {
              const price = plan.prices.find((p) => p.period === period) ?? plan.prices[0]
              const isCurrent = !!status && status.category === plan.key
              return (
                <div
                  key={plan.key}
                  data-mol-id={`pricing-plan-${plan.key}`}
                  className={cm.cn(
                    cm.sp('p', 6),
                    'rounded-2xl border flex flex-col transition-all',
                    isCurrent
                      ? 'border-primary bg-primary/5'
                      : 'border-outline-variant/40 bg-surface-container-lowest hover:-translate-y-0.5 hover:shadow-md',
                  )}
                >
                  <p
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      cm.sp('mb', 2),
                    )}
                  >
                    {plan.name}
                  </p>
                  <p
                    data-mol-id={`pricing-plan-${plan.key}-price`}
                    className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tighter')}
                  >
                    {price?.price ?? '—'}
                  </p>
                  <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('my', 4))}>
                    {FEATURES.map(({ key, label, format }) => (
                      <li
                        key={key}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.textSize('sm'),
                        )}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-base text-primary')}
                          aria-hidden="true"
                        >
                          check_circle
                        </span>
                        <span className={cm.cn('flex-1')}>{label}</span>
                        <span className={cm.cn('font-bold tabular-nums text-on-surface-variant')}>
                          {formatLimit(plan.limits[key], format)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    data-mol-id={`pricing-plan-${plan.key}-cta`}
                    disabled={busy === plan.key || isCurrent}
                    onClick={() => void selectPlan(plan)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'rounded-xl mt-auto transition-all',
                      isCurrent
                        ? 'bg-surface-container text-on-surface-variant cursor-default'
                        : 'bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-60',
                    )}
                  >
                    {isCurrent
                      ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
                      : busy === plan.key
                        ? t('pricing.starting', {}, { defaultValue: 'Starting checkout…' })
                        : plan.key === 'free'
                          ? t('common.startFree', {}, { defaultValue: 'Start free' })
                          : t(
                              'pricing.choose',
                              { name: plan.name },
                              { defaultValue: 'Choose {{name}}' },
                            )}
                  </button>
                </div>
              )
            })}
          </section>
        )}

        <p className={cm.cn(cm.textCenter, cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('pricing.contact', {}, { defaultValue: 'Need something custom?' })}{' '}
          <Link
            to="/about"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}
          >
            {t('pricing.contactCta', {}, { defaultValue: 'Get in touch' })}
          </Link>
        </p>
      </div>
    </ContentPageShell>
  )
}

export default Pricing
