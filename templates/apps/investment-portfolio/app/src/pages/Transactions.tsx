import { useCallback, useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { TransactionFormModal } from '../components/TransactionFormModal.js'
import { unwrapList } from '../lib/unwrap.js'

interface Transaction {
  id: string
  occurred_at: string
  kind: 'buy' | 'sell' | 'dividend' | 'split' | 'transfer_in' | 'transfer_out'
  symbol: string
  asset_name?: string | null
  shares: number | string
  price_cents?: number | string | null
  price_per_share?: number | string | null
  total_cents?: number | string | null
  fee_cents?: number | string | null
  account?: string | null
}

const KIND_LABEL: Record<string, string> = {
  buy: 'Buy',
  sell: 'Sell',
  dividend: 'Dividend',
  split: 'Split',
  transfer_in: 'Transfer in',
  transfer_out: 'Transfer out',
}

const KIND_COLOR: Record<string, string> = {
  buy: 'bg-success/15 text-success',
  sell: 'bg-error/15 text-error',
  dividend: 'bg-primary/15 text-primary-dark',
  split: 'bg-info/15 text-info',
  transfer_in: 'bg-surface-container',
  transfer_out: 'bg-surface-container',
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function fmtUsd(cents: unknown): string {
  return `$${(num(cents) / 100).toFixed(2)}`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function Transactions() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [txs, setTxs] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [reloadCounter, setReloadCounter] = useState(0)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/transactions')
      .then((res) => {
        if (!cancelled) setTxs(unwrapList<Transaction>(res))
      })
      .catch(() => {
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
  }, [http, t, reloadCounter])

  const handleSuccess = useCallback(() => setReloadCounter((c) => c + 1), [])

  const handleExport = useCallback(async () => {
    if (exporting) return
    setExporting(true)
    try {
      const response = await fetch('/api/transactions/export', { credentials: 'include' })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const csv = await response.text()
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(
        msg ||
          t('transactions.exportError', {}, { defaultValue: 'Failed to export transactions.' }),
      )
    } finally {
      setExporting(false)
    }
  }, [exporting, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('nav.transactions', {}, { defaultValue: 'Transactions' })}
        </h1>
        <div className={cm.flex({ gap: 'sm', align: 'center' })}>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md',
            )}
          >
            {t('transactions.addCta', {}, { defaultValue: 'Record transaction' })}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || txs.length === 0}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('medium'),
              'border border-outline rounded-md hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {exporting
              ? t('common.exportingEllipsis', {}, { defaultValue: 'Exporting…' })
              : t('common.exportCsv', {}, { defaultValue: 'Export CSV' })}
          </button>
        </div>
      </header>

      <TransactionFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={handleSuccess}
      />

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : txs.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('transactions.empty', {}, { defaultValue: 'No transactions yet.' })}
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
                  {t('form.kind', {}, { defaultValue: 'Kind' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('transactions.col.symbol', {}, { defaultValue: 'Symbol' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('transactions.col.shares', {}, { defaultValue: 'Shares' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('form.price', {}, { defaultValue: 'Price' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('nav.total', {}, { defaultValue: 'Total' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('settings.account', {}, { defaultValue: 'Account' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant')}>
              {txs.map((tx) => (
                <tr key={tx.id} className={cm.cn('hover:bg-surface-container')}>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'text-on-surface-variant',
                      'whitespace-nowrap',
                    )}
                  >
                    {fmtDate(tx.occurred_at)}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        cm.roundedFull,
                        KIND_COLOR[tx.kind] ?? 'bg-surface-container',
                      )}
                    >
                      {t(
                        `transactions.kind.${tx.kind}`,
                        {},
                        { defaultValue: KIND_LABEL[tx.kind] ?? tx.kind },
                      )}
                    </span>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <span className={cm.cn(cm.fontWeight('semibold'), 'font-mono')}>
                      {tx.symbol}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'block', 'text-on-surface-variant')}>
                      {tx.asset_name ?? ''}
                    </span>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right tabular-nums')}>
                    {num(tx.shares).toFixed(4)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      'text-on-surface-variant',
                    )}
                  >
                    {fmtUsd(tx.price_cents ?? num(tx.price_per_share) * 100)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      cm.fontWeight('semibold'),
                    )}
                  >
                    {fmtUsd(tx.total_cents)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'text-on-surface-variant',
                    )}
                  >
                    {tx.account ?? ''}
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
