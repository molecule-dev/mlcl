import { useCallback, useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ApiTier {
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: Record<string, number | boolean>
}

interface ApiStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
  limits: Record<string, number | boolean>
}

interface ApiMeeting {
  id: string
  starts_at?: string | null
  ends_at?: string | null
}

interface UsageBucket {
  label: string
  minutes: number
  inProgress: boolean
}

function unwrap<T>(value: unknown, fallback: T): T {
  let current: unknown = value
  for (let i = 0; i < 3; i++) {
    if (Array.isArray(current)) return current as T
    if (current && typeof current === 'object' && 'data' in current) {
      current = (current as { data: unknown }).data
      continue
    }
    break
  }
  return Array.isArray(current) ? (current as T) : fallback
}

function unwrapOne<T>(value: unknown, fallback: T): T {
  let current: unknown = value
  for (let i = 0; i < 3; i++) {
    if (current === null || current === undefined) break
    if (current && typeof current === 'object' && 'data' in current) {
      current = (current as { data: unknown }).data
      continue
    }
    break
  }
  return (current as T) ?? fallback
}

const HIGHLIGHT_KEYS: Array<{ key: string; label: string }> = [
  { key: 'maxMeetings', label: 'meetings' },
  { key: 'maxParticipants', label: 'participants per meeting' },
  { key: 'maxRecordings', label: 'recordings' },
  { key: 'retentionDays', label: 'days retention (0 = unlimited)' },
]

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tiers, setTiers] = useState<ApiTier[]>([])
  const [status, setStatus] = useState<ApiStatus | null>(null)
  const [meetings, setMeetings] = useState<ApiMeeting[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([
      http.get('/api/billing/tiers'),
      http.get('/api/billing/status'),
      http.get('/api/meetings'),
    ])
      .then(([tiersRes, statusRes, meetingsRes]) => {
        if (cancelled) return
        if (tiersRes.status === 'fulfilled') {
          setTiers(unwrap<ApiTier[]>(tiersRes.value, []))
        }
        if (statusRes.status === 'fulfilled') {
          const s = unwrapOne<ApiStatus | null>(statusRes.value, null)
          if (s && typeof s === 'object' && 'planKey' in s) setStatus(s)
        }
        if (meetingsRes.status === 'fulfilled') {
          setMeetings(unwrap<ApiMeeting[]>(meetingsRes.value, []))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  // Usage forecast: meeting minutes per month over the trailing six months,
  // with the current month still in progress (mirrors the design's dashed bar).
  const usage = useMemo<{ buckets: UsageBucket[]; projectedHours: number }>(() => {
    const now = new Date()
    const months: UsageBucket[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        label: d.toLocaleString(undefined, { month: 'short' }),
        minutes: 0,
        inProgress: i === 0,
      })
    }
    for (const m of meetings) {
      if (!m.starts_at) continue
      const start = new Date(m.starts_at).getTime()
      const end = m.ends_at ? new Date(m.ends_at).getTime() : start
      const minutes = Math.max(0, Math.round((end - start) / 60_000))
      const d = new Date(m.starts_at)
      const idx = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
      if (idx >= 0 && idx < months.length) months[months.length - 1 - idx].minutes += minutes
    }
    const complete = months.filter((b) => !b.inProgress && b.minutes > 0)
    const avg =
      complete.length > 0 ? complete.reduce((acc, b) => acc + b.minutes, 0) / complete.length : 0
    const monthsLeft = 12 - (now.getMonth() + 1)
    const yearSoFar = months.reduce((acc, b) => acc + b.minutes, 0)
    const projectedHours = Math.round((yearSoFar + avg * monthsLeft) / 60)
    return { buckets: months, projectedHours }
  }, [meetings])

  const usageMax = useMemo(
    () => Math.max(1, ...usage.buckets.map((b) => b.minutes)),
    [usage.buckets],
  )

  const startCheckout = useCallback(
    async (priceId: string | null) => {
      if (!priceId) {
        setError(
          t('billing.error.unavailable', {}, { defaultValue: 'This plan is not available yet.' }),
        )
        return
      }
      setSubmitting(priceId)
      setError(null)
      try {
        const res = (await http.post('/api/billing/checkout', { priceId })) as
          | { checkoutUrl?: string; updated?: boolean }
          | { data?: { checkoutUrl?: string; updated?: boolean } }
        const inner =
          (res as { data?: { checkoutUrl?: string } })?.data ?? (res as { checkoutUrl?: string })
        if (inner?.checkoutUrl) {
          window.location.href = inner.checkoutUrl
          return
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start checkout')
      } finally {
        setSubmitting(null)
      }
    },
    [http, t],
  )

  return (
    <div className={cm.stack(8)}>
      <header className={cm.stack(2)}>
        <h1 className={cm.cn('text-4xl font-extrabold tracking-tight text-on-surface')}>
          {t('settings.billing', {}, { defaultValue: 'Billing' })}
        </h1>
        <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
          {t(
            'billing.subtitle',
            {},
            { defaultValue: 'Manage your workspace plan, seats, and invoices.' },
          )}
        </p>
      </header>

      <section
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 6 }),
          cm.sp('p', 8),
          'bg-gradient-to-br from-primary via-primary-dark to-secondary text-on-primary rounded-3xl shadow-xl shadow-primary/30 relative overflow-hidden flex-wrap',
        )}
      >
        <div className={cm.stack(2) + ' relative z-10'}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-primary/80',
            )}
          >
            {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
          </span>
          <h2
            data-testid="current-plan"
            className={cm.cn('text-4xl font-extrabold tracking-tight')}
          >
            {status ? status.name : 'Free'}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-primary/80')}>
            {status?.isFree
              ? t('billing.freeBadge', {}, { defaultValue: 'No active subscription.' })
              : status
                ? `Plan: ${status.planKey}`
                : '...'}
          </p>
        </div>
      </section>

      {error && (
        <p
          role="alert"
          data-testid="billing-error"
          className={cm.cn(cm.textSize('sm'), 'text-error')}
        >
          {error}
        </p>
      )}

      <section className={cm.stack(4)}>
        <h3
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('billing.plansHeading', {}, { defaultValue: 'Plans' })}
        </h3>
        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : tiers.length === 0 ? (
          <p data-testid="no-tiers" className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('billing.noTiers', {}, { defaultValue: 'No plans available right now.' })}
          </p>
        ) : (
          <div
            data-testid="tier-list"
            className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-3')}
          >
            {tiers.map((tier) => {
              const monthly = tier.prices.find((p) => p.period === 'month') ?? tier.prices[0]
              const isCurrent = status?.category === tier.key
              return (
                <article
                  key={tier.key}
                  data-testid={`tier-${tier.key}`}
                  className={cm.cn(
                    cm.sp('p', 6),
                    cm.stack(4),
                    'rounded-2xl shadow-sm transition-all',
                    isCurrent
                      ? 'bg-surface-container-lowest border-2 border-primary'
                      : 'bg-surface-container-lowest border border-outline-variant/40 hover:border-primary/40',
                  )}
                >
                  <div className={cm.flex({ align: 'center', justify: 'between' })}>
                    <h4 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
                      {tier.name}
                    </h4>
                    {isCurrent && (
                      <span
                        className={
                          'px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full bg-primary text-on-primary'
                        }
                      >
                        {t('nav.current', {}, { defaultValue: 'Current' })}
                      </span>
                    )}
                  </div>
                  <div className={cm.flex({ align: 'baseline', gap: 1 })}>
                    <span className={cm.cn('text-4xl font-extrabold tracking-tighter')}>
                      {monthly?.price ?? ''}
                    </span>
                  </div>
                  <ul className={cm.stack(2)}>
                    {HIGHLIGHT_KEYS.map((row) => {
                      const value = tier.limits[row.key]
                      if (typeof value === 'undefined') return null
                      return (
                        <li
                          key={row.key}
                          className={cm.cn(
                            cm.flex({ align: 'start', gap: 2 }),
                            cm.textSize('sm'),
                            'text-on-surface',
                          )}
                        >
                          <span
                            className={'material-symbols-outlined text-base text-primary shrink-0'}
                          >
                            check_circle
                          </span>
                          <span>
                            {String(value)} {row.label}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                  {!isCurrent && monthly?.stripePriceId && (
                    <button
                      type="button"
                      data-testid={`checkout-${tier.key}`}
                      disabled={submitting === monthly.stripePriceId}
                      onClick={() => startCheckout(monthly.stripePriceId)}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.fontWeight('bold'),
                        cm.roundedFull,
                        'bg-primary text-on-primary hover:bg-primary-dark disabled:opacity-50',
                      )}
                    >
                      {submitting === monthly.stripePriceId
                        ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
                        : t(
                            'billing.upgradeTo',
                            { name: tier.name },
                            { defaultValue: `Upgrade to ${tier.name}` },
                          )}
                    </button>
                  )}
                  {!monthly?.stripePriceId && tier.key !== 'free' && (
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')}>
                      {t(
                        'billing.contactSales',
                        {},
                        { defaultValue: 'Contact sales to enable this plan.' },
                      )}
                    </p>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section
        data-testid="usage-forecast"
        className={cm.cn(
          cm.stack(4),
          cm.sp('p', 6),
          'rounded-2xl border border-outline-variant/40 bg-surface-secondary shadow-sm',
        )}
      >
        <h3
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-on-surface',
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              'bg-primary/15 text-primary shrink-0',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}>
              trending_up
            </span>
          </span>
          {t('billing.usageForecast', {}, { defaultValue: 'Usage forecast' })}
        </h3>
        <div
          className={cm.cn(cm.flex({ align: 'end', gap: 2 }), cm.h(24))}
          role="img"
          aria-label={t(
            'billing.usageChartLabel',
            {},
            { defaultValue: 'Meeting minutes per month, last six months' },
          )}
        >
          {usage.buckets.map((b) => (
            <div
              key={b.label + b.minutes}
              className={cm.cn(
                cm.flex1,
                'rounded-t-sm bg-primary/30 min-h-[6px]',
                b.inProgress && 'border-t-2 border-dashed border-primary',
              )}
              style={{ height: `${Math.max(8, Math.round((b.minutes / usageMax) * 100))}%` }}
              title={`${b.label}: ${b.minutes}`}
            />
          ))}
        </div>
        <div className={cm.flex({ justify: 'between', gap: 2 })}>
          {usage.buckets.map((b) => (
            <span
              key={`label-${b.label}`}
              className={cm.cn(
                cm.flex1,
                cm.textCenter,
                cm.textSize('xs'),
                'text-on-surface-variant',
              )}
            >
              {b.label}
            </span>
          ))}
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {usage.buckets.every((b) => b.minutes === 0)
            ? t(
                'billing.usageEmpty',
                {},
                {
                  defaultValue:
                    'No meetings in the last six months yet — your forecast will appear as you meet.',
                },
              )
            : t(
                'billing.usageProjected',
                { hours: usage.projectedHours },
                {
                  defaultValue:
                    'Projected to reach ~{{hours}} h of meetings by year end based on current growth.',
                },
              )}
        </p>
      </section>
    </div>
  )
}
