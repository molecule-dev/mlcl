import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface TierLimits {
  maxRecordings?: number
  maxComments?: number
  maxViews?: number
  advancedFeatures?: boolean
  canExport?: boolean
  retentionDays?: number
}

interface TierStatus {
  planKey: string
  category: 'free' | 'pro' | 'team'
  name: string
  limits: TierLimits
  isFree: boolean
}

interface PriceOption {
  period: 'month' | 'year'
  price: string
  stripePriceId: string | null
}

interface PricingTier {
  key: string
  name: string
  prices: PriceOption[]
  limits: TierLimits
}

interface UsageRow {
  id: keyof TierLimits
  label: string
  used: number
  unit: string
}

const PLAN_BLURB: Record<TierStatus['category'], string> = {
  free: 'Get started with up to 5 recordings.',
  pro: 'Unlimited recording, advanced analytics, and exports.',
  team: 'Everything in Pro plus seats, SSO, and unlimited retention.',
}

function unwrap<T>(payload: unknown, fallback: T): T {
  if (payload == null) return fallback
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in (payload as Record<string, unknown>)
  ) {
    const data = (payload as { data?: unknown }).data
    if (data !== undefined) return data as T
  }
  return payload as T
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [status, setStatus] = useState<TierStatus | null>(null)
  const [tiers, setTiers] = useState<PricingTier[]>([])
  const [usage, setUsage] = useState<UsageRow[]>([])
  const [period, setPeriod] = useState<'month' | 'year'>('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyPriceId, setBusyPriceId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [canceling, setCanceling] = useState(false)

  const refresh = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const [statusRes, tiersRes, recRes] = await Promise.all([
        http.get('/api/billing/status'),
        http.get('/api/billing/tiers'),
        http.get('/api/recordings'),
      ])
      const statusData = unwrap<TierStatus | null>(statusRes?.data, null)
      const tiersData = unwrap<PricingTier[]>(tiersRes?.data, [])
      const recordings = unwrap<Array<{ view_count?: number; comment_count?: number }>>(
        recRes?.data,
        [],
      )
      const recList = Array.isArray(recordings) ? recordings : []
      const totalViews = recList.reduce(
        (sum, r) => sum + (typeof r.view_count === 'number' ? r.view_count : 0),
        0,
      )
      const totalComments = recList.reduce(
        (sum, r) => sum + (typeof r.comment_count === 'number' ? r.comment_count : 0),
        0,
      )
      setStatus(statusData)
      setTiers(Array.isArray(tiersData) ? tiersData : [])
      setUsage([
        {
          id: 'maxRecordings',
          label: t('billing.usage.recordings', {}, { defaultValue: 'Recordings' }),
          used: recList.length,
          unit: t('billing.usage.recordings.unit', {}, { defaultValue: 'clips' }),
        },
        {
          id: 'maxComments',
          label: t('billing.usage.comments', {}, { defaultValue: 'Comments' }),
          used: totalComments,
          unit: t('billing.usage.comments.unit', {}, { defaultValue: 'comments' }),
        },
        {
          id: 'maxViews',
          label: t('billing.usage.views', {}, { defaultValue: 'Views' }),
          used: totalViews,
          unit: t('billing.usage.views.unit', {}, { defaultValue: 'views' }),
        },
      ])
    } catch (error) {
      setError(
        t('billing.error.load', {}, { defaultValue: 'Could not load billing details. Try again.' }),
      )
      console.error('billing.refresh', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentLimits = status?.limits ?? {}
  const planBlurb = status ? PLAN_BLURB[status.category] : ''

  const handleUpgrade = async (priceId: string): Promise<void> => {
    if (!priceId) return
    setBusyPriceId(priceId)
    setActionMessage(null)
    try {
      const res = await http.post<{ checkoutUrl?: string; updated?: boolean }>(
        '/api/billing/checkout',
        { priceId },
      )
      const payload = (res?.data ?? {}) as { checkoutUrl?: string; updated?: boolean }
      if (payload.checkoutUrl) {
        window.location.href = payload.checkoutUrl
        return
      }
      if (payload.updated) {
        setActionMessage(
          t('nav.subscriptionUpdated', {}, { defaultValue: 'Subscription updated.' }),
        )
        await refresh()
      } else {
        setActionMessage(
          t('billing.error.checkout', {}, { defaultValue: 'Could not start checkout. Try again.' }),
        )
      }
    } catch (error) {
      setActionMessage(
        t('billing.error.checkout', {}, { defaultValue: 'Could not start checkout. Try again.' }),
      )
      console.error('billing.handleUpgrade', error)
    } finally {
      setBusyPriceId(null)
    }
  }

  const handleCancel = async (): Promise<void> => {
    setCanceling(true)
    setActionMessage(null)
    try {
      await http.post('/api/billing/cancel')
      setActionMessage(t('billing.action.canceled', {}, { defaultValue: 'Subscription canceled.' }))
      await refresh()
    } catch (error) {
      setActionMessage(
        t('billing.error.cancel', {}, { defaultValue: 'No active subscription to cancel.' }),
      )
      console.error('billing.handleCancel', error)
    } finally {
      setCanceling(false)
    }
  }

  const upgradablePrices = useMemo(() => {
    return tiers.filter((tier) => tier.key !== 'free')
  }, [tiers])

  return (
    <div data-mol-id="billing-page" className={cm.cn(cm.stack(8), cm.maxW('2xl'), 'mx-auto')}>
      <header className={cm.stack(2)}>
        <span
          className={cm.cn(
            'inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant w-fit',
          )}
        >
          <span
            className={cm.cn(
              'material-symbols-outlined text-base text-[var(--color-brand-gradient-to)]',
            )}
          >
            credit_card
          </span>
          {t('nav.planAndBilling', {}, { defaultValue: 'Plan & billing' })}
        </span>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-4xl md:text-5xl tracking-tight leading-[1.05] font-extrabold text-on-surface',
          )}
        >
          {t('billing.title', { appName: APP_NAME }, { defaultValue: 'Your {{appName}} plan' })}
        </h1>
      </header>

      {error && (
        <p
          data-mol-id="billing-error"
          role="alert"
          className={cm.cn('rounded-2xl bg-error-light text-error p-3 text-sm')}
        >
          {error}
        </p>
      )}

      {actionMessage && (
        <p
          data-mol-id="billing-action-message"
          role="status"
          className={cm.cn('rounded-2xl bg-success-light text-success p-3 text-sm')}
        >
          {actionMessage}
        </p>
      )}

      <section
        data-mol-id="billing-current-plan"
        className={cm.cn(
          cm.sp('p', 8),
          'relative overflow-hidden rounded-[2rem] text-white shadow-xl shadow-[var(--color-brand-gradient-from)]/20',
          'bg-gradient-to-br from-[var(--color-brand-gradient-from)] via-[var(--color-brand-gradient-mid)] to-[var(--color-brand-gradient-to)]',
        )}
      >
        <div
          className={cm.cn(
            'pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
          )}
        />
        <div
          className={cm.cn(
            'pointer-events-none absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-cyan-300/20 blur-3xl',
          )}
        />
        <div
          className={cm.cn(
            cm.flex({ align: 'start', justify: 'between', gap: 4 }),
            'relative flex-wrap',
          )}
        >
          <div className={cm.stack(2)}>
            <span
              className={cm.cn(
                'inline-flex items-center gap-2 rounded-full bg-surface/15 backdrop-blur-md px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.25em]',
              )}
            >
              <span
                className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-emerald-300 animate-pulse')}
              />
              {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
            </span>
            <h2
              data-mol-id="billing-plan-name"
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-4xl md:text-5xl tracking-tight font-extrabold',
              )}
            >
              {loading ? '—' : (status?.name ?? t('nav.free', {}, { defaultValue: 'Free' }))}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-white/80 max-w-md')}>{planBlurb}</p>
          </div>
          <div className={cm.cn(cm.stack(1), cm.textRight)}>
            <span
              data-mol-id="billing-plan-key"
              className={cm.cn('text-xs uppercase tracking-widest opacity-80 font-bold')}
            >
              {status?.planKey ?? '—'}
            </span>
            {!status?.isFree && (
              <button
                type="button"
                data-mol-id="billing-cancel-button"
                onClick={() => void handleCancel()}
                disabled={canceling}
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  cm.sp('mt', 2),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-full bg-surface text-[var(--color-brand-gradient-from)] hover:bg-surface-secondary uppercase tracking-widest disabled:opacity-60',
                )}
              >
                {canceling
                  ? t('billing.action.canceling', {}, { defaultValue: 'Canceling…' })
                  : t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
              </button>
            )}
          </div>
        </div>
        <div
          className={cm.cn(
            cm.grid({ cols: 1, gap: 'md' }),
            cm.sp('mt', 6),
            'sm:grid-cols-3 relative',
          )}
        >
          {usage.map((u) => {
            const limit = (currentLimits[u.id] as number | undefined) ?? 0
            const display = limit >= 999_999 ? '∞' : String(limit)
            const percent =
              limit > 0 && limit < 999_999 ? Math.min(100, Math.round((u.used / limit) * 100)) : 0
            return (
              <div
                key={u.id}
                data-mol-id={`billing-usage-${u.id}`}
                className={cm.cn(cm.sp('p', 4), 'rounded-2xl bg-surface/10 backdrop-blur-md')}
              >
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'uppercase tracking-widest font-semibold opacity-80',
                  )}
                >
                  {u.label}
                </span>
                <div className={cm.cn(cm.flex({ align: 'baseline', gap: 1 }), cm.sp('mt', 1))}>
                  <span className={cm.cn('text-3xl font-extrabold tracking-tight')}>{u.used}</span>
                  <span className={cm.cn('text-sm font-semibold opacity-80')}>
                    / {display} {u.unit}
                  </span>
                </div>
                <div className={cm.cn('mt-2 h-1.5 rounded-full bg-surface/20 overflow-hidden')}>
                  <div
                    className={cm.cn('h-full rounded-full bg-surface')}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section
        data-mol-id="billing-pricing"
        className={cm.cn(
          cm.sp('p', 6),
          cm.stack(4),
          'rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm',
        )}
      >
        <header
          className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-3')}
        >
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-sm uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('billing.pricing.title', {}, { defaultValue: 'Available plans' })}
          </h2>
          <div
            role="tablist"
            aria-label="Billing period"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              'rounded-full border border-outline-variant p-1',
            )}
          >
            {(['month', 'year'] as const).map((p) => (
              <button
                key={p}
                role="tab"
                aria-selected={period === p}
                data-mol-id={`billing-period-${p}`}
                onClick={() => setPeriod(p)}
                type="button"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  'rounded-full uppercase tracking-widest',
                  period === p
                    ? 'bg-on-surface text-surface'
                    : 'text-on-surface-variant hover:text-on-surface',
                )}
              >
                {p === 'month'
                  ? t('status.monthly', {}, { defaultValue: 'Monthly' })
                  : t('billing.period.year', {}, { defaultValue: 'Yearly' })}
              </button>
            ))}
          </div>
        </header>

        <ul className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-3')}>
          {upgradablePrices.map((tier) => {
            const price = tier.prices.find((p) => p.period === period) ?? tier.prices[0]
            const priceId = price?.stripePriceId ?? ''
            const isCurrent = status?.category === tier.key
            const disabled = !priceId || busyPriceId === priceId
            return (
              <li
                key={tier.key}
                data-mol-id={`billing-tier-${tier.key}`}
                className={cm.cn(
                  cm.stack(3),
                  cm.sp('p', 5),
                  'rounded-2xl border bg-surface',
                  isCurrent
                    ? 'border-[var(--color-brand-gradient-from)] ring-2 ring-[var(--color-brand-gradient-from)]/20'
                    : 'border-outline-variant',
                )}
              >
                <h3 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
                  {tier.name}
                </h3>
                <p className={cm.cn('text-2xl font-extrabold text-on-surface')}>
                  {price?.price ?? '—'}
                </p>
                <ul className={cm.cn('text-xs space-y-1 text-on-surface-variant')}>
                  <li>
                    {(tier.limits.maxRecordings ?? 0) >= 999_999
                      ? t(
                          'billing.tier.unlimitedRecordings',
                          {},
                          { defaultValue: 'Unlimited recordings' },
                        )
                      : t(
                          'billing.tier.maxRecordings',
                          { count: tier.limits.maxRecordings ?? 0 },
                          { defaultValue: '{{count}} recordings' },
                        )}
                  </li>
                  <li>
                    {tier.limits.canExport
                      ? t('billing.tier.exports', {}, { defaultValue: 'Exports enabled' })
                      : t('billing.tier.noExports', {}, { defaultValue: 'No exports' })}
                  </li>
                  <li>
                    {tier.limits.advancedFeatures
                      ? t('common.advancedFeatures', {}, { defaultValue: 'Advanced features' })
                      : t('billing.tier.basic', {}, { defaultValue: 'Basic features' })}
                  </li>
                  <li>
                    {(tier.limits.retentionDays ?? 0) === 0
                      ? t(
                          'billing.tier.unlimitedRetention',
                          {},
                          { defaultValue: 'Unlimited retention' },
                        )
                      : t(
                          'billing.tier.retentionDays',
                          { days: tier.limits.retentionDays ?? 0 },
                          { defaultValue: '{{days}} days retention' },
                        )}
                  </li>
                </ul>
                <button
                  type="button"
                  data-mol-id={`billing-upgrade-${tier.key}`}
                  onClick={() => void handleUpgrade(priceId)}
                  disabled={disabled || isCurrent}
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-full uppercase tracking-widest',
                    isCurrent
                      ? 'bg-surface-container text-on-surface-variant cursor-default'
                      : 'bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] text-white hover:opacity-90 disabled:opacity-50',
                  )}
                >
                  {isCurrent
                    ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
                    : busyPriceId === priceId
                      ? t('common.startingEllipsis', {}, { defaultValue: 'Starting…' })
                      : t('settings.upgrade', {}, { defaultValue: 'Upgrade' })}
                </button>
                {!priceId && (
                  <p
                    data-mol-id={`billing-tier-${tier.key}-missing`}
                    className={cm.cn('text-[10px] text-on-surface-variant')}
                  >
                    {t(
                      'billing.priceMissing',
                      {},
                      { defaultValue: 'Stripe priceId not configured for this period.' },
                    )}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
