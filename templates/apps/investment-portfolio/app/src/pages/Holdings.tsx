import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { TransactionFormModal } from '../components/TransactionFormModal.js'
import { unwrapList } from '../lib/unwrap.js'

interface Holding {
  symbol: string
  name: string
  asset_class: string
  shares: number
  cost_basis_cents: number
  market_price_cents: number
  market_value_cents: number
  day_change_pct: number
  pnl_cents: number
  pnl_pct: number
  allocation_pct: number
  dividend_yield_pct?: number
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
  const c = num(cents)
  const sign = c < 0 ? '-' : ''
  const abs = Math.abs(c)
  const dollars = abs / 100
  return `${sign}$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtPct(v: unknown): string {
  const n = num(v)
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

function deltaClass(v: unknown): string {
  const n = num(v)
  if (n > 0) return 'text-success'
  if (n < 0) return 'text-error'
  return ''
}

export function Holdings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rows, setRows] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [buyOpen, setBuyOpen] = useState(false)
  const [reloadCounter, setReloadCounter] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/holdings')
      .then((res) => {
        if (!cancelled) setRows(unwrapList<Holding>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('holdings.loadError', {}, { defaultValue: 'Failed to load holdings.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t, reloadCounter])

  const handleSuccess = useCallback(() => setReloadCounter((c) => c + 1), [])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'gap-3', 'flex-wrap')}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'min-w-0')}>
          {t('holdings.heading', {}, { defaultValue: 'Holdings' })}
        </h1>
        <button
          type="button"
          onClick={() => setBuyOpen(true)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          {t('holdings.addCta', {}, { defaultValue: 'Buy' })}
        </button>
      </header>

      <TransactionFormModal
        open={buyOpen}
        onClose={() => setBuyOpen(false)}
        onSuccess={handleSuccess}
        defaultKind="buy"
      />

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : rows.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 16),
            cm.textCenter,
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-4xl text-on-surface-variant')}
            aria-hidden="true"
          >
            pie_chart
          </span>
          <p className="text-on-surface-variant">
            {t('holdings.empty', {}, { defaultValue: 'No holdings yet.' })}
          </p>
          <button
            type="button"
            onClick={() => setBuyOpen(true)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md',
            )}
          >
            {t('holdings.addCta', {}, { defaultValue: 'Buy' })}
          </button>
        </div>
      ) : (
        <section className={cm.cn(cm.card(), 'overflow-x-auto')}>
          <table className={cm.cn('w-full', 'min-w-[840px]')}>
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
                  {t('holdings.col.symbol', {}, { defaultValue: 'Symbol' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('holdings.col.shares', {}, { defaultValue: 'Shares' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('holdings.col.price', {}, { defaultValue: 'Last' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('holdings.col.day', {}, { defaultValue: 'Day' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('holdings.col.cost', {}, { defaultValue: 'Cost basis' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('holdings.col.value', {}, { defaultValue: 'Mkt value' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('holdings.col.pnl', {}, { defaultValue: 'P/L' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('holdings.col.allocation', {}, { defaultValue: 'Alloc' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant')}>
              {rows.map((h) => (
                <tr key={h.symbol} className={cm.cn('hover:bg-surface-container')}>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <Link to={`/assets/${h.symbol}`} className={cm.cn('hover:underline')}>
                      <span className={cm.cn(cm.fontWeight('semibold'), 'font-mono')}>
                        {h.symbol}
                      </span>
                      <span
                        className={cm.cn(cm.textSize('xs'), 'block', 'text-on-surface-variant')}
                      >
                        {h.name} · {h.asset_class}
                      </span>
                    </Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right tabular-nums')}>
                    {num(h.shares).toFixed(4)}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right tabular-nums')}>
                    {fmtUsd(h.market_price_cents)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      deltaClass(h.day_change_pct),
                    )}
                  >
                    {fmtPct(h.day_change_pct)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      'text-on-surface-variant',
                    )}
                  >
                    {fmtUsd(h.cost_basis_cents)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      cm.fontWeight('semibold'),
                    )}
                  >
                    {fmtUsd(h.market_value_cents)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      cm.fontWeight('semibold'),
                      deltaClass(h.pnl_pct),
                    )}
                  >
                    {fmtUsd(h.pnl_cents)}{' '}
                    <span className={cm.cn(cm.textSize('xs'), 'block')}>{fmtPct(h.pnl_pct)}</span>
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      'text-on-surface-variant',
                    )}
                  >
                    {num(h.allocation_pct).toFixed(1)}%
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
