import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { KpiTile } from '../components/KpiTile.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Invoice {
  id: string
  date: string
  amount_cents: number
  status: 'paid' | 'open' | 'failed'
  url?: string
}

interface UsageItem {
  key: string
  label: string
  value: number
  max: number | null
  hint: string
}

interface BillingPlan {
  name: string
  per_seat_cents: number
  seats: number
  total_cents: number
  next_charge_cents: number
  next_charge_date?: string | null
  card_brand?: string | null
  card_last4?: string | null
  card_exp?: string | null
  seats_max?: number | null
}

function fmtCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function Billing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [plan, setPlan] = useState<BillingPlan | null>(null)
  const [usage, setUsage] = useState<UsageItem[] | null>(null)
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/billing/plan').catch(() => null),
      http.get('/api/billing/usage').catch(() => null),
      http.get('/api/billing/invoices').catch(() => null),
    ])
      .then(([planRes, usageRes, invoicesRes]) => {
        if (cancelled) return
        setPlan(unwrapSingle<BillingPlan>(planRes))
        setUsage(unwrapList<UsageItem>(usageRes))
        setInvoices(unwrapList<Invoice>(invoicesRes))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('billing.loadError', {}, { defaultValue: 'Could not load billing details.' }))
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function manageSeats() {
    setActionError(null)
    setActionMessage(null)
    try {
      await http.post('/api/billing/seats', { seats: (plan?.seats ?? 1) + 1 })
      setActionMessage(t('billing.seatsAdded', {}, { defaultValue: 'Seat count updated.' }))
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      setActionError(
        message ||
          t(
            'billing.seatsError',
            {},
            { defaultValue: 'This plan is single-seat. Upgrade to Team for multi-seat usage.' },
          ),
      )
    }
  }

  async function upgradePlan() {
    setActionError(null)
    setActionMessage(null)
    try {
      const result = await http.post<{ checkoutUrl?: string; updated?: boolean }>(
        '/api/billing/upgrade',
        { plan: 'team' },
      )
      const data =
        (result as { data?: { checkoutUrl?: string; updated?: boolean } }).data ??
        (result as { checkoutUrl?: string; updated?: boolean })
      if (data?.checkoutUrl) {
        window.location.assign(data.checkoutUrl)
        return
      }
      if (data?.updated) {
        setActionMessage(
          t(
            'billing.upgradeApplied',
            {},
            { defaultValue: 'Upgrade applied to your existing subscription.' },
          ),
        )
        return
      }
      setActionError(
        t('nav.couldNotStartCheckout', {}, { defaultValue: 'Could not start checkout.' }),
      )
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : t('nav.couldNotStartCheckout', {}, { defaultValue: 'Could not start checkout.' }),
      )
    }
  }

  async function updateCard() {
    setActionError(null)
    setActionMessage(null)
    try {
      await http.post('/api/billing/card-link', {})
      setActionMessage(
        t(
          'billing.cardLinkSent',
          {},
          { defaultValue: 'Card-update flow started — check your email.' },
        ),
      )
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : t(
              'billing.cardLinkError',
              {},
              { defaultValue: 'Could not start the update-card flow.' },
            ),
      )
    }
  }

  return (
    <div data-mol-id="page-billing" className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <header>
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
          {t('billing.eyebrow', {}, { defaultValue: 'Plan & usage' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 2),
            cm.textSize('4xl'),
            'font-extrabold tracking-tight text-on-surface',
          )}
        >
          {t('settings.billing', {}, { defaultValue: 'Billing' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'billing.subheading',
            {},
            { defaultValue: 'Subscription, seats, AI screening usage, and invoices.' },
          )}
        </p>
        {error ? (
          <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-error')}>{error}</p>
        ) : null}
        {actionMessage ? (
          <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-success')}>
            {actionMessage}
          </p>
        ) : null}
        {actionError ? (
          <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-error')}>{actionError}</p>
        ) : null}
      </header>

      {/* Plan card — gradient hero */}
      <section
        className={cm.cn(
          cm.sp('p', 8),
          'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md shadow-primary/20',
        )}
      >
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-surface/10 blur-3xl',
          )}
        />
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -left-16 -top-20 h-64 w-64 rounded-full bg-secondary-fixed/20 blur-3xl',
          )}
        />
        <div className={cm.cn('relative z-10 flex flex-wrap items-end justify-between gap-6')}>
          <div>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-primary/70',
              )}
            >
              {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
            </p>
            <p className={cm.cn('mt-1 text-4xl font-extrabold tracking-tight text-on-primary')}>
              {plan?.name ?? t('billing.planLoading', {}, { defaultValue: 'Loading plan…' })}
            </p>
            {plan ? (
              <p className={cm.cn('mt-2 text-lg font-medium text-on-primary/80')}>
                {t(
                  'billing.planSummary',
                  {
                    perSeat: fmtCurrency(plan.per_seat_cents),
                    seats: plan.seats,
                    total: fmtCurrency(plan.total_cents),
                  },
                  { defaultValue: '{{perSeat}} / seat · {{seats}} seats · {{total}} / mo' },
                )}
              </p>
            ) : null}
          </div>
          <div className={cm.cn('flex items-center gap-3')}>
            <button
              type="button"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2.5),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl bg-surface/15 backdrop-blur-md text-on-primary border border-surface/15 hover:bg-surface/20 transition-colors',
              )}
              onClick={manageSeats}
              data-mol-id="billing-manage-seats"
            >
              {t('billing.manageSeats', {}, { defaultValue: 'Manage seats' })}
            </button>
            <button
              type="button"
              data-mol-id="billing-upgrade"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2.5),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl bg-surface/95 text-primary hover:bg-surface transition-colors',
              )}
              onClick={upgradePlan}
            >
              {t('billing.upgrade', {}, { defaultValue: 'Upgrade to Team' })}
            </button>
          </div>
        </div>
      </section>

      {/* Usage gauges */}
      <div className={cm.grid({ cols: 3, gap: 'md' })}>
        {usage === null ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant col-span-3')}>
            {t('billing.usageLoading', {}, { defaultValue: 'Loading usage…' })}
          </p>
        ) : usage.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant col-span-3')}>
            {t('billing.usageEmpty', {}, { defaultValue: 'No usage data yet.' })}
          </p>
        ) : (
          usage.map((u) => {
            const pct = u.max ? Math.min(100, Math.round((u.value / u.max) * 100)) : 0
            return (
              <div
                key={u.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 border-l-4 border-l-primary shadow-sm',
                )}
              >
                <p
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(`billing.usage.${u.key}`, {}, { defaultValue: u.label })}
                </p>
                <p
                  className={cm.cn(
                    'mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-on-surface',
                  )}
                >
                  {u.value}
                  {u.max ? (
                    <span className={cm.cn('text-base font-medium text-on-surface-variant')}>
                      {' '}
                      / {u.max}
                    </span>
                  ) : null}
                </p>
                {u.max ? (
                  <div
                    className={cm.cn('mt-3 h-2 overflow-hidden rounded-full bg-surface-container')}
                  >
                    <div
                      className={cm.cn('h-full rounded-full bg-primary')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                ) : (
                  <p className={cm.cn('mt-3 text-xs font-semibold text-success')}>
                    ∞ {t('billing.unlimited', {}, { defaultValue: 'Unlimited' })}
                  </p>
                )}
                <p className={cm.cn('mt-2 text-xs text-on-surface-variant')}>{u.hint}</p>
              </div>
            )
          })
        )}
      </div>

      {/* Payment method + invoices */}
      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <section
          className={cm.cn(
            'lg:col-span-4',
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
        >
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('nav.paymentMethod', {}, { defaultValue: 'Payment method' })}
          </p>
          <div className={cm.cn('mt-3 flex items-center gap-3')}>
            <span
              aria-hidden="true"
              className={cm.cn(
                'grid h-10 w-14 place-items-center rounded-lg bg-primary/10 text-primary material-symbols-outlined text-[24px]',
              )}
            >
              credit_card
            </span>
            <div className={cm.cn('min-w-0')}>
              <p className={cm.cn('text-sm font-semibold text-on-surface')}>
                {plan?.card_brand && plan.card_last4
                  ? `${plan.card_brand} **** ${plan.card_last4}`
                  : t('billing.cardMissing', {}, { defaultValue: 'No card on file' })}
              </p>
              {plan?.card_exp ? (
                <p className={cm.cn('text-xs text-on-surface-variant')}>
                  {t(
                    'billing.cardExp',
                    { exp: plan.card_exp },
                    { defaultValue: 'Expires {{exp}}' },
                  )}
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            data-mol-id="billing-update-card"
            className={cm.cn(
              cm.sp('mt', 4),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'rounded-xl border border-outline-variant/30 text-on-surface hover:bg-surface-container-low transition-colors',
            )}
            onClick={updateCard}
          >
            {t('billing.editCard', {}, { defaultValue: 'Update card' })}
          </button>
        </section>

        <KpiTile
          icon="receipt_long"
          label={t('billing.spentLabel', {}, { defaultValue: 'Spent year-to-date' })}
          value={invoices ? fmtCurrency(invoices.reduce((acc, i) => acc + i.amount_cents, 0)) : '—'}
        />
        <KpiTile
          icon="event_available"
          label={t('billing.nextChargeLabel', {}, { defaultValue: 'Next charge' })}
          value={plan ? fmtCurrency(plan.next_charge_cents) : '—'}
          hint={
            plan?.next_charge_date
              ? t(
                  'billing.nextChargeHint',
                  { date: fmtDate(plan.next_charge_date) },
                  { defaultValue: 'On {{date}}' },
                )
              : undefined
          }
        />
        <KpiTile
          icon="diversity_3"
          label={t('billing.seatsLabel', {}, { defaultValue: 'Active seats' })}
          value={plan?.seats ?? '—'}
          hint={
            plan?.seats_max
              ? t(
                  'billing.seatsHint',
                  { used: plan.seats, max: plan.seats_max },
                  { defaultValue: '{{used}} of {{max}} included' },
                )
              : undefined
          }
        />
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <header className={cm.flex({ align: 'center', justify: 'between' })}>
          <div>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('nav.invoices', {}, { defaultValue: 'Invoices' })}
            </p>
            <h2 className={cm.cn('mt-1 text-lg font-extrabold tracking-tight text-on-surface')}>
              {t('billing.invoiceHeading', {}, { defaultValue: 'Recent invoices' })}
            </h2>
          </div>
        </header>
        {invoices === null ? (
          <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('billing.invoicesLoading', {}, { defaultValue: 'Loading invoices…' })}
          </p>
        ) : invoices.length === 0 ? (
          <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('billing.invoicesEmpty', {}, { defaultValue: 'No invoices yet.' })}
          </p>
        ) : (
          <table className={cm.cn('mt-4 w-full text-sm')}>
            <thead>
              <tr
                className={cm.cn(
                  'text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                <th className={cm.cn(cm.sp('py', 2))}>
                  {t('form.date', {}, { defaultValue: 'Date' })}
                </th>
                <th className={cm.cn(cm.sp('py', 2))}>
                  {t('billing.col.invoice', {}, { defaultValue: 'Invoice' })}
                </th>
                <th className={cm.cn(cm.sp('py', 2))}>
                  {t('form.amount', {}, { defaultValue: 'Amount' })}
                </th>
                <th className={cm.cn(cm.sp('py', 2))}>
                  {t('nav.status', {}, { defaultValue: 'Status' })}
                </th>
                <th className={cm.cn(cm.sp('py', 2))}>
                  <span className="sr-only">
                    {t('nav.actions', {}, { defaultValue: 'Actions' })}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant/20')}>
              {invoices.map((inv) => (
                <tr key={inv.id} className={cm.cn('text-on-surface')}>
                  <td className={cm.cn(cm.sp('py', 3), 'tabular-nums')}>{fmtDate(inv.date)}</td>
                  <td className={cm.cn(cm.sp('py', 3), 'font-mono text-xs')}>{inv.id}</td>
                  <td className={cm.cn(cm.sp('py', 3), 'font-bold tabular-nums')}>
                    {fmtCurrency(inv.amount_cents)}
                  </td>
                  <td className={cm.cn(cm.sp('py', 3))}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        'rounded-full text-[10px] font-black uppercase tracking-widest',
                        inv.status === 'paid'
                          ? 'bg-success/15 text-success'
                          : inv.status === 'failed'
                            ? 'bg-error/15 text-error'
                            : 'bg-warning/15 text-warning',
                      )}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className={cm.cn(cm.sp('py', 3), 'text-right')}>
                    {inv.url ? (
                      <a
                        href={inv.url}
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'text-primary hover:text-primary-container transition-colors',
                        )}
                      >
                        {t('common.download', {}, { defaultValue: 'Download' })}
                      </a>
                    ) : (
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t('billing.downloadUnavailable', {}, { defaultValue: '—' })}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

export default Billing
