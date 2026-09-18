import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { unwrapList, unwrapSingle } from '@molecule/app-http'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TierPrice {
  period: 'month' | 'year'
  price: string
  stripePriceId: string | null
}

interface Tier {
  key: string
  name: string
  prices: TierPrice[]
  limits: Record<string, unknown>
}

interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
  limits: Record<string, unknown>
}

const PLAN_BLURBS: Record<string, string> = {
  free: 'For tinkering — limited tracks and exports.',
  pro: 'Studio-grade workflow for solo creators.',
  team: 'Real-time co-writing for up to five.',
}

// Mirrors api/src/tiers.ts limits — keep the two in sync.
const PLAN_HIGHLIGHTS: Record<string, Array<{ key: string; defaultLabel: string }>> = {
  free: [
    { key: 'projects', defaultLabel: '5 projects' },
    { key: 'tracks', defaultLabel: '5 tracks per project' },
    { key: 'export', defaultLabel: 'MP3 export' },
  ],
  pro: [
    { key: 'projects', defaultLabel: '500 projects' },
    { key: 'tracks', defaultLabel: '500 tracks per project' },
    { key: 'export', defaultLabel: 'Lossless WAV export' },
    { key: 'advanced', defaultLabel: 'Advanced features' },
  ],
  team: [
    { key: 'everything', defaultLabel: 'Unlimited everything' },
    { key: 'retention', defaultLabel: 'Unlimited version history' },
    { key: 'collab', defaultLabel: 'Collaboration features' },
    { key: 'stems', defaultLabel: 'Stem delivery' },
  ],
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tiers, setTiers] = useState<Tier[]>([])
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([
      http.get<unknown>('/api/billing/tiers'),
      http.get<unknown>('/api/billing/status'),
    ]).then(([tiersRes, statusRes]) => {
      if (cancelled) return
      if (tiersRes.status === 'fulfilled') {
        setTiers(unwrapList<Tier>(tiersRes.value.data))
      }
      if (statusRes.status === 'fulfilled') {
        const s = unwrapSingle<BillingStatus>(statusRes.value.data)
        if (s) setStatus(s)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [http])

  const handleCheckout = async (priceId: string | null, key: string) => {
    if (!priceId) {
      setError(
        t('billing.error.unavailable', {}, { defaultValue: 'This plan is not yet available.' }),
      )
      return
    }
    setPendingKey(key)
    setError(null)
    try {
      const res = await http.post<unknown>('/api/billing/checkout', { priceId })
      const body = res.data as { checkoutUrl?: string; updated?: boolean; error?: string }
      if (body?.checkoutUrl) {
        window.location.href = body.checkoutUrl
        return
      }
      if (body?.updated) {
        const refreshed = await http.get<unknown>('/api/billing/status')
        const s = unwrapSingle<BillingStatus>(refreshed.data)
        if (s) setStatus(s)
      } else if (body?.error) {
        setError(body.error)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('nav.couldNotStartCheckout', {}, { defaultValue: 'Could not start checkout.' }),
      )
    } finally {
      setPendingKey(null)
    }
  }

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 8), 'space-y-10')}>
      <header>
        <Link
          to="/settings"
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-on-surface flex items-center gap-1',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </Link>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight mt-3')}>
          {t('billing.title', {}, { defaultValue: 'Subscription & billing' })}
        </h1>
        <p className={cm.cn('text-sm text-on-surface-variant mt-2')}>
          {t(
            'billing.subtitle',
            {},
            { defaultValue: 'Pick a plan that matches your studio. Cancel anytime.' },
          )}
        </p>
        {status && (
          <p className={cm.cn('text-sm text-on-surface mt-3')} data-testid="current-plan">
            {t('billing.currentPlan', {}, { defaultValue: 'Current plan:' })}{' '}
            <strong>{status.name}</strong>
          </p>
        )}
      </header>

      {error && (
        <p
          role="alert"
          className={cm.cn(
            'text-sm text-on-error-container bg-error-container px-3 py-2 rounded-lg',
          )}
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className={cm.cn('text-sm', cm.textMuted)}>
          {t('nav.loadingPlans', {}, { defaultValue: 'Loading plans…' })}
        </p>
      ) : (
        <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
          {tiers.map((tier) => {
            const monthly = tier.prices.find((p) => p.period === 'month')
            const isCurrent = status?.category === tier.key
            const highlight = tier.key === 'pro'
            const blurb = PLAN_BLURBS[tier.key] ?? ''
            const highlights = PLAN_HIGHLIGHTS[tier.key] ?? []
            const ctaLabel = isCurrent
              ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
              : tier.key === 'free'
                ? t(
                    'billing.downgradeCta',
                    { name: tier.name },
                    { defaultValue: 'Switch to {{name}}' },
                  )
                : t(
                    'billing.upgradeCta',
                    { name: tier.name },
                    { defaultValue: 'Upgrade to {{name}}' },
                  )
            return (
              <article
                key={tier.key}
                data-testid={`plan-${tier.key}`}
                className={cm.cn(
                  'rounded-2xl p-6 border transition-all hover:-translate-y-0.5',
                  highlight
                    ? 'shadow-2xl text-white'
                    : 'bg-surface-container-lowest border-outline-variant',
                )}
                style={
                  highlight
                    ? {
                        background:
                          'linear-gradient(135deg, var(--daw-primary) 0%, var(--mol-color-primary-dark) 50%, var(--daw-secondary) 100%)',
                        borderColor: 'var(--daw-primary)',
                        boxShadow: '0 24px 64px rgba(139, 92, 246, 0.3)',
                      }
                    : undefined
                }
              >
                <p
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest',
                    highlight ? 'text-white/70' : 'text-on-surface-variant',
                  )}
                >
                  {t(`billing.plan.${tier.key}.eyebrow`, {}, { defaultValue: 'Plan' })}
                </p>
                <h2
                  className={cm.cn(
                    'text-2xl font-extrabold tracking-tight mt-1',
                    highlight ? 'text-white' : 'text-on-surface',
                  )}
                >
                  {tier.name}
                </h2>
                <p
                  className={cm.cn(
                    'text-sm leading-relaxed mt-1',
                    highlight ? 'text-white/85' : 'text-on-surface-variant',
                  )}
                >
                  {t(`billing.plan.${tier.key}.blurb`, {}, { defaultValue: blurb })}
                </p>
                <div className={cm.cn('flex items-baseline gap-1 mt-4')}>
                  <span
                    className={cm.cn(
                      'text-3xl font-extrabold tabular-nums',
                      highlight ? 'text-white' : 'text-on-surface',
                    )}
                  >
                    {monthly?.price ?? '—'}
                  </span>
                </div>
                <ul className={cm.cn(cm.sp('mt', 4), 'space-y-2')}>
                  {highlights.map((h) => (
                    <li
                      key={h.key}
                      className={cm.cn(
                        'flex items-start gap-2 text-sm',
                        highlight ? 'text-white' : 'text-on-surface',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-base mt-0.5')}
                        aria-hidden="true"
                      >
                        check_circle
                      </span>
                      {t(
                        `billing.plan.${tier.key}.highlight.${h.key}`,
                        {},
                        { defaultValue: h.defaultLabel },
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  data-testid={`checkout-${tier.key}`}
                  disabled={isCurrent || pendingKey !== null}
                  onClick={() => handleCheckout(monthly?.stripePriceId ?? null, tier.key)}
                  className={cm.cn(
                    'w-full mt-6 px-4 py-2.5 rounded-full font-semibold text-sm transition-colors disabled:opacity-60',
                    highlight
                      ? 'bg-surface text-on-surface hover:bg-surface/90 shadow-lg'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface',
                  )}
                >
                  {pendingKey === tier.key
                    ? t('billing.pending', {}, { defaultValue: 'Loading…' })
                    : ctaLabel}
                </button>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}
