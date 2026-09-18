import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface PriceRow {
  stripePriceId?: string
  amount?: number
  currency?: string
  interval?: string
  period?: 'month' | 'year'
  price?: string
  savings?: string
}

interface TierLimits {
  maxConversations?: number
  maxSpeech?: number
  advancedFeatures?: boolean
  canExport?: boolean
}

interface TierRow {
  key?: string
  planKey?: string
  name: string
  description?: string
  perks?: ReadonlyArray<string>
  prices: ReadonlyArray<PriceRow>
  limits?: TierLimits
}

const formatNum = (n: number | undefined): string => {
  if (n == null) return '—'
  if (n >= 999_999) return '∞'
  return n.toLocaleString()
}

const formatAmount = (price: PriceRow): string => {
  if (price.price) return price.price
  if (price.amount == null) return '—'
  const dollars = price.amount / 100
  const symbol = price.currency === 'usd' || !price.currency ? '$' : ''
  return `${symbol}${dollars.toFixed(price.amount % 100 === 0 ? 0 : 2)}`
}

const intervalLabel = (price: PriceRow): string => {
  // The pricing string from getPricingTiers() already embeds the
  // period suffix (e.g. "$15/mo"), so don't double-stamp it.
  if (typeof price.price === 'string' && /\/[a-z]/i.test(price.price)) return ''
  const interval = price.interval ?? price.period
  if (!interval) return ''
  return `/${interval === 'month' ? 'mo' : interval === 'year' ? 'yr' : interval}`
}

/**
 * Public pricing page.
 *
 * Fetches `/billing/tiers` (publicly accessible) and renders one card per
 * tier with the per-tier limits readout. Every user-visible string flows
 * through `t()` (G12 gate). Uses bare-path http calls to align with the
 * rest of the app (the http bond resolves these to `/api/...` via the
 * Vite proxy / `VITE_API_URL`).
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { isAuthenticated } = useAuth()
  const authed = Boolean(isAuthenticated)
  const [tiers, setTiers] = useState<TierRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await http.get<{ data: TierRow[] }>('/billing/tiers')
        if (cancelled) return
        const list = Array.isArray(res.data?.data) ? res.data.data : []
        setTiers(list)
      } catch (e) {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('pricing.error', {}, { defaultValue: 'Could not load pricing. Try again later.' }),
        )
        setTiers([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <ContentPageShell bare containerSize="xl" header={<Header />} footer={<Footer />}>
      <section
        className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(6), cm.sp('p', 6))}
        data-mol-id="pricing-page"
      >
        <header className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t(
              'pricing.title',
              { app: APP_NAME },
              { defaultValue: `Choose your ${APP_NAME} plan` },
            )}
          </h1>
          <p className={cm.cn(cm.textMuted, cm.textSize('sm'))}>
            {t(
              'pricing.subtitle',
              {},
              { defaultValue: 'Pick a plan that fits how often you talk to your assistant.' },
            )}
          </p>
        </header>

        {error ? (
          <p
            role="alert"
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 3),
              'rounded-xl bg-error/15 text-error border border-error/30',
            )}
          >
            {error}
          </p>
        ) : null}

        {tiers === null && !error ? (
          <p className={cm.cn(cm.textMuted, cm.textSize('sm'))}>
            {t('nav.loadingPlans', {}, { defaultValue: 'Loading plans…' })}
          </p>
        ) : null}

        {tiers && tiers.length > 0 ? (
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-3')}>
            {tiers.map((tier) => {
              const tierKey = tier.key ?? tier.planKey ?? tier.name
              const price = tier.prices?.[0]
              const isFree = (tier.key ?? tier.planKey) === 'free'
              const ctaPath = authed ? '/settings/billing' : isFree ? '/signup' : '/signup'
              const ctaLabel = isFree
                ? authed
                  ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
                  : t('pricing.cta.startFree', {}, { defaultValue: 'Get started free' })
                : authed
                  ? t(
                      'pricing.cta.upgrade',
                      { tierName: tier.name },
                      { defaultValue: 'Upgrade to {{tierName}}' },
                    )
                  : t(
                      'pricing.cta.start',
                      { tierName: tier.name },
                      { defaultValue: 'Choose {{tierName}}' },
                    )
              return (
                <article
                  key={tierKey}
                  className={cm.cn(
                    cm.flex({ direction: 'col' }),
                    cm.stack(3),
                    cm.sp('p', 6),
                    'rounded-2xl bg-surface border border-border',
                  )}
                  data-mol-id={`pricing-tier-${tierKey}`}
                >
                  <header className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(1))}>
                    <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{tier.name}</h2>
                    {tier.description ? (
                      <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>{tier.description}</p>
                    ) : null}
                  </header>
                  <p>
                    <span
                      className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tabular-nums')}
                    >
                      {price ? formatAmount(price) : '—'}
                    </span>
                    <span className={cm.cn(cm.textMuted)}>{price ? intervalLabel(price) : ''}</span>
                  </p>
                  <ul className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
                    <li className={cm.cn(cm.textSize('sm'))}>
                      {t(
                        'pricing.conversations',
                        { count: formatNum(tier.limits?.maxConversations) },
                        { defaultValue: '{{count}} conversations' },
                      )}
                    </li>
                    <li className={cm.cn(cm.textSize('sm'))}>
                      {t(
                        'pricing.speech',
                        { count: formatNum(tier.limits?.maxSpeech) },
                        { defaultValue: '{{count}} speech' },
                      )}
                    </li>
                    <li className={cm.cn(cm.textSize('sm'))}>
                      {t('common.advancedFeatures', {}, { defaultValue: 'Advanced features' })}:{' '}
                      {tier.limits?.advancedFeatures ? '✓' : '—'}
                    </li>
                    <li className={cm.cn(cm.textSize('sm'))}>
                      {t('common.dataExport', {}, { defaultValue: 'Data export' })}:{' '}
                      {tier.limits?.canExport ? '✓' : '—'}
                    </li>
                  </ul>
                  <Link
                    to={ctaPath}
                    data-mol-id={`pricing-cta-${tierKey}`}
                    className={cm.cn(
                      cm.button({ variant: isFree ? 'outline' : 'solid' }),
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'mt-auto justify-center',
                    )}
                    aria-label={ctaLabel}
                  >
                    {ctaLabel}
                  </Link>
                </article>
              )
            })}
          </div>
        ) : null}

        {tiers && tiers.length === 0 && !error ? (
          <p className={cm.cn(cm.textMuted, cm.textSize('sm'))}>
            {t('pricing.empty', {}, { defaultValue: 'No plans available right now.' })}
          </p>
        ) : null}
      </section>
    </ContentPageShell>
  )
}

export default Pricing
