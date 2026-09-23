import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Transaction {
  id: string
  posted_at: string
  merchant?: string
  category?: string
  method?: string
  status?: string
  amount_cents: number
}

function fmtCents(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(
    cents / 100,
  )
}

export function TransactionsPage() {
  const { t } = useTranslation()
  const http = useHttpClient()
  const cm = getClassMap()

  const [rows, setRows] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (filterStart) params.set('start', filterStart)
    if (filterEnd) params.set('end', filterEnd)
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/transactions?${params.toString()}`)
      .then((res) => {
        if (cancelled) return
        setRows(unwrapList<Transaction>(res))
      })
      .catch(() => {
        // Local state (NOT the top-level error boundary — a rejected page
        // fetch here would otherwise render as a silent, empty table).
        if (!cancelled)
          setError(
            t('transactions.loadError', {}, { defaultValue: 'Failed to load transactions.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t, filterStart, filterEnd])

  return (
    <div data-mol-id="page-transactions" className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('transactions.eyebrow', {}, { defaultValue: 'Activity' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.transactions', {}, { defaultValue: 'Transactions' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mt', 1))}>
          {t(
            'transactions.subheading',
            {},
            { defaultValue: 'Every posted and pending transaction across your accounts.' },
          )}
        </p>
      </header>

      <div
        className={cm.cn(
          cm.flex({ direction: 'row', gap: 4, align: 'center', wrap: 'wrap' }),
          cm.sp('mb', 4),
        )}
      >
        <input
          type="date"
          className={cm.input()}
          value={filterStart}
          onChange={(e) => setFilterStart(e.target.value)}
          aria-label={t('form.startDate', {}, { defaultValue: 'Start date' })}
        />
        <input
          type="date"
          className={cm.input()}
          value={filterEnd}
          onChange={(e) => setFilterEnd(e.target.value)}
          aria-label={t('transactions.endDate', {}, { defaultValue: 'End date' })}
        />
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : rows.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('transactions.empty', {}, { defaultValue: 'No transactions yet.' })}
        </p>
      ) : (
        <div className={cm.cn('overflow-x-auto -mx-2 px-2')}>
          <table className={cm.table}>
            <thead className={cm.tableHeader}>
              <tr className={cm.tableRow}>
                <th className={cm.tableHead}>{t('form.date', {}, { defaultValue: 'Date' })}</th>
                <th className={cm.tableHead}>
                  {t('transactions.merchant', {}, { defaultValue: 'Merchant' })}
                </th>
                <th className={cm.tableHead}>
                  {t('form.category', {}, { defaultValue: 'Category' })}
                </th>
                <th className={cm.tableHead}>{t('form.amount', {}, { defaultValue: 'Amount' })}</th>
                <th className={cm.tableHead}>{t('nav.status', {}, { defaultValue: 'Status' })}</th>
              </tr>
            </thead>
            <tbody className={cm.tableBody}>
              {rows.map((r) => (
                <tr key={r.id} className={cm.tableRow}>
                  <td className={cm.tableCell}>{new Date(r.posted_at).toLocaleDateString()}</td>
                  <td className={cm.tableCell}>{r.merchant ?? '—'}</td>
                  <td className={cm.tableCell}>{r.category ?? '—'}</td>
                  <td className={cm.tableCell}>{fmtCents(r.amount_cents)}</td>
                  <td className={cm.tableCell}>{r.status ?? 'posted'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
