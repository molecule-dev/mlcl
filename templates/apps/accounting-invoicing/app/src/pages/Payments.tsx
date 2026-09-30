import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Payment {
  id: string
  received_at: string | null
  customer_name: string
  invoice_number: string
  amount_cents: number
  /** Known methods get a colored badge; anything else (e.g. 'manual') gets the neutral fallback. */
  method: string
  status: 'received' | 'pending' | 'refunded'
  reconciled: boolean
}

const METHOD_COLOR: Record<string, string> = {
  card: 'bg-primary/15 text-primary',
  ach: 'bg-info/15 text-info',
  check: 'bg-warning/15 text-warning',
  cash: 'bg-success/15 text-success',
  wire: 'bg-secondary/15 text-secondary',
}
const METHOD_COLOR_FALLBACK = 'bg-surface-container text-on-surface-variant'

const STATUS_COLOR: Record<Payment['status'], string> = {
  received: 'bg-success/15 text-success',
  pending: 'bg-warning/15 text-warning',
  refunded: 'bg-error/15 text-error',
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function Payments() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/payments')
      .then((res) => {
        if (!cancelled) setPayments(unwrapList<Payment>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('payments.loadError', {}, { defaultValue: 'Failed to load payments.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  // The "Received MTD" KPI counts only payments received in the current month.
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const received = payments
    .filter(
      (p) =>
        p.status === 'received' &&
        p.received_at !== null &&
        new Date(p.received_at) >= startOfMonth,
    )
    .reduce((acc, p) => acc + p.amount_cents, 0)
  const pending = payments
    .filter((p) => p.status === 'pending')
    .reduce((acc, p) => acc + p.amount_cents, 0)
  const refunded = payments
    .filter((p) => p.status === 'refunded')
    .reduce((acc, p) => acc + p.amount_cents, 0)
  const unmatched = payments.filter((p) => !p.reconciled).length

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
        {t('payments.heading', {}, { defaultValue: 'Payments' })}
      </h1>

      <div className={cm.grid({ cols: 4, gap: 'md' })}>
        <Stat
          label={t('payments.kpi.received', {}, { defaultValue: 'Total received MTD' })}
          value={fmtUsd(received)}
        />
        <Stat
          label={t('payments.kpi.pendingDeposits', {}, { defaultValue: 'Pending deposits' })}
          value={fmtUsd(pending)}
        />
        <Stat
          label={t('payments.kpi.refundedThisMonth', {}, { defaultValue: 'Refunded this month' })}
          value={fmtUsd(refunded)}
        />
        <Stat
          label={t('payments.kpi.unmatched', {}, { defaultValue: 'Unmatched' })}
          value={String(unmatched)}
        />
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : payments.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('payments.empty', {}, { defaultValue: 'No payments yet.' })}
        </p>
      ) : (
        <section className={cm.cn(cm.card(), 'overflow-hidden')}>
          <table className={cm.cn('w-full')}>
            <thead
              className={cm.cn(
                'bg-surface-container',
                cm.textSize('xs'),
                'uppercase tracking-wide',
                'text-on-surface-variant',
              )}
            >
              <tr>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('form.date', {}, { defaultValue: 'Date' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('nav.customer', {}, { defaultValue: 'Customer' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('payments.col.invoice', {}, { defaultValue: 'Invoice' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('payments.col.method', {}, { defaultValue: 'Method' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('nav.status', {}, { defaultValue: 'Status' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('form.amount', {}, { defaultValue: 'Amount' })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {payments.map((p) => (
                <tr key={p.id} className={cm.cn('hover:bg-surface-container')}>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'text-on-surface-variant',
                      'whitespace-nowrap',
                    )}
                  >
                    {fmtDate(p.received_at)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                    )}
                  >
                    {p.customer_name}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'font-mono',
                      'text-on-surface-variant',
                    )}
                  >
                    {p.invoice_number}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        cm.roundedFull,
                        METHOD_COLOR[p.method] ?? METHOD_COLOR_FALLBACK,
                      )}
                    >
                      {p.method.toUpperCase()}
                    </span>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        cm.roundedFull,
                        STATUS_COLOR[p.status],
                      )}
                    >
                      {p.status}
                    </span>
                    {!p.reconciled ? (
                      <span
                        className={cm.cn(
                          cm.sp('ml', 2),
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                        )}
                      >
                        · {t('payments.unmatchedTag', {}, { defaultValue: 'unmatched' })}
                      </span>
                    ) : null}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      cm.fontWeight('semibold'),
                      p.status === 'refunded' ? 'text-error' : '',
                    )}
                  >
                    {p.status === 'refunded' ? '-' : ''}
                    {fmtUsd(p.amount_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'uppercase tracking-wide',
          'text-on-surface-variant',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mt', 1), 'tabular-nums')}
      >
        {value}
      </p>
    </div>
  )
}
