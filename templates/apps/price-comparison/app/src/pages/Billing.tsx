import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { fmtUsd } from '../lib/unwrap.js'

interface ApiTierPrice {
  period: 'month' | 'year'
  price: string
  stripePriceId: string | null
}

interface ApiTier {
  key: string
  name: string
  prices: ApiTierPrice[]
  limits: {
    maxAlerts: number
    maxProducts: number
    maxSources: number
    advancedFeatures: boolean
    canExport: boolean
    retentionDays: number
  }
}

interface ApiBillingStatus {
  planKey: string
  category: 'free' | 'pro' | 'team'
  name: string
  limits?: ApiTier['limits']
  isFree: boolean
}

const featuresFor = (tier: ApiTier): string[] => {
  const l = tier.limits
  const lines: string[] = []
  if (tier.key === 'free')
    lines.push(`${l.maxProducts} watched products`, `${l.retentionDays}-day price history`)
  else if (tier.key === 'pro')
    lines.push(`${l.maxProducts} watched products`, `${l.retentionDays}-day price history`)
  else lines.push('Unlimited watched products', 'Unlimited price history')
  if (l.canExport) lines.push('CSV export')
  if (l.advancedFeatures) lines.push('Email + push + SMS alerts', 'Custom retailer filters')
  else lines.push('Email alerts only')
  if (tier.key === 'team') lines.push('5 seats, shared watchlists', 'API access')
  return lines
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tiers, setTiers] = useState<ApiTier[]>([])
  const [status, setStatus] = useState<ApiBillingStatus | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [tRes, sRes] = await Promise.all([
          http.get('/api/billing/tiers'),
          http.get('/api/billing/status'),
        ])
        if (cancelled) return
        const tList = (tRes as { data?: { data?: ApiTier[] } | ApiTier[] }).data
        const list = Array.isArray(tList)
          ? tList
          : Array.isArray((tList as { data?: ApiTier[] })?.data)
            ? (tList as { data: ApiTier[] }).data
            : []
        setTiers(list)
        const sw = (sRes as { data?: ApiBillingStatus }).data ?? null
        setStatus(sw)
      } catch (_error) {
        // non-fatal: billing page gracefully renders without tier data
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http])

  const checkout = async (priceId: string | null, planKey: string) => {
    if (!priceId) {
      setErrorMsg(
        t(
          'billing.error.noPriceId',
          {},
          { defaultValue: 'Configure STRIPE_PRICE_COMPARISON_* env vars to enable checkout.' },
        ),
      )
      return
    }
    setPendingKey(planKey)
    setErrorMsg(null)
    try {
      const res = await http.post('/api/billing/checkout', { priceId })
      const body = (res as { data?: { checkoutUrl?: string; updated?: boolean } }).data ?? {}
      if (body.checkoutUrl) {
        void track({ name: 'billing.checkout_started', properties: { plan: planKey } })
        window.location.href = body.checkoutUrl
        return
      }
      if (body.updated) {
        const sRes = await http.get('/api/billing/status')
        setStatus((sRes as { data?: ApiBillingStatus }).data ?? null)
      }
    } catch (e) {
      const msg = (e as { message?: string })?.message
      setErrorMsg(msg ?? t('billing.error.failed', {}, { defaultValue: 'Could not change plan.' }))
    } finally {
      setPendingKey(null)
    }
  }

  const cancel = async () => {
    setPendingKey('cancel')
    setErrorMsg(null)
    try {
      await http.post('/api/billing/cancel', {})
      const sRes = await http.get('/api/billing/status')
      setStatus((sRes as { data?: ApiBillingStatus }).data ?? null)
    } catch (e) {
      const msg = (e as { message?: string })?.message
      setErrorMsg(msg ?? t('billing.error.cancelFailed', {}, { defaultValue: 'Could not cancel.' }))
    } finally {
      setPendingKey(null)
    }
  }

  return (
    <div
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8 max-w-5xl')}
      data-test="billing-page"
    >
      <nav>
        <Link
          to="/settings"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant hover:text-primary',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('billing.backToSettings', {}, { defaultValue: 'Back to settings' })}
        </Link>
      </nav>

      <header>
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
          {t('nav.subscription', {}, { defaultValue: 'Subscription' })}
        </p>
        <h1
          className={cm.cn(
            'mt-1 text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
          )}
        >
          {status
            ? t(
                'billing.currentPlanLabel',
                { name: status.name },
                { defaultValue: 'You are on {{name}}' },
              )
            : t('billing.heading', { appName: APP_NAME }, { defaultValue: '{{appName}} Pro plan' })}
        </h1>
      </header>

      {errorMsg && (
        <div
          data-test="billing-error"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl bg-error/10 text-error border border-error/30',
          )}
        >
          {errorMsg}
        </div>
      )}

      <section
        data-test="billing-plans"
        className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 lg:grid-cols-3')}
      >
        {tiers.map((tier) => {
          const isActive = status?.category === tier.key
          const monthly = tier.prices.find((p) => p.period === 'month') ?? tier.prices[0]
          const features = featuresFor(tier)
          const cents =
            monthly && monthly.price.startsWith('$')
              ? Math.round(parseFloat(monthly.price.replace(/[^\d.]/g, '')) * 100)
              : 0
          return (
            <article
              key={tier.key}
              data-test={`billing-plan-${tier.key}`}
              className={cm.cn(
                cm.sp('p', 6),
                'rounded-2xl border shadow-sm transition-all',
                tier.key === 'pro'
                  ? 'bg-gradient-to-br from-primary-container/40 to-secondary-container/40 border-primary/40'
                  : 'bg-surface-container-lowest border-outline-variant/30',
                isActive ? 'ring-2 ring-primary' : 'hover:-translate-y-0.5 hover:shadow-md',
              )}
            >
              <header
                className={cm.cn(cm.flex({ align: 'baseline', justify: 'between', gap: 'sm' }))}
              >
                <p
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.fontWeight('extrabold'),
                    'tracking-tight text-on-surface',
                  )}
                >
                  {t(`billing.plan.${tier.key}.label`, {}, { defaultValue: tier.name })}
                </p>
                {tier.key === 'pro' && (
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'rounded-full bg-primary text-on-primary uppercase tracking-wider',
                    )}
                  >
                    {t('billing.popular', {}, { defaultValue: 'Most popular' })}
                  </span>
                )}
              </header>
              <p className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }), cm.sp('mt', 4))}>
                <span
                  className={cm.cn(
                    'text-4xl font-extrabold tabular-nums tracking-tighter text-on-surface',
                  )}
                >
                  {cents === 0 ? t('nav.free', {}, { defaultValue: 'Free' }) : fmtUsd(cents)}
                </span>
                {cents > 0 && (
                  <span
                    className={cm.cn(
                      'text-sm font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    /mo
                  </span>
                )}
              </p>
              <ul className={cm.cn(cm.sp('mt', 5), 'space-y-2')}>
                {features.map((f, i) => (
                  <li
                    key={f}
                    className={cm.cn(
                      cm.flex({ align: 'start', gap: 'xs' }),
                      cm.textSize('sm'),
                      'text-on-surface',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cm.cn('material-symbols-outlined text-base text-secondary mt-0.5')}
                    >
                      check_circle
                    </span>
                    {t(`billing.plan.${tier.key}.feature.${i}`, {}, { defaultValue: f })}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                data-test={`billing-cta-${tier.key}`}
                disabled={
                  isActive ||
                  pendingKey === tier.key ||
                  (tier.key !== 'free' && !monthly?.stripePriceId)
                }
                onClick={() => {
                  if (tier.key === 'free') {
                    void cancel()
                  } else {
                    void checkout(monthly?.stripePriceId ?? null, tier.key)
                  }
                }}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('mt', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'w-full rounded-full uppercase tracking-wider transition-all',
                  isActive
                    ? 'bg-secondary/20 text-secondary cursor-default'
                    : 'bg-primary text-on-primary hover:opacity-95 active:scale-[0.98] shadow-md shadow-primary/20 disabled:opacity-50',
                )}
              >
                {isActive
                  ? t('billing.currentPlan', {}, { defaultValue: 'Current plan' })
                  : pendingKey === tier.key
                    ? t('billing.checkingOut', {}, { defaultValue: 'Connecting…' })
                    : tier.key === 'free'
                      ? t('billing.cancel', {}, { defaultValue: 'Switch to Free' })
                      : t(
                          `billing.plan.${tier.key}.cta`,
                          { name: tier.name },
                          { defaultValue: `Switch to ${tier.name}` },
                        )}
              </button>
            </article>
          )
        })}
      </section>

      {status && status.category !== 'free' && (
        <section
          data-test="billing-cancel"
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
          )}
        >
          <div>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('billing.cancelEyebrow', {}, { defaultValue: 'Subscription' })}
            </p>
            <p
              className={cm.cn(cm.textSize('base'), cm.fontWeight('extrabold'), 'text-on-surface')}
            >
              {t(
                'billing.cancelDescription',
                {},
                { defaultValue: 'Cancel anytime — keep Pro until the period ends.' },
              )}
            </p>
          </div>
          <button
            type="button"
            data-test="billing-cancel-button"
            disabled={pendingKey === 'cancel'}
            onClick={() => void cancel()}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'rounded-full border border-error/40 text-error uppercase tracking-wider hover:bg-error/10 transition-colors disabled:opacity-50',
            )}
          >
            {pendingKey === 'cancel'
              ? t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })
              : t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
          </button>
        </section>
      )}
    </div>
  )
}
