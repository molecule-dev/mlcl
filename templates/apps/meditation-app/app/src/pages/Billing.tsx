import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StillpointTopBar } from '../components/StillpointTopBar.js'
import type { ApiBillingStatus, ApiBillingTier } from '../lib/api.js'

type Period = 'month' | 'year'

interface CheckoutResponse {
  checkoutUrl?: string
  updated?: boolean
}

/** Human-readable defaults for the tier limit keys returned by /billing/tiers. */
const LIMIT_LABELS: Record<string, string> = {
  maxCategories: 'Categories',
  maxHistory: 'History entries',
  maxSessions: 'Sessions',
  maxStats: 'Stats views',
  advancedFeatures: 'Advanced features',
  canExport: 'Data export',
  retentionDays: 'History retention (days)',
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [tiers, setTiers] = useState<ApiBillingTier[]>([])
  const [status, setStatus] = useState<ApiBillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('month')
  const [busyPriceId, setBusyPriceId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const reload = async () => {
    setLoading(true)
    try {
      const [tiersRes, statusRes] = await Promise.all([
        http.get<{ data: ApiBillingTier[] } | ApiBillingTier[]>('/billing/tiers'),
        http.get<ApiBillingStatus>('/billing/status'),
      ])
      const data = tiersRes.data as { data?: ApiBillingTier[] } | ApiBillingTier[]
      setTiers(Array.isArray(data) ? data : (data.data ?? []))
      setStatus(statusRes.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const planNameByKey = useMemo(() => {
    const m = new Map<string, string>()
    for (const tier of tiers) m.set(tier.key, tier.name)
    return m
  }, [tiers])

  const currentName = status?.name ?? planNameByKey.get(status?.planKey ?? '') ?? 'Free'

  const handleCheckout = async (priceId: string) => {
    if (busyPriceId) return
    setBusyPriceId(priceId)
    setActionError(null)
    void track({ name: 'checkout.started', properties: { price_id: priceId } })
    try {
      const res = await http.post<CheckoutResponse>('/billing/checkout', { priceId })
      const body = res.data as CheckoutResponse
      if (body?.checkoutUrl) {
        window.location.assign(body.checkoutUrl)
        return
      }
      if (body?.updated) {
        await reload()
        return
      }
      setActionError(
        t('stillpoint.billing.unknownResult', {}, { defaultValue: 'Unexpected billing response.' }),
      )
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyPriceId(null)
    }
  }

  const handleCancel = async () => {
    if (busyPriceId) return
    setBusyPriceId('cancel')
    setActionError(null)
    try {
      await http.post('/billing/cancel', {})
      await reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyPriceId(null)
    }
  }

  return (
    <>
      <StillpointTopBar
        title={t('stillpoint.billing.heading', {}, { defaultValue: 'Plans & billing' })}
        eyebrow={
          <span data-testid="billing-current-plan">
            {t(
              'stillpoint.billing.currentPlan',
              { plan: currentName },
              { defaultValue: 'Currently on {{plan}}' },
            )}
          </span>
        }
      />

      {actionError ? (
        <div
          data-testid="billing-action-error"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-2xl border border-error text-error bg-error-container/30',
          )}
        >
          {actionError}
        </div>
      ) : null}

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            'rounded-full bg-surface-container-low p-1 border border-outline',
          )}
        >
          {(['month', 'year'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              data-testid={`billing-period-${p}`}
              onClick={() => setPeriod(p)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full transition-colors',
                period === p
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-variant',
              )}
            >
              {p === 'month'
                ? t('status.monthly', {}, { defaultValue: 'Monthly' })
                : t('stillpoint.billing.yearly', {}, { defaultValue: 'Yearly · save 17%' })}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={cm.cn(cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      ) : error ? (
        <div
          data-testid="billing-error"
          className={cm.cn(
            cm.sp('p', 8),
            cm.textCenter,
            'rounded-2xl border border-dashed border-error text-error',
          )}
        >
          {t('stillpoint.billing.loadError', {}, { defaultValue: "We couldn't load plans." })}
        </div>
      ) : tiers.length === 0 ? (
        <div
          data-testid="billing-empty"
          className={cm.cn(
            cm.sp('p', 8),
            cm.textCenter,
            'rounded-2xl border border-dashed border-outline text-on-surface-variant',
          )}
        >
          {t('stillpoint.billing.empty', {}, { defaultValue: 'No paid plans configured yet.' })}
        </div>
      ) : (
        <div data-testid="billing-tiers" className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-4')}>
          {tiers.map((tier) => {
            const price = tier.prices.find((p) => p.period === period) ?? tier.prices[0]
            const isCurrent = tier.key === status?.planKey
            const limitsArr = Object.entries(tier.limits ?? {})
            return (
              <article
                key={tier.key}
                data-testid={`billing-tier-${tier.key}`}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'md' }),
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest shadow-sm border',
                  isCurrent ? 'border-primary ring-2 ring-primary/30' : 'border-outline/30',
                )}
              >
                <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <h2
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-xl text-on-surface tracking-tight',
                    )}
                  >
                    {tier.name}
                  </h2>
                  {isCurrent ? (
                    <span
                      data-testid={`billing-tier-${tier.key}-current`}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        'rounded-full bg-primary-container text-on-primary-container font-bold uppercase tracking-widest',
                      )}
                    >
                      {t('nav.current', {}, { defaultValue: 'Current' })}
                    </span>
                  ) : null}
                </header>
                <div>
                  <p
                    className={cm.cn(
                      'text-4xl font-extrabold text-on-surface tabular-nums tracking-tight',
                    )}
                  >
                    {price?.price ?? '$0'}
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-on-surface-variant font-medium ml-1',
                      )}
                    >
                      {period === 'month'
                        ? t('stillpoint.billing.perMonthShort', {}, { defaultValue: '/mo' })
                        : t('stillpoint.billing.perYearShort', {}, { defaultValue: '/yr' })}
                    </span>
                  </p>
                </div>
                {limitsArr.length > 0 ? (
                  <ul
                    className={cm.cn(
                      cm.flex({ direction: 'col', gap: 'xs' }),
                      'list-none text-sm text-on-surface-variant',
                    )}
                  >
                    {limitsArr.map(([key, value]) => {
                      // 0 retentionDays and the 999 999 sentinel both mean "unlimited"
                      // (see api/src/tiers.ts) — show ∞ instead of a fake-looking number.
                      const unlimited =
                        typeof value === 'number' &&
                        (value === -1 ||
                          value >= 999_999 ||
                          (key === 'retentionDays' && value === 0))
                      return (
                        <li key={key} className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                          <span
                            aria-hidden="true"
                            className={cm.cn('material-symbols-outlined text-base text-primary')}
                          >
                            check
                          </span>
                          <span className={cm.cn('flex-1')}>
                            {t(
                              `stillpoint.billing.limits.${key}`,
                              {},
                              { defaultValue: LIMIT_LABELS[key] ?? key },
                            )}
                          </span>
                          <span className={cm.cn('font-semibold text-on-surface tabular-nums')}>
                            {typeof value === 'boolean'
                              ? value
                                ? '✓'
                                : '—'
                              : unlimited
                                ? '∞'
                                : value}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                ) : null}
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'mt-auto')}>
                  {price?.stripePriceId && !isCurrent ? (
                    <button
                      type="button"
                      data-testid={`billing-checkout-${tier.key}`}
                      onClick={() => void handleCheckout(price.stripePriceId as string)}
                      disabled={busyPriceId === price.stripePriceId}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.fontWeight('bold'),
                        cm.textSize('sm'),
                        'rounded-full bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50',
                      )}
                    >
                      {busyPriceId === price.stripePriceId
                        ? t('stillpoint.billing.opening', {}, { defaultValue: 'Opening checkout…' })
                        : t(
                            'stillpoint.billing.choose',
                            { plan: tier.name },
                            { defaultValue: 'Choose {{plan}}' },
                          )}
                    </button>
                  ) : !price?.stripePriceId && !isCurrent ? (
                    <span
                      data-testid={`billing-tier-${tier.key}-not-configured`}
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant italic text-center',
                      )}
                    >
                      {t(
                        'stillpoint.billing.notConfigured',
                        {},
                        { defaultValue: 'Pricing not configured yet.' },
                      )}
                    </span>
                  ) : null}
                  {isCurrent && !status?.isFree ? (
                    <button
                      type="button"
                      data-testid="billing-cancel"
                      onClick={() => void handleCancel()}
                      disabled={busyPriceId === 'cancel'}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'rounded-full border border-outline text-on-surface-variant hover:bg-surface-variant transition-colors disabled:opacity-50',
                      )}
                    >
                      {busyPriceId === 'cancel'
                        ? t('stillpoint.billing.canceling', {}, { defaultValue: 'Canceling…' })
                        : t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
