import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface Invoice {
  id: string
  date: string
  amount_cents: number
  status: string
}

interface PaymentMethod {
  brand?: string | null
  last4?: string | null
  expires?: string | null
}

interface BillingData {
  plan_name?: string | null
  monthly_cents?: number | null
  requests_used?: number | null
  requests_quota?: number | null
  payment_method?: PaymentMethod | null
  invoices?: Invoice[]
}

interface PricingTier {
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
}

function fmtCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpdateCard, setShowUpdateCard] = useState(false)
  const [tiers, setTiers] = useState<PricingTier[]>([])
  const [showPlanPicker, setShowPlanPicker] = useState(false)
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/billing')
      .then((res) => {
        if (!cancelled) setData(unwrapSingle<BillingData>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('billing.loadError', {}, { defaultValue: 'Failed to load billing.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  useEffect(() => {
    let cancelled = false
    http
      .get<{ data: PricingTier[] }>('/api/billing/tiers')
      .then((res) => {
        if (cancelled) return
        const payload = res?.data as { data?: PricingTier[] } | undefined
        const list = Array.isArray(payload?.data) ? payload.data : []
        setTiers(list.filter((t) => t.key !== 'free'))
      })
      .catch(() => {
        if (!cancelled) setTiers([])
      })
    return () => {
      cancelled = true
    }
  }, [http])

  function handleChangePlan(priceId: string) {
    setCheckoutBusy(priceId)
    setCheckoutError(null)
    http
      .post<{ checkoutUrl?: string; updated?: boolean }>('/api/billing/checkout', { priceId })
      .then((res) => {
        const payload = res?.data as { checkoutUrl?: string; updated?: boolean } | undefined
        if (payload?.checkoutUrl && typeof window !== 'undefined') {
          track({ name: 'billing.checkout_started', properties: { price_id: priceId } })
          window.location.assign(payload.checkoutUrl)
          return
        }
        if (payload?.updated) {
          setShowPlanPicker(false)
          track({ name: 'billing.plan_updated', properties: { price_id: priceId } })
          // Re-read billing summary so plan_name reflects the upgrade.
          http
            .get('/api/billing')
            .then((r) => setData(unwrapSingle<BillingData>(r)))
            .catch(() => {
              /* ignore */
            })
        } else {
          setCheckoutError(
            t(
              'billing.checkoutError',
              {},
              { defaultValue: 'Could not start checkout. Try again.' },
            ),
          )
        }
      })
      .catch(() => {
        setCheckoutError(
          t('billing.checkoutError', {}, { defaultValue: 'Could not start checkout. Try again.' }),
        )
      })
      .finally(() => setCheckoutBusy(null))
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  if (error) {
    return <div className={cm.cn(cm.sp('p', 8), 'text-error')}>{error}</div>
  }

  const billing: BillingData = data ?? {}
  const planName = billing.plan_name ?? t('nav.free', {}, { defaultValue: 'Free' })
  const monthlyCents = billing.monthly_cents ?? 0
  const requestsUsed = billing.requests_used ?? 0
  const requestsQuota = billing.requests_quota ?? 0
  const usagePct =
    requestsQuota > 0 ? Math.min(100, Math.round((requestsUsed / requestsQuota) * 100)) : 0
  const invoices = billing.invoices ?? []
  const paymentMethod = billing.payment_method ?? null

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn(
            'text-[11px] font-bold uppercase tracking-widest text-emerald-400 font-mono mb-2',
          )}
        >
          {t('billing.eyebrow', {}, { defaultValue: 'BILLING' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('billing.heading', {}, { defaultValue: 'Plan and invoices' })}
        </h1>
      </header>

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <div
          className={cm.cn(cm.sp('p', 6), 'lg:col-span-2 bg-surface-container-lowest rounded-2xl')}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-mono">
            {t('billing.currentPlan', {}, { defaultValue: 'CURRENT_PLAN' })}
          </p>
          <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }), cm.sp('mt', 2))}>
            <span className={cm.cn(cm.textSize('5xl'), 'font-extrabold tracking-tighter')}>
              {planName}
            </span>
            {monthlyCents > 0 ? (
              <span className={cm.cn('text-base text-on-surface-variant font-mono')}>
                {t(
                  'billing.perMonth',
                  { price: fmtCents(monthlyCents) },
                  { defaultValue: '{{price}}/mo' },
                )}
              </span>
            ) : null}
          </div>

          <div
            className={cm.cn(cm.sp('mt', 4), cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}
          >
            <button
              type="button"
              onClick={() => setShowPlanPicker((v) => !v)}
              aria-expanded={showPlanPicker}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'text-xs font-bold rounded-full bg-emerald-500 text-white hover:bg-emerald-400 transition-colors',
              )}
            >
              {showPlanPicker
                ? t('common.cancel', {}, { defaultValue: 'Cancel' })
                : t('billing.changePlanCta', {}, { defaultValue: 'Change plan' })}
            </button>
            {checkoutError ? (
              <span className={cm.cn(cm.textSize('sm'), 'text-error')}>{checkoutError}</span>
            ) : null}
          </div>

          {showPlanPicker ? (
            <div
              className={cm.cn(
                cm.sp('mt', 4),
                cm.sp('p', 4),
                'rounded-xl bg-surface-container-low',
              )}
              data-testid="plan-picker"
            >
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant uppercase tracking-widest font-mono',
                  cm.sp('mb', 3),
                )}
              >
                {t('billing.pickPlanLabel', {}, { defaultValue: 'PICK_A_PLAN' })}
              </p>
              <ul className="space-y-2">
                {tiers.map((tier) => (
                  <li
                    key={tier.key}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
                    )}
                  >
                    <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                      {tier.name}
                    </span>
                    <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }))}>
                      {tier.prices.map((p) => (
                        <button
                          key={`${tier.key}-${p.period}`}
                          type="button"
                          disabled={!p.stripePriceId || checkoutBusy === p.stripePriceId}
                          onClick={() => p.stripePriceId && handleChangePlan(p.stripePriceId)}
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 2),
                            'text-xs font-bold rounded-md border border-emerald-500 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50',
                          )}
                        >
                          {checkoutBusy === p.stripePriceId
                            ? t('billing.checkingOutCta', {}, { defaultValue: 'Redirecting…' })
                            : t(
                                'billing.upgradeToCta',
                                { name: tier.name, period: p.period, price: p.price },
                                { defaultValue: '{{name}} · {{price}}' },
                              )}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
                {tiers.length === 0 ? (
                  <li className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'billing.noTiers',
                      {},
                      { defaultValue: 'No upgrade plans available right now.' },
                    )}
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          <div className={cm.cn('mt-6')}>
            <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-mono">
                {t('billing.usageLabel', {}, { defaultValue: 'REQUESTS_THIS_PERIOD' })}
              </p>
              <p className={cm.cn('text-xs text-on-surface-variant tabular-nums font-mono')}>
                {t('billing.usagePct', { pct: usagePct }, { defaultValue: '{{pct}}% of quota' })}
              </p>
            </div>
            <div
              className={cm.cn('mt-2 h-2 w-full bg-surface-container rounded-full overflow-hidden')}
            >
              <div
                className={cm.cn('h-full bg-emerald-500 transition-all')}
                style={{ width: `${usagePct}%` }}
                aria-hidden="true"
              />
            </div>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'font-mono tabular-nums')}>
              {requestsUsed.toLocaleString()} / {requestsQuota.toLocaleString()}
            </p>
          </div>
        </div>

        <div className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl')}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-mono">
            {t('billing.paymentMethodLabel', {}, { defaultValue: 'PAYMENT_METHOD' })}
          </p>
          {paymentMethod && paymentMethod.last4 ? (
            <>
              <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 2), 'font-extrabold')}>
                {paymentMethod.brand ?? t('billing.cardFallback', {}, { defaultValue: 'Card' })}{' '}
                •••• {paymentMethod.last4}
              </p>
              {paymentMethod.expires ? (
                <p className={cm.cn('text-xs text-on-surface-variant mt-1 font-mono')}>
                  {t(
                    'billing.expiresLabel',
                    { exp: paymentMethod.expires },
                    { defaultValue: 'Expires {{exp}}' },
                  )}
                </p>
              ) : null}
            </>
          ) : (
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
              {t('billing.noPaymentMethod', {}, { defaultValue: 'No payment method on file.' })}
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowUpdateCard((v) => !v)}
            aria-expanded={showUpdateCard}
            className={cm.cn(
              cm.sp('mt', 4),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'text-xs font-bold rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            {showUpdateCard
              ? t('common.cancel', {}, { defaultValue: 'Cancel' })
              : paymentMethod?.last4
                ? t('billing.updateCardCta', {}, { defaultValue: 'Update card' })
                : t('billing.addCardCta', {}, { defaultValue: 'Add card' })}
          </button>
          {showUpdateCard ? (
            <div
              className={cm.cn(
                cm.sp('mt', 4),
                cm.sp('p', 4),
                'rounded-xl bg-surface-container-low',
              )}
            >
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'billing.updateCardHelp',
                  {},
                  {
                    defaultValue:
                      'Card updates are processed via Stripe; you will be redirected to a secure checkout.',
                  },
                )}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
          {t('nav.invoices', {}, { defaultValue: 'Invoices' })}
        </h2>
        <div className={cm.cn('bg-surface-container-lowest rounded-2xl overflow-hidden')}>
          {invoices.length === 0 ? (
            <p
              className={cm.cn(
                cm.sp('py', 12),
                cm.sp('px', 6),
                cm.textCenter,
                'text-on-surface-variant',
              )}
            >
              {t('billing.invoicesEmpty', {}, { defaultValue: 'No invoices yet.' })}
            </p>
          ) : (
            <table className={cm.cn('w-full')}>
              <thead className={cm.cn('border-b border-outline-variant/30')}>
                <tr>
                  {(
                    [
                      ['invoiceId', 'Invoice ID'],
                      ['date', 'Date'],
                      ['amount', 'Amount'],
                      ['status', 'Status'],
                    ] as const
                  ).map(([h, label]) => (
                    <th
                      key={h}
                      className={cm.cn(
                        'text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-mono',
                      )}
                    >
                      {t(`billing.col.${h}`, {}, { defaultValue: label })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className={cm.cn('hover:bg-surface-container-low transition-colors')}
                  >
                    <td className={cm.cn('px-6 py-4 text-sm font-mono text-emerald-400')}>
                      {inv.id}
                    </td>
                    <td className={cm.cn('px-6 py-4 text-sm font-mono tabular-nums')}>
                      {inv.date}
                    </td>
                    <td className={cm.cn('px-6 py-4 text-sm font-mono tabular-nums font-bold')}>
                      {fmtCents(inv.amount_cents)}
                    </td>
                    <td className={cm.cn('px-6 py-4')}>
                      <span
                        className={cm.cn(
                          'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-300',
                        )}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
