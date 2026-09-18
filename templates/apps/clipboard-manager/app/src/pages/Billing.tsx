import { useCallback, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ACCENT_COLOR, BRAND_COLOR } from '../branding.js'
import { PageHeader } from '../components/PageHeader.js'
import { useFetchOne } from '../lib/use-fetch.js'

interface Tier {
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: {
    maxCategories: number
    maxClips: number
    maxPinned: number
    advancedFeatures: boolean
    canExport: boolean
    retentionDays: number
  }
}

interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
  limits: Tier['limits']
}

const adaptTiers = (raw: { data?: Tier[] } | Tier[] | null): Tier[] => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  return raw.data ?? []
}

const adaptStatus = (raw: BillingStatus): BillingStatus => raw

const FEATURES_BY_TIER: Record<string, ReadonlyArray<{ key: string; defaultLabel: string }>> = {
  free: [
    { key: 'limited', defaultLabel: 'Up to 5 clips on a single device' },
    { key: 'localOnly', defaultLabel: 'Local-only — no cross-device sync' },
    { key: 'commandPalette', defaultLabel: 'Command palette' },
  ],
  pro: [
    { key: 'unlimited', defaultLabel: 'Up to 500 clips synced across devices' },
    { key: 'autoEncrypt', defaultLabel: 'Auto-encrypt secrets, AES-256' },
    { key: 'allCategories', defaultLabel: 'Unlimited categories & pinned clips' },
    { key: 'export', defaultLabel: 'Export every clip as JSON' },
  ],
  team: [
    { key: 'allPro', defaultLabel: 'Everything in Pro' },
    { key: 'sharedLibs', defaultLabel: 'Effectively unlimited clips per seat' },
    { key: 'support', defaultLabel: 'Priority support' },
    { key: 'auditTrail', defaultLabel: 'Full audit retention' },
  ],
}

const formatNumber = (n: number): string => (n >= 999_999 ? '∞' : n.toLocaleString())

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [pendingPriceId, setPendingPriceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'month' | 'year'>('month')

  const tiersResp = useFetchOne<Tier[] | { data?: Tier[] }, Tier[]>(
    '/api/billing/tiers',
    useCallback(adaptTiers, []),
  )
  const status = useFetchOne<BillingStatus, BillingStatus>(
    '/api/billing/status',
    useCallback(adaptStatus, []),
  )

  const tiers = tiersResp.data ?? []
  const currentCategory = status.data?.category ?? 'free'

  const handleUpgrade = useCallback(
    async (priceId: string | null) => {
      if (!priceId) return
      setPendingPriceId(priceId)
      setError(null)
      try {
        const res = await http.post<{ checkoutUrl?: string; updated?: boolean; error?: string }>(
          '/api/billing/checkout',
          { priceId },
        )
        const data = res.data || {}
        if (data.checkoutUrl) {
          globalThis.location.assign(data.checkoutUrl)
          return
        }
        if (data.updated) {
          await status.refetch()
          return
        }
        setError(
          data.error ||
            t('nav.couldNotStartCheckout', {}, { defaultValue: 'Could not start checkout.' }),
        )
      } catch (err) {
        setError(
          (err instanceof Error && err.message) ||
            t('nav.couldNotStartCheckout', {}, { defaultValue: 'Could not start checkout.' }),
        )
      } finally {
        setPendingPriceId(null)
      }
    },
    [http, status, t],
  )

  const handleCancel = useCallback(async () => {
    setError(null)
    try {
      await http.post('/api/billing/cancel', {})
      await status.refetch()
    } catch (err) {
      setError(
        (err instanceof Error && err.message) ||
          t('billing.cancelError', {}, { defaultValue: 'Could not cancel subscription.' }),
      )
    }
  }, [http, status, t])

  return (
    <div className={cm.cn(cm.sp('p', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-12')}>
      <PageHeader
        eyebrow={t('nav.planAndBilling', {}, { defaultValue: 'Plan & billing' })}
        heading={t('billing.heading', {}, { defaultValue: 'Pick the plan that fits your hands.' })}
        description={t(
          'billing.description',
          {},
          {
            defaultValue:
              'Free for casual copy-pasters. Pro for power users. Team for shared engineering libraries.',
          },
        )}
        actions={
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('p', 1),
              'rounded-md bg-surface-container border border-outline-variant/40',
            )}
          >
            {(['month', 'year'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                data-mol-id={`period-${p}`}
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  'rounded-md transition-colors',
                  period === p ? 'text-white' : 'text-on-surface-variant hover:text-on-surface',
                )}
                style={period === p ? { background: 'var(--color-primary)' } : undefined}
              >
                {t(
                  `billing.period.${p}`,
                  {},
                  { defaultValue: p === 'month' ? 'Monthly' : 'Yearly' },
                )}
              </button>
            ))}
          </div>
        }
      />

      {error && (
        <div
          role="alert"
          data-mol-id="billing-error"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-md bg-error-container/30 text-error border border-error/30',
          )}
        >
          {error}
        </div>
      )}

      {tiersResp.loading && tiers.length === 0 ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('billing.loading', {}, { defaultValue: 'Loading plans…' })}
        </p>
      ) : (
        <section
          className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}
          data-mol-id="billing-tiers"
        >
          {tiers.map((tier) => {
            const isPopular = tier.key === 'pro'
            const isCurrent = tier.key === currentCategory
            const matched = tier.prices.find((p) => p.period === period) ?? tier.prices[0]
            const features = FEATURES_BY_TIER[tier.key] ?? []
            const ctaLabel = isCurrent
              ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
              : tier.key === 'free'
                ? t('billing.downgradeCta', {}, { defaultValue: 'Cancel paid plan' })
                : matched?.stripePriceId
                  ? t(
                      'billing.upgradeCta',
                      { tier: tier.name },
                      { defaultValue: `Upgrade to ${tier.name}` },
                    )
                  : t('billing.notAvailable', {}, { defaultValue: 'Not available' })

            const disabled =
              isCurrent ||
              (tier.key !== 'free' && !matched?.stripePriceId) ||
              pendingPriceId !== null

            const onClick = () => {
              if (tier.key === 'free') {
                if (currentCategory !== 'free') void handleCancel()
                return
              }
              if (matched?.stripePriceId) void handleUpgrade(matched.stripePriceId)
            }

            return (
              <div
                key={tier.key}
                data-mol-id={`tier-${tier.key}`}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'md' }),
                  cm.sp('p', 6),
                  'relative rounded-xl bg-surface-container-lowest border transition-all',
                )}
                style={{
                  borderColor: isPopular
                    ? BRAND_COLOR
                    : 'color-mix(in srgb, var(--color-outline-variant) 40%, transparent)',
                  boxShadow: isPopular
                    ? '0 12px 32px -8px color-mix(in srgb, var(--color-primary) 20%, transparent)'
                    : undefined,
                }}
              >
                {isPopular && (
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      'absolute -top-3 left-6 rounded-full uppercase tracking-widest text-white font-mono',
                    )}
                    style={{ background: 'var(--color-primary)' }}
                  >
                    {t('status.mostPopular', {}, { defaultValue: 'Most popular' })}
                  </span>
                )}
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('bold'),
                    'tracking-tight text-on-surface',
                  )}
                >
                  {t(`billing.${tier.key}.name`, {}, { defaultValue: tier.name })}
                </h3>
                <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }))}>
                  <span
                    className={cm.cn(
                      cm.textSize('4xl'),
                      cm.fontWeight('bold'),
                      'tracking-tighter font-mono',
                    )}
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {matched?.price ?? '$0'}
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {matched?.period === 'year'
                      ? t('billing.perYear', {}, { defaultValue: '/yr' })
                      : t('billing.perMonth', {}, { defaultValue: '/mo' })}
                  </span>
                </div>
                <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mt', 2))}>
                  {features.map((f) => (
                    <li
                      key={f.key}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        cm.textSize('sm'),
                        'text-on-surface',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-[18px]"
                        style={{ color: ACCENT_COLOR }}
                      >
                        check_circle
                      </span>
                      <span>
                        {t(`billing.feature.${f.key}`, {}, { defaultValue: f.defaultLabel })}
                      </span>
                    </li>
                  ))}
                  <li
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.textSize('xs'),
                      'text-on-surface-variant mt-2',
                    )}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                      storage
                    </span>
                    <span>
                      {t(
                        'billing.limit.snippets',
                        { count: formatNumber(tier.limits.maxClips) },
                        {
                          defaultValue: '{{count}} clips',
                        },
                      )}
                    </span>
                  </li>
                </ul>
                <button
                  type="button"
                  data-mol-id={`tier-${tier.key}-cta`}
                  disabled={disabled}
                  onClick={onClick}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    cm.sp('mt', 2),
                    'rounded-md transition-all disabled:cursor-not-allowed disabled:opacity-60',
                  )}
                  style={{
                    background: isCurrent
                      ? 'transparent'
                      : isPopular
                        ? BRAND_COLOR
                        : 'var(--color-surface-container)',
                    color: isCurrent
                      ? 'var(--color-on-surface-variant)'
                      : isPopular
                        ? 'var(--color-on-primary)'
                        : 'var(--color-on-surface)',
                    border: isCurrent
                      ? '1px solid color-mix(in srgb, var(--color-outline-variant) 60%, transparent)'
                      : 'none',
                  }}
                >
                  {pendingPriceId && pendingPriceId === matched?.stripePriceId
                    ? t('billing.starting', {}, { defaultValue: 'Starting checkout…' })
                    : ctaLabel}
                </button>
              </div>
            )
          })}
        </section>
      )}

      <section data-mol-id="billing-summary">
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 3),
            'uppercase tracking-widest text-on-surface-variant font-mono',
          )}
        >
          {t('billing.summaryHeading', {}, { defaultValue: 'Your subscription' })}
        </h2>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md' }),
            cm.sp('p', 5),
            'rounded-xl bg-surface-container-lowest border border-outline-variant/40',
          )}
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-3xl"
            style={{ color: 'var(--color-primary)' }}
          >
            account_balance_wallet
          </span>
          <div className={cm.cn('flex-1')}>
            <p
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
              data-mol-id="billing-current-plan"
            >
              {status.data?.name ?? 'Free'} · {status.data?.planKey ?? 'free'}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {status.data?.isFree
                ? t(
                    'billing.summaryFree',
                    {},
                    {
                      defaultValue:
                        'No card on file. Upgrade above to start syncing across devices.',
                    },
                  )
                : t(
                    'billing.summaryPaid',
                    {},
                    { defaultValue: 'Manage payment method or cancel from your Stripe dashboard.' },
                  )}
            </p>
          </div>
          {!status.data?.isFree && (
            <button
              type="button"
              onClick={handleCancel}
              data-mol-id="billing-cancel"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-md text-error hover:bg-error-container/30 transition-colors',
              )}
            >
              {t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

export default Billing
export { Billing as BillingPage }
