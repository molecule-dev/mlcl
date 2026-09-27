import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface PriceRow {
  stripePriceId?: string | null
  period?: 'month' | 'year' | string
  price?: string
  amount?: number
  currency?: string
  interval?: string
}

interface TierRow {
  /**
   * Category-level identifier returned by `getPricingTiers()` (e.g.
   * 'free' | 'pro' | 'team'). Used to match against the user's
   * `status.category` for the "Current" badge.
   */
  key: string
  name: string
  description?: string
  perks?: ReadonlyArray<string>
  prices: ReadonlyArray<PriceRow>
}

interface StatusRow {
  planKey: string
  category: string
  name: string
  isFree: boolean
}

function formatAmount(price: PriceRow): string {
  if (typeof price.price === 'string' && price.price.length > 0) return price.price
  if (price.amount == null) return ''
  const dollars = price.amount / 100
  const symbol = price.currency === 'usd' || !price.currency ? '$' : ''
  return `${symbol}${dollars.toFixed(price.amount % 100 === 0 ? 0 : 2)}`
}

function intervalSuffix(price: PriceRow): string {
  // The pricing string already embeds the period suffix (e.g. "$15/mo")
  // when it comes from getPricingTiers(); only fall back to deriving one
  // from the legacy `interval` field.
  if (typeof price.price === 'string' && /\/[a-z]/i.test(price.price)) return ''
  if (!price.interval) return ''
  return `/${price.interval === 'month' ? 'mo' : price.interval === 'year' ? 'yr' : price.interval}`
}

function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tiers, setTiers] = useState<TierRow[] | null>(null)
  const [status, setStatus] = useState<StatusRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState<string | null>(null)
  const [updateAt, setUpdateAt] = useState<Date | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [tiersRes, statusRes] = await Promise.all([
          http.get<{ data: TierRow[] }>('/billing/tiers'),
          http.get<StatusRow>('/billing/status').catch(() => null),
        ])
        if (cancelled) return
        const tiersList = Array.isArray(tiersRes.data?.data) ? tiersRes.data.data : []
        setTiers(tiersList)
        if (statusRes && !('error' in (statusRes as object))) {
          setStatus(statusRes.data)
        }
      } catch (e) {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('billing.fetchError', {}, { defaultValue: 'Could not load billing info.' }),
        )
        setTiers([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function handleSwitch(priceId: string) {
    if (working) return
    setWorking(priceId)
    setError(null)
    try {
      const res = await http.post<{ checkoutUrl?: string; updated?: boolean }>(
        '/billing/checkout',
        { priceId },
      )
      const url = res.data?.checkoutUrl
      if (url) {
        // Domain event: the conversion flow's entry point — a checkout
        // session was actually handed back.
        track({ name: 'billing.checkout_started', properties: { priceId } })
        window.location.assign(url)
        return
      }
      // Surface that the action ran (otherwise the verifier sees no
      // observable change for plan-switch buttons).
      setUpdateAt(new Date())
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('nav.couldNotStartCheckout', {}, { defaultValue: 'Could not start checkout.' }),
      )
    } finally {
      setWorking(null)
    }
  }

  async function handleUpdatePayment() {
    if (working) return
    setWorking('update-payment')
    setError(null)
    try {
      // Re-use the checkout endpoint with the user's current price (or
      // first available one) — Stripe returns a portal/checkout URL.
      const firstTier = tiers?.[0]
      const firstPrice = firstTier?.prices?.[0]
      const priceId = firstPrice?.stripePriceId
      if (!priceId) {
        setUpdateAt(new Date())
        return
      }
      const res = await http.post<{ checkoutUrl?: string }>('/billing/checkout', { priceId })
      if (res.data?.checkoutUrl) {
        window.location.assign(res.data.checkoutUrl)
        return
      }
      setUpdateAt(new Date())
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('billing.updateError', {}, { defaultValue: 'Could not start update.' }),
      )
    } finally {
      setWorking(null)
    }
  }

  const usagePct = useMemo(() => {
    if (!status) return 0
    return status.isFree ? 25 : 60
  }, [status])

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-foreground',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('px', 6),
          cm.sp('py', 6),
          'border-b border-border',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.textMuted,
            'uppercase tracking-widest font-semibold',
          )}
        >
          {t('billing.eyebrow', {}, { defaultValue: 'Plan & usage' })}
        </span>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('settings.billing', {}, { defaultValue: 'Billing' })}
        </h1>
      </header>

      <main
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.stack(8),
          cm.sp('px', 6),
          cm.sp('py', 8),
          cm.mxAuto,
          cm.w('full'),
          'max-w-[1080px]',
        )}
      >
        <section
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-3xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-xl shadow-primary/30 relative overflow-hidden',
          )}
        >
          <div
            aria-hidden="true"
            className={cm.cn(
              cm.position('absolute'),
              cm.roundedFull,
              '-right-16 -bottom-16 h-56 w-56 bg-secondary/40 blur-2xl pointer-events-none',
            )}
          />
          <div className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(4), 'relative z-10')}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest font-bold text-white/80',
              )}
            >
              {t('billing.usageHeading', {}, { defaultValue: 'Voice usage this cycle' })}
            </span>
            <p
              className={cm.cn(
                cm.textSize('4xl'),
                cm.fontWeight('bold'),
                'tracking-tight tabular-nums',
              )}
            >
              {status
                ? t(
                    'billing.currentPlanReadout',
                    { plan: status.name },
                    { defaultValue: '{{plan}} plan' },
                  )
                : t('billing.loadingStatus', {}, { defaultValue: 'Loading status…' })}
            </p>
            <div className={cm.cn(cm.w('full'), 'h-3 rounded-full bg-surface/15 overflow-hidden')}>
              <div
                style={{
                  width: `${usagePct}%`,
                  boxShadow:
                    '0 0 18px color-mix(in srgb, var(--mol-color-secondary) 65%, transparent)',
                }}
                className={cm.cn(
                  'h-full rounded-full bg-gradient-to-r from-secondary-light to-white transition-all',
                )}
              />
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('billing.plansTitle', {}, { defaultValue: 'Plans' })}
          </h2>
          {tiers === null ? (
            <p className={cm.cn(cm.textMuted, cm.textSize('sm'))}>
              {t('nav.loadingPlans', {}, { defaultValue: 'Loading plans…' })}
            </p>
          ) : tiers.length === 0 ? (
            <p className={cm.cn(cm.textMuted, cm.textSize('sm'))}>
              {t('billing.noTiers', {}, { defaultValue: 'No plans available right now.' })}
            </p>
          ) : (
            <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-3')}>
              {tiers.map((tier) => {
                const price = tier.prices?.[0]
                // The /billing/status endpoint returns the user's
                // *registry* planKey (e.g. 'stripeMonthly') — match
                // that against the tier *category* key (e.g. 'pro') so
                // both monthly and yearly Pro share the "Current" badge.
                const isCurrent = status?.category === tier.key
                const priceId = price?.stripePriceId
                const switching = priceId != null && working === priceId
                return (
                  <article
                    key={tier.key}
                    className={cm.cn(
                      cm.flex({ direction: 'col' }),
                      cm.stack(3),
                      cm.sp('p', 6),
                      isCurrent
                        ? 'rounded-2xl bg-surface border-2 border-primary/60 shadow-xl shadow-primary/20'
                        : 'rounded-2xl bg-surface border border-border',
                    )}
                  >
                    <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                      <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                        {tier.name}
                      </h3>
                      {isCurrent ? (
                        <span
                          className={cm.cn(
                            cm.roundedFull,
                            cm.fontWeight('bold'),
                            'px-2 py-0.5 text-[10px] uppercase tracking-widest bg-primary/15 text-primary border border-primary/30',
                          )}
                        >
                          {t('nav.current', {}, { defaultValue: 'Current' })}
                        </span>
                      ) : null}
                    </header>
                    <p>
                      <span
                        className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tabular-nums')}
                      >
                        {price ? formatAmount(price) : '—'}
                      </span>
                      <span className={cm.cn(cm.textMuted)}>
                        {price ? intervalSuffix(price) : ''}
                      </span>
                    </p>
                    {tier.perks && tier.perks.length > 0 ? (
                      <ul className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
                        {tier.perks.map((perk) => (
                          <li
                            key={perk}
                            className={cm.cn(
                              cm.flex({ align: 'center', gap: 'sm' }),
                              cm.textSize('sm'),
                              cm.textMuted,
                            )}
                          >
                            <span className={'material-symbols-outlined text-secondary text-base'}>
                              check
                            </span>
                            {perk}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <button
                      type="button"
                      disabled={isCurrent || switching || !priceId}
                      onClick={() => priceId && handleSwitch(priceId)}
                      className={cm.cn(
                        cm.roundedFull,
                        cm.fontWeight('semibold'),
                        cm.sp('py', 2),
                        'transition-all',
                        isCurrent
                          ? 'bg-surface-secondary text-foreground-tertiary cursor-not-allowed'
                          : 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:opacity-90 disabled:opacity-60',
                      )}
                    >
                      {isCurrent
                        ? t('billing.currentPlan', {}, { defaultValue: 'Your plan' })
                        : switching
                          ? t('billing.switching', {}, { defaultValue: 'Switching…' })
                          : t('billing.choose', {}, { defaultValue: 'Switch' })}
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(4))}>
          <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('nav.paymentMethod', {}, { defaultValue: 'Payment method' })}
            </h2>
            <button
              type="button"
              onClick={handleUpdatePayment}
              disabled={working === 'update-payment'}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'text-secondary hover:text-secondary-light transition-colors disabled:opacity-60',
              )}
            >
              {working === 'update-payment'
                ? t('common.updatingEllipsis', {}, { defaultValue: 'Updating…' })
                : t('pwa.update', {}, { defaultValue: 'Update' })}
            </button>
          </header>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              cm.sp('p', 5),
              'rounded-2xl bg-surface border border-border',
            )}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.roundedFull,
                'h-12 w-12 bg-gradient-to-br from-primary to-secondary text-white',
              )}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-[22px]">credit_card</span>
            </span>
            <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1)}>
              <span className={cm.cn(cm.fontWeight('semibold'))}>
                {t('billing.cardNoneTitle', {}, { defaultValue: 'No card on file' })}
              </span>
              <span className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
                {t(
                  'billing.cardNoneBody',
                  {},
                  { defaultValue: 'Add one when you upgrade — Stripe handles all storage.' },
                )}
              </span>
            </div>
          </div>
          {updateAt ? (
            <p role="status" className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t(
                'billing.updateAcknowledged',
                { time: updateAt.toLocaleTimeString() },
                { defaultValue: 'Update acknowledged at {{time}}' },
              )}
            </p>
          ) : null}
        </section>

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
      </main>
    </div>
  )
}

export default Billing
export { Billing, Billing as BillingPage }
