import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Transaction {
  id: string
  occurred_at: string
  kind: 'buy' | 'sell' | 'transfer_in' | 'transfer_out' | 'reward' | 'fee'
  symbol: string
  amount: number
  price_usd: number
  total_usd: number
  fee_usd?: number
  exchange: string
  notes?: string
}

const KIND_LABEL: Record<Transaction['kind'], string> = {
  buy: 'Buy',
  sell: 'Sell',
  transfer_in: 'Transfer in',
  transfer_out: 'Transfer out',
  reward: 'Reward',
  fee: 'Fee',
}

const KIND_COLOR: Record<Transaction['kind'], string> = {
  buy: 'bg-success/15 text-success',
  sell: 'bg-error/15 text-error',
  transfer_in: 'bg-info/15 text-info',
  transfer_out: 'bg-surface-container',
  reward: 'bg-primary/15 text-primary',
  fee: 'bg-warning/15 text-warning',
}

function fmtUsd(n: number): string {
  return `$${Math.abs(n).toFixed(2)}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function Transactions() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [txs, setTxs] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [formKind, setFormKind] = useState<Transaction['kind']>('buy')
  const [formSymbol, setFormSymbol] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formExchange, setFormExchange] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

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
  }, [http, t, refreshTick])

  useEffect(() => {
    if (!showAdd) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAdd(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showAdd])

  const submitTx = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const amount = Number(formAmount)
    const price = Number(formPrice)
    if (
      !formSymbol.trim() ||
      Number.isNaN(amount) ||
      amount <= 0 ||
      Number.isNaN(price) ||
      price < 0
    ) {
      setFormError(
        t(
          'transactions.addError',
          {},
          { defaultValue: 'Enter symbol, positive amount, and price.' },
        ),
      )
      return
    }
    setSubmitting(true)
    try {
      await http.post('/api/transactions', {
        kind: formKind,
        symbol: formSymbol.trim().toLowerCase(),
        amount,
        price_usd: price,
        total_usd: amount * price,
        exchange: formExchange.trim() || 'manual',
        occurred_at: new Date().toISOString(),
      })
      setShowAdd(false)
      setFormSymbol('')
      setFormAmount('')
      setFormPrice('')
      setFormExchange('')
      setRefreshTick((n) => n + 1)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.maxW('7xl'),
        cm.mxAuto,
        'lg:px-10 space-y-6',
      )}
    >
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('nav.transactions', {}, { defaultValue: 'Transactions' })}
        </h1>
        <button
          type="button"
          data-testid="transactions-log"
          onClick={() => setShowAdd(true)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          {t('transactions.addCta', {}, { defaultValue: 'Log transaction' })}
        </button>
      </header>

      {showAdd ? (
        <div
          role="presentation"
          className={cm.cn(
            'fixed inset-0 z-40 bg-foreground/50 flex items-center justify-center',
            cm.sp('p', 4),
          )}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAdd(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="transactions-add-title"
            className={cm.cn('w-full max-w-md')}
          >
            <form
              onSubmit={submitTx}
              data-testid="transactions-form"
              className={cm.cn(
                'w-full rounded-2xl bg-surface border border-outline-variant shadow-xl',
                cm.sp('p', 6),
                'space-y-4',
              )}
            >
              <h2
                id="transactions-add-title"
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
              >
                {t('transactions.addModal.heading', {}, { defaultValue: 'Log transaction' })}
              </h2>
              <label className="block">
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('form.kind', {}, { defaultValue: 'Kind' })}
                </span>
                <select
                  value={formKind}
                  onChange={(e) => setFormKind(e.target.value as Transaction['kind'])}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'w-full border border-outline-variant rounded-md',
                  )}
                >
                  {Object.entries(KIND_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {t(`transactions.kind.${value}`, {}, { defaultValue: label })}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('transactions.addModal.symbol', {}, { defaultValue: 'Symbol' })}
                </span>
                <input
                  type="text"
                  value={formSymbol}
                  onChange={(e) => setFormSymbol(e.target.value.toUpperCase())}
                  required
                  placeholder="BTC"
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'w-full border border-outline-variant rounded-md uppercase',
                  )}
                />
              </label>
              <label className="block">
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('form.amount', {}, { defaultValue: 'Amount' })}
                </span>
                <input
                  type="number"
                  step="any"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  required
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'w-full border border-outline-variant rounded-md tabular-nums',
                  )}
                />
              </label>
              <label className="block">
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('transactions.addModal.price', {}, { defaultValue: 'Price (USD)' })}
                </span>
                <input
                  type="number"
                  step="any"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  required
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'w-full border border-outline-variant rounded-md tabular-nums',
                  )}
                />
              </label>
              <label className="block">
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('transactions.addModal.exchange', {}, { defaultValue: 'Exchange' })}
                </span>
                <input
                  type="text"
                  value={formExchange}
                  onChange={(e) => setFormExchange(e.target.value)}
                  placeholder="manual"
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'w-full border border-outline-variant rounded-md',
                  )}
                />
              </label>
              {formError ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}>{formError}</p>
              ) : null}
              <div className={cm.cn(cm.flex({ gap: 'sm', justify: 'end' }))}>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('medium'),
                    'border border-outline rounded-md hover:bg-surface-container',
                  )}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    'bg-primary text-on-primary rounded-md disabled:opacity-50',
                  )}
                >
                  {submitting
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('transactions.addModal.save', {}, { defaultValue: 'Save transaction' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

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
                  {t('transactions.col.coin', {}, { defaultValue: 'Coin' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('form.amount', {}, { defaultValue: 'Amount' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('form.price', {}, { defaultValue: 'Price' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('nav.total', {}, { defaultValue: 'Total' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('transactions.col.exchange', {}, { defaultValue: 'Exchange' })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
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
                        KIND_COLOR[tx.kind],
                      )}
                    >
                      {t(`transactions.kind.${tx.kind}`, {}, { defaultValue: KIND_LABEL[tx.kind] })}
                    </span>
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.fontWeight('semibold'),
                      'uppercase',
                    )}
                  >
                    {tx.symbol}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right tabular-nums')}>
                    {tx.amount.toFixed(6)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      'text-on-surface-variant',
                    )}
                  >
                    {fmtUsd(tx.price_usd)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      cm.fontWeight('semibold'),
                    )}
                  >
                    {fmtUsd(tx.total_usd)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'text-on-surface-variant',
                    )}
                  >
                    {tx.exchange}
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
