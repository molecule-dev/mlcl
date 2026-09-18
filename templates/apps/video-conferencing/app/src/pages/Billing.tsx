import { useCallback, useEffect, useState } from 'react'

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
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([http.get('/api/billing/tiers'), http.get('/api/billing/status')])
      .then(([tiersRes, statusRes]) => {
        if (cancelled) return
        if (tiersRes.status === 'fulfilled') {
          setTiers(unwrap<ApiTier[]>(tiersRes.value, []))
        }
        if (statusRes.status === 'fulfilled') {
          const s = unwrapOne<ApiStatus | null>(statusRes.value, null)
          if (s && typeof s === 'object' && 'planKey' in s) setStatus(s)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

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
    </div>
  )
}
