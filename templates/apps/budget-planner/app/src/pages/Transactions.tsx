import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatDate, formatMoney, getCurrency, getDateFormat } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface Transaction {
  id: string
  posted_at: string
  payee: string
  category: string
  account_name: string
  amount_cents: number
  memo?: string
  cleared: boolean
}

function fmt(cents: number): string {
  return formatMoney(cents, getCurrency(), { grouping: false })
}

function fmtDate(iso: string): string {
  return formatDate(iso, getDateFormat())
}

export function Transactions() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [txs, setTxs] = useState<Transaction[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
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
  }, [http, t])

  const filtered = useMemo(() => {
    if (!query.trim()) return txs
    const q = query.trim().toLowerCase()
    return txs.filter(
      (tx) =>
        tx.payee.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        tx.account_name.toLowerCase().includes(q),
    )
  }, [txs, query])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }), 'flex-wrap')}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'min-w-0')}>
          {t('nav.transactions', {}, { defaultValue: 'Transactions' })}
        </h1>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <Link
            to="/import"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('medium'),
              'border border-outline rounded-md hover:bg-surface-container',
            )}
          >
            {t('transactions.importCta', {}, { defaultValue: 'Import' })}
          </Link>
          <Link
            to="/transactions/new"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md',
            )}
          >
            {t('transactions.addCta', {}, { defaultValue: 'Add transaction' })}
          </Link>
        </div>
      </header>

      <div className={cm.cn(cm.card(), cm.sp('p', 4))}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            'transactions.searchPlaceholder',
            {},
            { defaultValue: 'Search payee, category, account…' },
          )}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'w-full border border-outline-variant rounded-md',
          )}
        />
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : filtered.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter, 'space-y-3')}>
          <p className="text-on-surface-variant">
            {query.trim()
              ? t('transactions.empty', {}, { defaultValue: 'No transactions match.' })
              : t(
                  'transactions.emptyYet',
                  {},
                  { defaultValue: 'No transactions yet — log your first one.' },
                )}
          </p>
          {!query.trim() ? (
            <Link
              to="/transactions/new"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'bg-primary text-on-primary rounded-md inline-block',
              )}
            >
              {t('transactions.emptyCta', {}, { defaultValue: 'Log your first transaction' })}
            </Link>
          ) : null}
        </div>
      ) : (
        <section className={cm.cn(cm.card(), 'overflow-hidden')}>
          {/* Five money columns don't fit 390px — scroll the table, keep the card. */}
          <div className="overflow-x-auto">
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
                    {t('transactions.col.payee', {}, { defaultValue: 'Payee' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                    {t('form.category', {}, { defaultValue: 'Category' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                    {t('settings.account', {}, { defaultValue: 'Account' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                    {t('form.amount', {}, { defaultValue: 'Amount' })}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filtered.map((tx) => (
                  <tr key={tx.id} className={cm.cn('hover:bg-surface-container')}>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                        'tabular-nums whitespace-nowrap',
                      )}
                    >
                      {fmtDate(tx.posted_at)}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                      )}
                    >
                      <Link
                        to={`/transactions/${tx.id}`}
                        className={cm.cn('hover:underline hover:text-primary transition-colors')}
                      >
                        {tx.payee}
                      </Link>
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                      )}
                    >
                      {tx.category}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                      )}
                    >
                      {tx.account_name}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-right tabular-nums',
                        tx.amount_cents >= 0 ? 'text-success' : '',
                      )}
                    >
                      {fmt(tx.amount_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
