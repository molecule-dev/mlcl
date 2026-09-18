import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { PageHeading } from '../components/PageHeading.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface UsageRow {
  key: string
  defaultLabel: string
  used: number
  limit: number
  suffix: string
}
interface UsageBreakdown {
  words?: { used: number; limit: number }
  projects?: { used: number; limit: number }
  seats?: { used: number; limit: number }
}

interface PriceRow {
  period: 'month' | 'year'
  price: string
  stripePriceId: string | null
}

interface ApiTier {
  key?: string
  name?: string
  prices?: PriceRow[]
  limits?: Record<string, unknown>
  planKey?: string
  category?: string
  isFree?: boolean
}

const FALLBACK_USAGE: ReadonlyArray<UsageRow> = [
  { key: 'words', defaultLabel: 'Words / month', used: 0, limit: 250_000, suffix: '' },
  { key: 'projects', defaultLabel: 'Active projects', used: 0, limit: 25, suffix: '' },
  { key: 'seats', defaultLabel: 'Team seats', used: 0, limit: 5, suffix: '' },
]

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [usage, setUsage] = useState<ReadonlyArray<UsageRow>>(FALLBACK_USAGE)
  const [tier, setTier] = useState<ApiTier | null>(null)
  const [tiers, setTiers] = useState<ReadonlyArray<ApiTier>>([])
  const [period, setPeriod] = useState<'month' | 'year'>('month')
  const [loading, setLoading] = useState(true)
  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/reports/billing_usage').catch(() => null),
      http.get('/billing/status').catch(() => null),
      http.get('/billing/tiers').catch(() => null),
    ])
      .then(([uRes, sRes, tRes]) => {
        if (cancelled) return
        // http.get returns HttpResponse<T> = { data: T, status }. The wire body
        // sits at .data; unwrapList/unwrapSingle further unwrap a `{data}`
        // envelope inside that body when the API uses one.
        const uBody = (uRes as { data?: unknown } | null)?.data ?? uRes
        const sBody = (sRes as { data?: unknown } | null)?.data ?? sRes
        const tBody = (tRes as { data?: unknown } | null)?.data ?? tRes
        const breakdown = unwrapSingle<UsageBreakdown>(uBody)
        if (breakdown) {
          setUsage([
            {
              key: 'words',
              defaultLabel: 'Words / month',
              used: breakdown.words?.used ?? 0,
              limit: breakdown.words?.limit ?? 250_000,
              suffix: '',
            },
            {
              key: 'projects',
              defaultLabel: 'Active projects',
              used: breakdown.projects?.used ?? 0,
              limit: breakdown.projects?.limit ?? 25,
              suffix: '',
            },
            {
              key: 'seats',
              defaultLabel: 'Team seats',
              used: breakdown.seats?.used ?? 0,
              limit: breakdown.seats?.limit ?? 5,
              suffix: '',
            },
          ])
        }
        const apiTier = unwrapSingle<ApiTier>(sBody)
        if (apiTier) setTier(apiTier)
        const tierList = unwrapList<ApiTier>(tBody)
        setTiers(tierList)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const planLabel = tier?.name ?? 'Free'
  const currentCategory = tier?.category ?? 'free'

  const handleSwitchPlan = async (apiTier: ApiTier) => {
    if (busyAction) return
    const price =
      (apiTier.prices ?? []).find((p) => p.period === period && p.stripePriceId) ??
      (apiTier.prices ?? []).find((p) => Boolean(p.stripePriceId))
    if (!price?.stripePriceId) {
      setActionStatus(
        t(
          'billing.priceMissing',
          {},
          { defaultValue: 'No Stripe price configured for this plan yet.' },
        ),
      )
      return
    }
    setBusyAction(apiTier.key ?? 'unknown')
    try {
      const res = await http.post('/billing/checkout', { priceId: price.stripePriceId })
      const body = res as unknown as {
        data?: { checkoutUrl?: string; updated?: boolean }
        checkoutUrl?: string
        updated?: boolean
      }
      const checkoutUrl = body.data?.checkoutUrl ?? body.checkoutUrl
      const updated = body.data?.updated ?? body.updated
      if (checkoutUrl) {
        setActionStatus(t('billing.redirecting', {}, { defaultValue: 'Redirecting to Stripe…' }))
        window.location.href = checkoutUrl
        return
      }
      if (updated) {
        setActionStatus(
          t(
            'billing.switched',
            { name: apiTier.name ?? '' },
            { defaultValue: 'Switched to {{name}}.' },
          ),
        )
        const sRes = await http.get('/billing/status').catch(() => null)
        const sBody = (sRes as { data?: unknown } | null)?.data ?? sRes
        const refreshed = unwrapSingle<ApiTier>(sBody)
        if (refreshed) setTier(refreshed)
        return
      }
      setActionStatus(t('billing.switchFailed', {}, { defaultValue: 'Could not change plans.' }))
    } catch (_error) {
      // Plan-switch request failed — surface the error message to the user.
      setActionStatus(t('billing.switchFailed', {}, { defaultValue: 'Could not change plans.' }))
    } finally {
      setBusyAction(null)
    }
  }

  const handleManagePlan = async () => {
    if (currentCategory === 'free') {
      const proTier = tiers.find((t) => t.key === 'pro')
      if (proTier) {
        await handleSwitchPlan(proTier)
        return
      }
    }
    if (busyAction) return
    setBusyAction('cancel')
    try {
      const res = await http.post('/billing/cancel', {})
      const body = res as unknown as { data?: { canceled?: boolean }; canceled?: boolean }
      if (body.data?.canceled || body.canceled) {
        setActionStatus(
          t(
            'billing.canceled',
            {},
            {
              defaultValue:
                'Subscription canceled. You will revert to Free at the end of the period.',
            },
          ),
        )
        const sRes = await http.get('/billing/status').catch(() => null)
        const sBody = (sRes as { data?: unknown } | null)?.data ?? sRes
        const refreshed = unwrapSingle<ApiTier>(sBody)
        if (refreshed) setTier(refreshed)
      } else {
        setActionStatus(
          t(
            'billing.cancelFailed',
            {},
            { defaultValue: 'Could not cancel — no active subscription.' },
          ),
        )
      }
    } catch (_error) {
      // Cancellation request failed — surface the error message to the user.
      setActionStatus(
        t(
          'billing.cancelFailed',
          {},
          { defaultValue: 'Could not cancel — no active subscription.' },
        ),
      )
    } finally {
      setBusyAction(null)
    }
  }

  const planFeatures = useMemo(
    () => ({
      free: [
        t('billing.free.0', {}, { defaultValue: '5 projects' }),
        t('billing.free.1', {}, { defaultValue: '5 translations' }),
        t('billing.free.2', {}, { defaultValue: '90 day retention' }),
      ],
      pro: [
        t('billing.pro.0', {}, { defaultValue: '500 projects' }),
        t('billing.pro.1', {}, { defaultValue: '500 translations' }),
        t('billing.pro.2', {}, { defaultValue: 'Advanced AI features' }),
        t('billing.pro.3', {}, { defaultValue: 'Export your data' }),
      ],
      team: [
        t('billing.team.0', {}, { defaultValue: 'Unlimited projects' }),
        t('billing.team.1', {}, { defaultValue: 'Unlimited translations' }),
        t('billing.team.2', {}, { defaultValue: 'Reviewer flow' }),
        t('billing.team.3', {}, { defaultValue: 'No retention limit' }),
      ],
    }),
    [t],
  )

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'lg' }),
        cm.sp('p', 8),
        cm.maxW('6xl'),
        cm.mxAuto,
        cm.minH('screen'),
        'w-full',
      )}
    >
      <PageHeading
        eyebrow={t('nav.subscription', {}, { defaultValue: 'Subscription' })}
        title={t('settings.billing', {}, { defaultValue: 'Billing' })}
        subtitle={t(
          'billing.subtitle',
          { app: APP_NAME },
          { defaultValue: `Plan, usage, and invoices for the ${APP_NAME} workspace.` },
        )}
      />

      <section
        className={cm.cn(
          cm.sp('p', 8),
          'rounded-[1.75rem] bg-gradient-to-br from-primary to-primary-container text-on-primary relative overflow-hidden',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          )}
        >
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'font-bold uppercase tracking-widest text-primary-fixed/80',
              )}
            >
              {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
            </p>
            <p
              data-mol-id="billing-current-plan-name"
              className={cm.cn(cm.textSize('4xl'), 'mt-2 font-extrabold tracking-tighter')}
            >
              {planLabel}
            </p>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-primary/80')}>
              {currentCategory === 'free'
                ? t(
                    'billing.upgradeHint',
                    {},
                    { defaultValue: 'Upgrade to unlock advanced AI features.' },
                  )
                : t('billing.renewsOn', {}, { defaultValue: 'Renews monthly. Manage to change.' })}
            </p>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <button
              data-mol-id="billing-manage"
              onClick={() => {
                void handleManagePlan()
              }}
              type="button"
              disabled={busyAction !== null}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full text-primary bg-surface hover:bg-on-primary/90 disabled:opacity-60',
              )}
            >
              {currentCategory === 'free'
                ? t('settings.upgrade', {}, { defaultValue: 'Upgrade' })
                : t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
            </button>
          </div>
        </div>
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
          )}
        />
      </section>

      {actionStatus && (
        <div
          role="status"
          data-mol-id="billing-status"
          className={cm.cn(
            cm.sp('p', 3),
            'rounded-xl bg-primary-fixed/40 text-on-primary-fixed text-sm',
          )}
        >
          {actionStatus}
        </div>
      )}

      {loading && (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('billing.loading', {}, { defaultValue: 'Loading billing…' })}
        </p>
      )}

      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}>
        {usage.map((u) => {
          const pct = Math.min(100, Math.round((u.used / Math.max(u.limit, 1)) * 100))
          const tone = pct >= 90 ? 'bg-tertiary' : pct >= 60 ? 'bg-warning' : 'bg-primary'
          return (
            <article
              key={u.key}
              className={cm.cn(
                cm.sp('p', 5),
                'bg-surface-container-lowest rounded-xl border border-surface-container/50 shadow-sm',
              )}
            >
              <h3
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mb', 3),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t(`billing.usage.${u.key}`, {}, { defaultValue: u.defaultLabel })}
              </h3>
              <p className={cm.cn(cm.textSize('2xl'), 'font-extrabold tabular-nums')}>
                {u.used.toLocaleString()}
                <span className={cm.cn('text-on-surface-variant text-base font-medium')}>
                  {' '}
                  / {u.limit.toLocaleString()}
                  {u.suffix}
                </span>
              </p>
              <div
                className={cm.cn(
                  'mt-3 h-1.5 bg-surface-container-high rounded-full overflow-hidden',
                )}
              >
                <div className={cm.cn('h-full rounded-full', tone)} style={{ width: `${pct}%` }} />
              </div>
            </article>
          )
        })}
      </section>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          'self-start rounded-full bg-surface-container-low p-1',
        )}
      >
        <button
          data-mol-id="billing-period-month"
          type="button"
          onClick={() => setPeriod('month')}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 1),
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            'rounded-full',
            period === 'month' ? 'bg-primary text-on-primary' : 'text-on-surface-variant',
          )}
        >
          {t('billing.monthly', {}, { defaultValue: 'Monthly' })}
        </button>
        <button
          data-mol-id="billing-period-year"
          type="button"
          onClick={() => setPeriod('year')}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 1),
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            'rounded-full',
            period === 'year' ? 'bg-primary text-on-primary' : 'text-on-surface-variant',
          )}
        >
          {t('billing.yearly', {}, { defaultValue: 'Yearly' })}
        </button>
      </div>

      <section
        data-mol-id="billing-tiers"
        className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3 items-stretch')}
      >
        {tiers.map((p) => {
          const price = (p.prices ?? []).find((x) => x.period === period) ?? (p.prices ?? [])[0]
          const isCurrent = (p.key ?? p.category) === currentCategory
          const features =
            (planFeatures as Record<string, ReadonlyArray<string>>)[p.key ?? 'free'] ?? []
          return (
            <article
              key={p.key ?? p.name ?? Math.random().toString(36)}
              data-mol-id={`billing-tier-${p.key}`}
              className={cm.cn(
                cm.sp('p', 6),
                cm.flex({ direction: 'col' }),
                'h-full rounded-2xl transition-transform',
                isCurrent
                  ? 'bg-surface-container-lowest border-2 border-primary shadow-lg shadow-primary/10'
                  : 'bg-surface-container-low border border-outline-variant/20 hover:-translate-y-1',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                  {t(
                    `billing.plan.${p.key ?? ''}.name`,
                    {},
                    { defaultValue: p.name ?? p.key ?? '' },
                  )}
                </h3>
                {isCurrent && (
                  <span
                    className={cm.cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary text-on-primary',
                    )}
                  >
                    {t('nav.current', {}, { defaultValue: 'Current' })}
                  </span>
                )}
              </div>
              <p
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.sp('mt', 2),
                  'font-extrabold tabular-nums tracking-tight',
                )}
              >
                {price?.price ?? '—'}
              </p>
              <ul
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.flex1,
                  cm.sp('mt', 4),
                  cm.sp('mb', 6),
                )}
              >
                {features.map((f, i) => (
                  <li
                    key={i}
                    className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }), cm.textSize('sm'))}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-primary text-base mt-0.5')}
                      aria-hidden="true"
                    >
                      check_circle
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                data-mol-id={`billing-switch-${p.key}`}
                type="button"
                disabled={isCurrent || !price?.stripePriceId || busyAction === p.key}
                onClick={() => {
                  void handleSwitchPlan(p)
                }}
                className={cm.cn(
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'w-full rounded-full ',
                  isCurrent
                    ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
                    : 'text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 shadow-sm shadow-primary/30 disabled:opacity-60',
                )}
              >
                {isCurrent
                  ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
                  : !price?.stripePriceId
                    ? t('billing.contactSales', {}, { defaultValue: 'Contact sales' })
                    : busyAction === p.key
                      ? t('billing.switchPending', {}, { defaultValue: 'Confirming…' })
                      : t(
                          'billing.switchTo',
                          { name: p.name ?? p.key ?? '' },
                          { defaultValue: 'Switch to {{name}}' },
                        )}
              </button>
            </article>
          )
        })}
      </section>
    </div>
  )
}

export default Billing
export { Billing as BillingPage }
