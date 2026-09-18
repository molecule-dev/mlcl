import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WhiteboardLayout } from '../components/WhiteboardLayout.js'

interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
  limits: {
    maxBoards?: number
    maxCollaborators?: number
    maxElements?: number
    advancedFeatures?: boolean
    canExport?: boolean
    retentionDays?: number
  }
}

interface PricingTier {
  key: string
  name: string
  description?: string
  prices: Array<{
    period: string
    price: string
    stripePriceId?: string | null
  }>
  limits?: BillingStatus['limits']
}

interface BoardRow {
  id: string
}

interface CollaboratorRow {
  id: string
  user_id?: string | null
  email?: string | null
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [tiers, setTiers] = useState<PricingTier[]>([])
  const [boardCount, setBoardCount] = useState(0)
  const [collabCount, setCollabCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [s, p, boards] = await Promise.all([
        http.get<BillingStatus>('/api/billing/status'),
        http.get<{ data: PricingTier[] }>('/api/billing/tiers'),
        http.get<BoardRow[]>('/api/boards'),
      ])
      setStatus(s.data ?? null)
      setTiers(Array.isArray(p.data?.data) ? p.data.data : [])
      const list = Array.isArray(boards.data) ? boards.data : []
      setBoardCount(list.length)
      let c = 0
      await Promise.all(
        list.map(async (b) => {
          try {
            const cr = await http.get<CollaboratorRow[]>(`/api/collaborators/${b.id}`)
            c += Array.isArray(cr.data) ? cr.data.length : 0
          } catch (_error) {
            // best-effort: a failed per-board collab fetch is excluded from the count
          }
        }),
      )
      setCollabCount(c)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleSwitch = useCallback(
    async (priceId: string) => {
      setBusy(true)
      setActionStatus(null)
      try {
        const res = await http.post<{ checkoutUrl?: string; updated?: boolean }>(
          '/api/billing/checkout',
          { priceId },
        )
        if (res.data?.checkoutUrl) {
          window.location.href = res.data.checkoutUrl
        } else if (res.data?.updated) {
          setActionStatus(t('billing.updated', {}, { defaultValue: 'Plan updated.' })!)
          await refresh()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(false)
      }
    },
    [http, refresh, t],
  )

  const handleCancel = useCallback(async () => {
    setBusy(true)
    setActionStatus(null)
    try {
      await http.post('/api/billing/cancel', {})
      setActionStatus(t('billing.canceled', {}, { defaultValue: 'Subscription canceled.' })!)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }, [http, refresh, t])

  const usage = [
    {
      label: 'boards',
      title: t('billing.usage.boards', {}, { defaultValue: 'Active boards' })!,
      value: boardCount,
      max: status?.limits?.maxBoards ?? 0,
      icon: 'space_dashboard',
    },
    {
      label: 'collaborators',
      title: t('billing.usage.collaborators', {}, { defaultValue: 'Collaborators' })!,
      value: collabCount,
      max: status?.limits?.maxCollaborators ?? 0,
      icon: 'group',
    },
  ]

  return (
    <WhiteboardLayout
      eyebrow={t('billing.eyebrow', {}, { defaultValue: 'Workspace billing' })}
      title={t('billing.title', {}, { defaultValue: 'Plan & invoices' })}
      actions={
        <Link
          to="/pricing"
          data-mol-id="billing-compare"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'bg-surface-container text-on-surface rounded-xl border border-outline-variant/40 hover:bg-surface-container-high transition-colors',
          )}
        >
          {t('billing.comparePlans', {}, { defaultValue: 'Compare plans' })}
        </Link>
      }
    >
      <div className={cm.stack(8)}>
        {error && (
          <div
            role="alert"
            data-mol-id="billing-error"
            className={cm.cn(
              cm.sp('p', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl bg-error-container/40 text-on-error-container',
            )}
          >
            {error}
          </div>
        )}
        {actionStatus && (
          <div
            role="status"
            data-mol-id="billing-status"
            className={cm.cn(
              cm.sp('p', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-xl bg-secondary-container/40 text-on-secondary-container',
            )}
          >
            {actionStatus}
          </div>
        )}

        <section
          data-mol-id="billing-current"
          className={cm.cn(
            cm.sp('p', 8),
            cm.flex({ direction: 'col', gap: 'lg' }),
            'rounded-[2rem] bg-gradient-to-br from-primary to-primary-hover text-white relative overflow-hidden',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'start', justify: 'between', gap: 'md' }),
              'relative z-10 flex-wrap',
            )}
          >
            <div className={cm.stack(3)}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.roundedFull,
                  cm.fontWeight('bold'),
                  'w-fit text-[10px] uppercase tracking-widest bg-surface/20 backdrop-blur-md',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[14px]')}>
                  workspace_premium
                </span>
                {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
              </span>
              <h2
                data-mol-id="billing-plan-name"
                className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tighter')}
              >
                {status?.name ??
                  (loading
                    ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
                    : t('billing.freePlanName', {}, { defaultValue: 'Free' }))}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-white/80')}>
                {status?.isFree
                  ? t('billing.freePlanBody', {}, { defaultValue: 'Forever-free starter tier.' })
                  : t('billing.paidPlanBody', {}, { defaultValue: 'Active subscription.' })}
              </p>
            </div>
            {!status?.isFree && (
              <button
                type="button"
                data-mol-id="billing-cancel"
                onClick={handleCancel}
                disabled={busy}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'bg-surface/20 backdrop-blur-md text-white rounded-xl border border-surface/30 disabled:opacity-60',
                )}
              >
                {t('billing.cancelPlan', {}, { defaultValue: 'Cancel plan' })}
              </button>
            )}
          </div>
        </section>

        <section data-mol-id="billing-usage" className={cm.cn(cm.grid({ cols: 2, gap: 'lg' }))}>
          {usage.map((u) => {
            const pct = u.max > 0 ? Math.min(100, (u.value / u.max) * 100) : 0
            return (
              <article
                key={u.label}
                data-mol-id={`billing-usage-${u.label}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.stack(4),
                  'bg-surface-container-lowest rounded-2xl border-t-4 border-primary shadow-sm',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(10),
                      cm.h(10),
                      cm.roundedFull,
                      'bg-primary-fixed/40 text-primary-dark',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-[18px]')}>{u.icon}</span>
                  </span>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {u.title}
                  </span>
                </div>
                <div className={cm.stack(1)}>
                  <p
                    className={cm.cn(
                      cm.textSize('3xl'),
                      'font-extrabold tracking-tight text-on-surface',
                    )}
                  >
                    {u.value}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'text-on-surface-variant',
                    )}
                  >
                    {t('billing.usageOf', { max: u.max }, { defaultValue: 'of {{max}} included' })}
                  </p>
                </div>
                <div
                  className={cm.cn(
                    cm.h(2),
                    'w-full rounded-full bg-surface-container overflow-hidden',
                  )}
                >
                  <div
                    className={cm.cn(
                      'h-full bg-gradient-to-r from-primary to-primary-hover rounded-full',
                    )}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </article>
            )
          })}
        </section>

        {tiers.length > 0 && (
          <section
            data-mol-id="billing-tiers"
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
            )}
          >
            <h3 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
              {t('billing.upgradeTitle', {}, { defaultValue: 'Available plans' })}
            </h3>
            <div className={cm.cn(cm.grid({ cols: tiers.length > 2 ? 3 : 2, gap: 'lg' }))}>
              {tiers.map((tier) => (
                <article
                  key={tier.key}
                  data-mol-id={`billing-tier-${tier.key}`}
                  className={cm.cn(
                    cm.sp('p', 5),
                    cm.stack(3),
                    'rounded-2xl border border-outline-variant/30 bg-surface-container-low',
                    status?.planKey === tier.key ? 'ring-2 ring-primary/50' : '',
                  )}
                >
                  <h4 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
                    {tier.name}
                  </h4>
                  {tier.description && (
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {tier.description}
                    </p>
                  )}
                  <div className={cm.stack(1)}>
                    {tier.prices.map((pr) => (
                      <button
                        key={pr.stripePriceId ?? `${tier.key}-${pr.period}`}
                        type="button"
                        data-mol-id={`billing-buy-${tier.key}-${pr.period}`}
                        disabled={busy || !pr.stripePriceId || status?.planKey === tier.key}
                        onClick={() => pr.stripePriceId && handleSwitch(pr.stripePriceId)}
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          cm.fontWeight('bold'),
                          cm.textSize('sm'),
                          'rounded-lg bg-primary text-white disabled:opacity-50',
                        )}
                      >
                        {status?.planKey === tier.key
                          ? t('nav.current', {}, { defaultValue: 'Current' })
                          : t(
                              'billing.priceLabel',
                              { price: pr.price, period: pr.period },
                              { defaultValue: '{{price}} / {{period}}' },
                            )}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </WhiteboardLayout>
  )
}

export default Billing
