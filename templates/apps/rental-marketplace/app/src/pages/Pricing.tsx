import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import { unwrapList } from '../lib/unwrap.js'

interface TierPrice {
  period: 'month' | 'year'
  price: string
  stripePriceId: string | null
  savings?: string
}

interface Tier {
  key: string
  name: string
  prices: TierPrice[]
  limits: Record<string, unknown>
}

const COPY: Record<
  string,
  { eyebrow: string; cadence: string; blurb: string; features: string[] }
> = {
  free: {
    eyebrow: 'Always free',
    cadence: 'Always free',
    blurb: 'Browse, book, and message hosts. Free cancellation up to 48h.',
    features: [
      'Browse all listings',
      'Free cancellation up to 48h',
      '24/7 traveler support',
      'Wishlists & price-drop alerts',
    ],
  },
  pro: {
    eyebrow: 'Most popular',
    cadence: 'per month',
    blurb: 'For frequent travelers — earn miles, unlock premium stays, and skip service fees.',
    features: [
      'Everything in Free',
      'No service fees',
      `5% cashback in ${APP_NAME} miles`,
      'Priority host responses',
      'Early access to new properties',
    ],
  },
  team: {
    eyebrow: 'For travel managers',
    cadence: 'per month',
    blurb: 'For travel managers and small groups — pooled wallets and shared itineraries.',
    features: [
      'Everything in Pro',
      'Pooled team wallet',
      'Shared itineraries',
      'Centralized billing',
      'Travel manager dashboard',
    ],
  },
}

export function Pricing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tiers, setTiers] = useState<Tier[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void http
      .get('/api/billing/tiers')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<Tier>(res.data)
        setTiers(list)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const onUpgrade = async (priceId: string | null, key: string): Promise<void> => {
    if (!priceId) return
    setBusyKey(key)
    setError(null)
    try {
      const res = await http.post('/api/billing/checkout', { priceId })
      const body = ((res as { data?: unknown })?.data ?? res ?? {}) as {
        checkoutUrl?: string
        updated?: boolean
      }
      if (body.checkoutUrl) {
        window.location.assign(body.checkoutUrl)
      } else if (body.updated) {
        window.location.reload()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <ContentPageShell bare containerSize="xl" header={<Header />} footer={<Footer />}>
      <div data-mol-id="pricing-page" className={cm.cn(cm.sp('py', 4))}>
        <div className={cm.cn(cm.textCenter, cm.maxW('2xl'), cm.mxAuto, cm.sp('mb', 10))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary-dark',
            )}
          >
            {t('pricing.eyebrow', {}, { defaultValue: 'Simple, transparent' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('5xl'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 3),
              'leading-[0.95] tracking-tight font-display',
            )}
          >
            {t('pricing.heading', {}, { defaultValue: 'A plan that fits your travel rhythm' })}
          </h1>
          <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 4), 'text-on-surface-variant')}>
            {t(
              'pricing.subheading',
              {},
              {
                defaultValue:
                  'Travelers always book free. Pro adds zero service fees, miles, and priority support.',
              },
            )}
          </p>
        </div>

        {error ? (
          <p
            className={cm.cn(cm.sp('mt', 8), cm.textCenter, 'text-error')}
            role="alert"
            data-mol-id="pricing-error"
          >
            {error}
          </p>
        ) : null}

        {tiers === null && !error ? (
          <p className={cm.cn(cm.sp('mt', 12), cm.textCenter, 'text-on-surface-variant')}>
            {t('nav.loadingPlans', undefined, { defaultValue: 'Loading plans…' })}
          </p>
        ) : tiers !== null ? (
          <section className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}>
            {tiers.map((tier) => {
              const monthPrice = tier.prices.find((p) => p.period === 'month') ?? tier.prices[0]
              const isHighlight = tier.key === 'pro'
              const copy = COPY[tier.key] ?? {
                eyebrow: tier.name,
                cadence: 'per month',
                blurb: '',
                features: [],
              }
              const ctaLabel =
                tier.key === 'free'
                  ? t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })
                  : monthPrice?.stripePriceId
                    ? t(
                        'pricing.ctaUpgrade',
                        { tier: tier.name },
                        { defaultValue: `Start ${tier.name}` },
                      )
                    : t('pricing.ctaContact', {}, { defaultValue: 'Contact sales' })
              return (
                <article
                  key={tier.key}
                  data-mol-id={`pricing-tier-${tier.key}`}
                  className={cm.cn(
                    cm.sp('p', 8),
                    'rounded-[2rem] shadow-md flex flex-col',
                    isHighlight
                      ? 'bg-gradient-to-br from-primary to-primary-container text-white relative overflow-hidden ring-2 ring-accent'
                      : 'bg-surface',
                  )}
                >
                  {isHighlight ? (
                    <div
                      className={cm.cn(
                        cm.w(48),
                        cm.h(48),
                        cm.roundedFull,
                        'absolute -right-12 -top-12 bg-accent/40 blur-3xl',
                      )}
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="relative z-10">
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'uppercase tracking-[0.25em]',
                        isHighlight ? 'text-accent-on-surface' : 'text-primary-dark',
                      )}
                    >
                      {t(`pricing.plan.${tier.key}.tier`, {}, { defaultValue: tier.name })}
                    </p>
                    <p className={cm.cn(cm.sp('mt', 4), cm.flex({ align: 'baseline', gap: 'sm' }))}>
                      <span
                        className={cm.cn(
                          cm.textSize('5xl'),
                          cm.fontWeight('extrabold'),
                          'tabular-nums font-display',
                        )}
                      >
                        {monthPrice?.price ?? '—'}
                      </span>
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          isHighlight ? 'text-white/80' : 'text-on-surface-variant',
                        )}
                      >
                        {t(`pricing.plan.${tier.key}.cadence`, {}, { defaultValue: copy.cadence })}
                      </span>
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.sp('mt', 4),
                        isHighlight ? 'text-white/85' : 'text-on-surface-variant',
                        'leading-relaxed',
                      )}
                    >
                      {t(`pricing.plan.${tier.key}.blurb`, {}, { defaultValue: copy.blurb })}
                    </p>
                    <ul className={cm.cn(cm.sp('mt', 6), cm.flex({ direction: 'col', gap: 'sm' }))}>
                      {copy.features.map((f) => (
                        <li
                          key={f}
                          className={cm.cn(
                            cm.flex({ align: 'center', gap: 'sm' }),
                            cm.textSize('sm'),
                          )}
                        >
                          <span
                            className={cm.cn(
                              'material-symbols-outlined',
                              isHighlight ? 'text-accent-on-surface' : 'text-primary-dark',
                            )}
                            aria-hidden="true"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            check_circle
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    {tier.key === 'free' ? (
                      <Link
                        to="/login"
                        data-mol-id={`pricing-cta-${tier.key}`}
                        className={cm.cn(
                          cm.sp('mt', 8),
                          cm.sp('px', 5),
                          cm.sp('py', 3),
                          cm.fontWeight('bold'),
                          'block w-full text-center rounded-full',
                          'bg-primary text-on-primary hover:bg-primary-container',
                        )}
                      >
                        {ctaLabel}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        data-mol-id={`pricing-cta-${tier.key}`}
                        disabled={!monthPrice?.stripePriceId || busyKey === tier.key}
                        onClick={() => onUpgrade(monthPrice?.stripePriceId ?? null, tier.key)}
                        className={cm.cn(
                          cm.sp('mt', 8),
                          cm.sp('px', 5),
                          cm.sp('py', 3),
                          cm.fontWeight('bold'),
                          'block w-full text-center rounded-full disabled:opacity-50',
                          isHighlight
                            ? 'bg-accent text-on-primary hover:bg-accent-hover shadow-lg'
                            : 'bg-primary text-on-primary hover:bg-primary-container',
                        )}
                      >
                        {busyKey === tier.key
                          ? t('pricing.opening', {}, { defaultValue: 'Opening checkout…' })
                          : ctaLabel}
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </section>
        ) : null}
      </div>
    </ContentPageShell>
  )
}
