import { useEffect, useState } from 'react'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { error as logError } from '@molecule/app-logger'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'
import { unwrapList } from '../lib/api.js'

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
  limits: SportsLeagueLimits
  perSeat?: boolean
}

interface SportsLeagueLimits {
  maxSchedule?: number
  maxScores?: number
  maxStandings?: number
  maxTeams?: number
  advancedFeatures?: boolean
  canExport?: boolean
  retentionDays?: number
}

const formatNum = (n: number | undefined): string => {
  if (n === undefined || n === null) return '—'
  if (n >= 999_999) return '∞'
  return n.toLocaleString()
}

/**
 * Public pricing page.
 *
 * NOTE: We do **not** use `<PricingPage />` from `@molecule/app-billing-react`
 * because that component crashes when the `/billing/tiers` response shape
 * doesn't match its narrow internal expectation. Instead we render the
 * tiers directly from a fetch through `useHttpClient()` — the same path
 * every other page in this app uses, with a robust `unwrapList` that
 * handles both wrapped (`{ data: [] }`) and raw (`[]`) responses.
 */
export function Pricing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const auth = useAuth()
  const [tiers, setTiers] = useState<Tier[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/billing/tiers')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<Tier>(res)
        setTiers(list)
      })
      .catch(() => {
        if (cancelled) return
        setError(
          t('billing.pricing.error', undefined, {
            defaultValue: 'Could not load pricing. Try again later.',
          }),
        )
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const upgrade = async (priceId: string | null): Promise<void> => {
    if (!priceId) return
    if (!auth.isAuthenticated) {
      window.location.assign('/login')
      return
    }
    setStarting(true)
    try {
      const res = await http.post<{ checkoutUrl?: string; updated?: boolean }>(
        '/api/billing/checkout',
        { priceId },
      )
      const body =
        (res as { data?: { checkoutUrl?: string; updated?: boolean } } | undefined)?.data ??
        (res as { checkoutUrl?: string; updated?: boolean })
      if (body?.checkoutUrl) {
        window.location.assign(body.checkoutUrl)
        return
      }
      if (body?.updated) {
        window.location.reload()
        return
      }
      setError(
        t('billing.pricing.checkoutError', undefined, {
          defaultValue: 'Could not start checkout. Please try again.',
        }),
      )
    } catch (error) {
      logError('pricing.startCheckout', error)
      setError(
        t('billing.pricing.checkoutError', undefined, {
          defaultValue: 'Could not start checkout. Please try again.',
        }),
      )
    } finally {
      setStarting(false)
    }
  }

  return (
    <ContentPageShell bare containerSize="xl" header={<AuthBrandHeader />} footer={<Footer />}>
      <section
        className={cm.cn(cm.sp('py', 4), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}
        data-mol-id="pricing-page"
      >
        <header className={cm.stack(2)}>
          <p className={cm.cn('text-[11px] font-black uppercase tracking-[0.28em] text-primary')}>
            {t('pricing.eyebrow', undefined, { defaultValue: 'Choose your seat' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight font-display')}>
            {t(
              'pricing.heading',
              { appName: APP_NAME },
              { defaultValue: `Choose your ${APP_NAME} plan` },
            )}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('pricing.subtitle', undefined, {
              defaultValue: 'Upgrade for richer schedule, scores, and standings.',
            })}
          </p>
        </header>

        {error ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
            {error}
          </p>
        ) : null}

        {tiers === null ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('nav.loadingPlans', undefined, { defaultValue: 'Loading plans…' })}
          </p>
        ) : (
          <div
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3 items-stretch')}
          >
            {tiers.map((tier) => {
              const monthly = tier.prices.find((p) => p.period === 'month') ?? tier.prices[0]
              return (
                <article
                  key={tier.key}
                  data-mol-id={`pricing-tier-${tier.key}`}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'sm' }),
                    cm.sp('p', 6),
                    'rounded-2xl bg-surface-container-lowest border border-outline-variant/40',
                  )}
                >
                  <header className={cm.stack(1)}>
                    <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{tier.name}</h2>
                    <p className={cm.cn(cm.textSize('2xl'), 'font-extrabold tabular-nums')}>
                      {monthly?.price ?? '—'}
                    </p>
                  </header>
                  <ul className={cm.cn('text-sm text-on-surface-variant', cm.stack(1))}>
                    <li>
                      {t(
                        'pricing.limits.schedule',
                        { count: formatNum(tier.limits?.maxSchedule) },
                        { defaultValue: '{{count}} schedule entries' },
                      )}
                    </li>
                    <li>
                      {t(
                        'pricing.limits.scores',
                        { count: formatNum(tier.limits?.maxScores) },
                        { defaultValue: '{{count}} scores' },
                      )}
                    </li>
                    <li>
                      {t(
                        'pricing.limits.standings',
                        { count: formatNum(tier.limits?.maxStandings) },
                        { defaultValue: '{{count}} standings' },
                      )}
                    </li>
                    <li>
                      {t(
                        'pricing.limits.teams',
                        { count: formatNum(tier.limits?.maxTeams) },
                        { defaultValue: '{{count}} teams' },
                      )}
                    </li>
                    <li>
                      {t('common.advancedFeatures', undefined, {
                        defaultValue: 'Advanced features',
                      })}
                      : {tier.limits?.advancedFeatures ? '✓' : '—'}
                    </li>
                    <li>
                      {t('common.dataExport', undefined, { defaultValue: 'Data export' })}:{' '}
                      {tier.limits?.canExport ? '✓' : '—'}
                    </li>
                  </ul>
                  <footer className={cm.sp('mt', 4)}>
                    <button
                      type="button"
                      disabled={!monthly?.stripePriceId || starting}
                      onClick={() => upgrade(monthly?.stripePriceId ?? null)}
                      data-mol-id={`pricing-cta-${tier.key}`}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        'rounded-full font-extrabold text-sm uppercase tracking-widest transition-colors',
                        monthly?.stripePriceId
                          ? 'bg-primary text-on-primary hover:opacity-90'
                          : 'bg-surface-container text-on-surface-variant cursor-not-allowed',
                      )}
                    >
                      {monthly?.stripePriceId
                        ? t(
                            'pricing.upgradeCta',
                            { tierName: tier.name },
                            { defaultValue: 'Upgrade to {{tierName}}' },
                          )
                        : t('nav.currentPlan', undefined, { defaultValue: 'Current plan' })}
                    </button>
                  </footer>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </ContentPageShell>
  )
}
