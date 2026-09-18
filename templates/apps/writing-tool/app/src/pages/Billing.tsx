import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface BillingStatus {
  planKey: string
  category: string
  name: string
  limits: Record<string, number | boolean>
  isFree: boolean
}

interface BillingPrice {
  period: 'month' | 'year'
  price: string
  stripePriceId: string | null
}

interface BillingTier {
  key: string
  name: string
  prices: BillingPrice[]
  limits: Record<string, number | boolean>
}

const TIER_TAGLINES: Record<string, string> = {
  free: 'For the page that just needs to be written.',
  pro: 'For drafts that turn into something serious.',
  team: 'For editors, writing rooms, and longform desks.',
}

/**
 * Billing — current plan + tier ladder, all server-driven.
 *
 * `/api/billing/status` resolves the live entitlement; `/api/billing/tiers`
 * supplies the available plans (with real Stripe priceIds resolved from
 * the entitlements registry). Selecting a non-current tier POSTs to
 * `/api/billing/checkout` and follows the returned URL when Stripe
 * supplies one — exactly what a real upgrade flow does.
 */
export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [tiers, setTiers] = useState<BillingTier[]>([])
  const [cycle, setCycle] = useState<'month' | 'year'>('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statusRes, tiersRes] = await Promise.all([
        http.get<BillingStatus>('/billing/status'),
        http.get<{ data: BillingTier[] }>('/billing/tiers'),
      ])
      setStatus(statusRes.data ?? null)
      setTiers(Array.isArray(tiersRes.data?.data) ? tiersRes.data.data : [])
    } catch (error) {
      logError('billing.reload', error)
      setError(t('billing.loadFailed', {}, { defaultValue: 'Could not load billing.' }))
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const currentTier = useMemo(
    () => tiers.find((t) => t.key === status?.category) ?? null,
    [tiers, status],
  )

  const handleSelect = useCallback(
    async (priceId: string | null, key: string) => {
      if (!priceId) {
        setActionMsg(
          t('billing.freeNoOp', {}, { defaultValue: 'Free is the default — nothing to charge.' }),
        )
        return
      }
      setPendingKey(key)
      setActionMsg(null)
      try {
        const res = await http.post<{ checkoutUrl?: string; updated?: boolean }>(
          '/billing/checkout',
          { priceId },
        )
        if (res.data?.checkoutUrl) {
          window.location.href = res.data.checkoutUrl
          return
        }
        if (res.data?.updated) {
          setActionMsg(t('nav.subscriptionUpdated', {}, { defaultValue: 'Subscription updated.' }))
          await reload()
        } else {
          setActionMsg(
            t('nav.couldNotStartCheckout', {}, { defaultValue: 'Could not start checkout.' }),
          )
        }
      } catch (error) {
        logError('billing.handleSelect', error)
        setActionMsg(
          t('nav.couldNotStartCheckout', {}, { defaultValue: 'Could not start checkout.' }),
        )
      } finally {
        setPendingKey(null)
      }
    },
    [http, reload, t],
  )

  const handleCancel = useCallback(async () => {
    if (
      !window.confirm(
        t('billing.cancelConfirm', {}, { defaultValue: 'Cancel your active subscription?' }),
      )
    ) {
      return
    }
    setPendingKey('cancel')
    try {
      await http.post('/billing/cancel', {})
      setActionMsg(t('nav.subscriptionCancelled', {}, { defaultValue: 'Subscription cancelled.' }))
      await reload()
    } catch (error) {
      logError('billing.handleCancel', error)
      setActionMsg(t('billing.cancelFailed', {}, { defaultValue: 'Could not cancel.' }))
    } finally {
      setPendingKey(null)
    }
  }, [http, reload, t])

  if (loading) {
    return (
      <div className={cm.cn('p-12 text-center text-on-surface-variant')}>
        {t('billing.loading', {}, { defaultValue: 'Loading billing…' })}
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 10), 'mx-auto w-full max-w-7xl space-y-12')}>
      <header>
        <p
          className={cm.cn(
            'text-[11px] font-black uppercase tracking-[0.32em] text-on-surface-variant mb-2',
          )}
        >
          {t('billing.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}} · Billing' })}
        </p>
        <h1
          className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface')}
          style={{
            fontFamily:
              'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
          }}
        >
          {t(
            'billing.heading',
            {},
            { defaultValue: 'A pen, a page, and a quiet bill at the end of the month.' },
          )}
        </h1>
        <p className={cm.cn(cm.sp('mt', 2), 'text-base text-on-surface-variant max-w-xl')}>
          {t(
            'billing.subtitle',
            {},
            {
              defaultValue:
                'Free is enough to get the words down. Pro unlocks focus mode, version history, and the export formats your editor will actually accept.',
            },
          )}
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className={cm.cn(
            'rounded-lg border border-error/40 bg-error/5 px-4 py-2 text-sm text-error',
          )}
        >
          {error}
        </div>
      ) : null}

      {actionMsg ? (
        <div
          role="status"
          data-testid="billing-action-msg"
          className={cm.cn(
            'rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary',
          )}
        >
          {actionMsg}
        </div>
      ) : null}

      {status ? (
        <section
          data-testid="billing-current"
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' }),
              'gap-4',
            )}
          >
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span
                className={cm.cn(
                  cm.w(11),
                  cm.h(11),
                  cm.flex({ align: 'center', justify: 'center' }),
                  'rounded-xl bg-primary/10 text-primary',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  workspace_premium
                </span>
              </span>
              <div>
                <p
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-[0.32em] text-on-surface-variant',
                  )}
                >
                  {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
                </p>
                <p
                  className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface')}
                  style={{
                    fontFamily:
                      'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                  }}
                >
                  {status.name}
                </p>
                <p className={cm.cn('mt-0.5 text-sm text-on-surface-variant')}>
                  {status.isFree
                    ? t(
                        'billing.current.freeNote',
                        {},
                        { defaultValue: 'Upgrade any time — no card on file.' },
                      )
                    : t(
                        'billing.current.activeNote',
                        { plan: status.planKey },
                        { defaultValue: 'Active subscription · {{plan}}' },
                      )}
                </p>
              </div>
            </div>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <Link
                to="/settings"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-xl text-sm font-semibold border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors',
                )}
              >
                {t('billing.current.manage', {}, { defaultValue: 'Manage profile' })}
              </Link>
              {!status.isFree ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={pendingKey === 'cancel'}
                  data-testid="billing-cancel"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'rounded-xl text-sm font-bold border border-error/40 text-error disabled:opacity-50',
                  )}
                >
                  {pendingKey === 'cancel'
                    ? t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })
                    : t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
                </button>
              ) : null}
            </div>
          </div>
          {currentTier ? (
            <ul
              data-testid="billing-current-limits"
              className={cm.cn(
                'mt-6 grid grid-cols-2 md:grid-cols-3 gap-3 text-[12px] text-on-surface-variant',
              )}
            >
              {Object.entries(currentTier.limits).map(([key, value]) => (
                <li
                  key={key}
                  className={cm.cn(
                    'rounded-lg bg-surface-container/40 px-3 py-2 flex justify-between gap-2',
                  )}
                >
                  <span className={cm.cn('font-semibold text-on-surface')}>{key}</span>
                  <span className={cm.cn('font-bold tabular-nums')}>
                    {typeof value === 'boolean'
                      ? value
                        ? '✓'
                        : '—'
                      : value >= 999_999
                        ? '∞'
                        : value.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'mb-8')}>
          <div
            className={cm.cn(
              cm.sp('p', 1),
              'inline-flex rounded-full bg-surface-container border border-outline-variant/40',
            )}
          >
            {(['month', 'year'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                data-testid={`billing-cycle-${c}`}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  'rounded-full text-sm font-bold transition-colors',
                  cycle === c
                    ? 'bg-gradient-to-br from-primary to-primary-container text-white shadow-md'
                    : 'text-on-surface-variant hover:text-on-surface',
                )}
              >
                {c === 'month'
                  ? t('status.monthly', {}, { defaultValue: 'Monthly' })
                  : t('billing.cycle.yearly', {}, { defaultValue: 'Yearly' })}
              </button>
            ))}
          </div>
        </div>

        <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-6')}>
          {tiers.map((tier) => {
            const price = tier.prices.find((p) => p.period === cycle) ?? tier.prices[0] ?? null
            const isCurrent = status?.category === tier.key
            const isHighlight = tier.key === 'pro'
            return (
              <div
                key={tier.key}
                data-testid={`billing-tier-${tier.key}`}
                className={cm.cn(
                  cm.sp('p', 8),
                  'relative overflow-hidden rounded-2xl flex flex-col',
                  isHighlight
                    ? 'bg-gradient-to-br from-primary via-primary to-primary-container text-white shadow-[0_30px_70px_-30px_rgba(124,58,237,0.55)]'
                    : 'bg-surface-container-lowest border border-outline-variant/30',
                )}
              >
                <div className={cm.cn('relative z-10 flex-1 flex flex-col')}>
                  {isHighlight ? (
                    <span
                      className={cm.cn(
                        'inline-flex w-fit px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-surface/20 text-white mb-3',
                      )}
                    >
                      {t('status.mostPopular', {}, { defaultValue: 'Most popular' })}
                    </span>
                  ) : null}
                  <p
                    className={cm.cn(
                      'text-2xl font-extrabold tracking-tight',
                      isHighlight ? 'text-white' : 'text-on-surface',
                    )}
                    style={{
                      fontFamily:
                        'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                    }}
                  >
                    {tier.name}
                  </p>
                  <p
                    className={cm.cn(
                      'mt-1 text-sm',
                      isHighlight ? 'text-white/80' : 'text-on-surface-variant',
                    )}
                  >
                    {TIER_TAGLINES[tier.key] ?? ''}
                  </p>

                  <div className={cm.cn('mt-6 flex items-baseline gap-1')}>
                    <span
                      className={cm.cn(
                        'text-5xl font-extrabold tracking-tighter tabular-nums',
                        isHighlight ? 'text-white' : 'text-on-surface',
                      )}
                      style={{
                        fontFamily:
                          'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                      }}
                    >
                      {price?.price ?? '—'}
                    </span>
                  </div>

                  <ul className={cm.cn('mt-6 space-y-2.5 flex-1')}>
                    {Object.entries(tier.limits).map(([key, value]) => (
                      <li key={key} className={cm.cn('flex items-start gap-2 text-[14px]')}>
                        <span
                          className={cm.cn(
                            'material-symbols-outlined text-[16px] mt-0.5',
                            isHighlight ? 'text-white' : 'text-primary',
                          )}
                          aria-hidden="true"
                        >
                          {typeof value === 'boolean' && !value ? 'remove' : 'check'}
                        </span>
                        <span className={isHighlight ? 'text-white/95' : 'text-on-surface'}>
                          {key}:{' '}
                          {typeof value === 'boolean'
                            ? value
                              ? '✓'
                              : '—'
                            : value >= 999_999
                              ? '∞'
                              : value.toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => void handleSelect(price?.stripePriceId ?? null, tier.key)}
                    disabled={pendingKey === tier.key || isCurrent}
                    data-testid={`billing-select-${tier.key}`}
                    className={cm.cn(
                      cm.sp('mt', 6),
                      cm.sp('py', 3),
                      'w-full rounded-xl text-sm font-bold transition-opacity',
                      isCurrent
                        ? 'bg-surface-container-low text-on-surface-variant cursor-default'
                        : isHighlight
                          ? 'bg-surface text-primary shadow-md hover:opacity-95'
                          : 'bg-gradient-to-br from-primary to-primary-container text-white shadow-md hover:opacity-95',
                      'disabled:opacity-50',
                    )}
                  >
                    {isCurrent
                      ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
                      : pendingKey === tier.key
                        ? t('billing.checkingOut', {}, { defaultValue: 'Opening checkout…' })
                        : tier.key === 'free'
                          ? t('billing.freeCta', {}, { defaultValue: 'Stay on Free' })
                          : t(
                              'billing.upgradeCta',
                              { name: tier.name },
                              { defaultValue: 'Upgrade to {{name}}' },
                            )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default Billing
