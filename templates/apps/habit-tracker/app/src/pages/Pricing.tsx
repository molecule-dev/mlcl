import { useEffect, useState } from 'react'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { LandingNav } from '../components/LandingNav.js'
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
  perSeat?: boolean
}

/**
 * Public pricing page.
 *
 * Renders the tier ladder declared in the API's `tiers.ts` (Free / Pro /
 * Team) with a Stripe-Checkout-backed upgrade CTA. Hits the standard
 * `/api/billing/*` endpoints directly so we don't depend on the
 * framework hook's implicit baseURL convention.
 *
 * @returns The rendered pricing page.
 */
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
      const body = (res.data ?? {}) as { checkoutUrl?: string; updated?: boolean }
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
    <ContentPageShell bare containerSize="xl" header={<LandingNav />} footer={<Footer />}>
      <section
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 12), cm.maxW('5xl'), cm.mxAuto)}
        data-mol-id="pricing-page"
      >
        <header className={cm.cn(cm.textCenter, cm.sp('mb', 10))}>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('pricing.heading', { app: APP_NAME }, { defaultValue: 'Choose your {{app}} plan' })}
          </h1>
        </header>
        {tiers === null && !error ? (
          <p className={cm.textCenter}>
            {t('billing.pricing.loading', undefined, { defaultValue: 'Loading plans…' })}
          </p>
        ) : error ? (
          <p className={cm.cn(cm.textCenter, cm.formError)} role="alert">
            {error}
          </p>
        ) : (
          <div
            className={cm.cn(
              cm.flex({ direction: 'row', wrap: 'wrap', gap: 'md', justify: 'center' }),
            )}
          >
            {tiers!.map((tier) => {
              const monthPrice = tier.prices.find((p) => p.period === 'month') ?? tier.prices[0]
              const limits = tier.limits || {}
              const read = (k: string): unknown => limits[k]
              return (
                <article
                  key={tier.key}
                  data-mol-id={`pricing-tier-${tier.key}`}
                  className={cm.cn(
                    'rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm flex flex-col',
                    cm.sp('p', 6),
                  )}
                  style={{ minWidth: 240, flex: '1 1 240px', maxWidth: 320 }}
                >
                  <header className={cm.cn(cm.sp('mb', 4))}>
                    <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>{tier.name}</h2>
                    <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 1))}>
                      {monthPrice?.price ?? '—'}
                    </p>
                  </header>
                  <ul className={cm.cn('flex-1', cm.sp('mb', 6), 'space-y-1', cm.textSize('sm'))}>
                    <li>
                      {t(
                        'pricing.entries',
                        { count: formatNum(read('maxEntries')) },
                        { defaultValue: '{{count}} entries' },
                      )}
                    </li>
                    <li>
                      {t(
                        'pricing.habits',
                        { count: formatNum(read('maxHabits')) },
                        { defaultValue: '{{count}} habits' },
                      )}
                    </li>
                    <li>
                      {t(
                        'pricing.stats',
                        { count: formatNum(read('maxStats')) },
                        { defaultValue: '{{count}} stats' },
                      )}
                    </li>
                    <li>
                      {t(
                        'pricing.advanced',
                        { v: read('advancedFeatures') ? '✓' : '—' },
                        { defaultValue: 'Advanced features: {{v}}' },
                      )}
                    </li>
                    <li>
                      {t(
                        'pricing.export',
                        { v: read('canExport') ? '✓' : '—' },
                        { defaultValue: 'Data export: {{v}}' },
                      )}
                    </li>
                  </ul>
                  <button
                    type="button"
                    data-mol-id={`pricing-cta-${tier.key}`}
                    disabled={!monthPrice?.stripePriceId || busyKey === tier.key}
                    onClick={() => onUpgrade(monthPrice?.stripePriceId ?? null, tier.key)}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      'rounded-full text-on-primary shadow-sm disabled:opacity-50',
                    )}
                    style={{
                      background:
                        'linear-gradient(90deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))',
                    }}
                  >
                    {monthPrice?.stripePriceId
                      ? t(
                          'pricing.upgradeCta',
                          { tierName: tier.name },
                          { defaultValue: 'Upgrade to {{tierName}}' },
                        )
                      : t('billing.pricing.currentCta', undefined, {
                          defaultValue: 'Current plan',
                        })}
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </ContentPageShell>
  )
}

function formatNum(value: unknown): string {
  if (typeof value !== 'number') return '0'
  if (value >= 999_999) return '∞'
  return value.toLocaleString()
}
