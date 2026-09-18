import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { OrderTicket } from '../components/OrderTicketCard.js'
import { type ApiOrder, mapApiOrderToTicket } from '../lib/api-orders.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const HISTORY_STATUSES = ['all', 'served', 'cancelled', 'paid'] as const

function fmtCents(cents: number) {
  return `$${(Math.abs(cents) / 100).toFixed(2)}`
}

export function OrderHistory() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [filter, setFilter] = useState<(typeof HISTORY_STATUSES)[number]>('all')
  const [search, setSearch] = useState('')
  const [orders, setOrders] = useState<ReadonlyArray<OrderTicket & { rawStatus: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/orders?limit=100')
      .then(async (res) => {
        const list = unwrapList<ApiOrder>(res)
        const detailed = await Promise.all(
          list.map(async (o) => {
            try {
              const detail = unwrapSingle<ApiOrder>(await http.get(`/api/orders/${o.id}`))
              return { ...mapApiOrderToTicket(detail?.id ? detail : o), rawStatus: o.status }
            } catch (_error) {
              // detail fetch failed — fall back to the summary row from the list
              return { ...mapApiOrderToTicket(o), rawStatus: o.status }
            }
          }),
        )
        if (!cancelled) setOrders(detailed)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('orderHistory.loadError', {}, { defaultValue: 'Could not load orders.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = orders
    .filter((o) => (filter === 'all' ? true : o.rawStatus === filter))
    .filter(
      (o) =>
        !search ||
        o.number.includes(search) ||
        o.table.toLowerCase().includes(search.toLowerCase()),
    )

  const totalCents = filtered.reduce((s, o) => s + (o.totalCents ?? 0), 0)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('orderHistory.eyebrow', {}, { defaultValue: 'Accounting' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight font-display')}>
            {t('orderHistory.heading', {}, { defaultValue: 'Order history' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'orderHistory.subheading',
              {},
              { defaultValue: 'Searchable archive of completed and cancelled tickets.' },
            )}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-2xl bg-primary-container/40 text-on-primary-container',
          )}
        >
          <p className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest font-bold')}>
            {t('orderHistory.totalLabel', {}, { defaultValue: 'Total in view' })}
          </p>
          <p
            data-testid="orderhistory-total"
            className={cm.cn(cm.textSize('2xl'), 'font-extrabold tabular-nums font-display')}
          >
            {fmtCents(totalCents)}
          </p>
        </div>
      </header>

      {error ? (
        <p
          data-testid="orderhistory-error"
          className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-error')}
        >
          {error}
        </p>
      ) : null}

      <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          {HISTORY_STATUSES.map((s) => {
            const active = filter === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  cm.roundedFull,
                  'transition-colors',
                  active
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                )}
              >
                {t(
                  `orderHistory.filter.${s}`,
                  {},
                  { defaultValue: s.replace(/^./, (c) => c.toUpperCase()) },
                )}
              </button>
            )
          })}
        </div>
        <label
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            'rounded-full bg-surface-container-low',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-base text-on-surface-variant')}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              'orderHistory.searchPlaceholder',
              {},
              { defaultValue: 'Search by ticket # or table' },
            )}
            className={cm.cn(
              cm.textSize('sm'),
              'bg-transparent border-none focus:ring-0 placeholder:text-on-surface-variant w-56',
            )}
          />
        </label>
      </div>

      <div className={cm.cn('overflow-x-auto rounded-2xl bg-surface-container-lowest shadow-sm')}>
        <table className={cm.cn('w-full text-left', cm.textSize('sm'))}>
          <thead>
            <tr
              className={cm.cn(
                'border-b border-outline-variant text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              <th className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), 'font-bold')}>
                {t('orderHistory.col.ticket', {}, { defaultValue: 'Ticket' })}
              </th>
              <th className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), 'font-bold')}>
                {t('orderHistory.col.table', {}, { defaultValue: 'Table' })}
              </th>
              <th className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), 'font-bold')}>
                {t('orderHistory.col.items', {}, { defaultValue: 'Items' })}
              </th>
              <th className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), 'font-bold')}>
                {t('nav.status', {}, { defaultValue: 'Status' })}
              </th>
              <th className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), 'font-bold text-right')}>
                {t('nav.total', {}, { defaultValue: 'Total' })}
              </th>
            </tr>
          </thead>
          <tbody className={cm.cn('divide-y divide-surface-container')}>
            {loading && filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}
                >
                  {t('orderHistory.loading', {}, { defaultValue: 'Loading orders…' })}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  data-testid="orderhistory-empty"
                  className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}
                >
                  {t(
                    'orderHistory.empty',
                    {},
                    { defaultValue: 'No orders match your filters yet.' },
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((o) => (
                <tr
                  key={o.id}
                  className={cm.cn('hover:bg-surface-container-low transition-colors')}
                >
                  <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4))}>
                    <Link
                      to={`/orders/${o.id}`}
                      className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}
                    >
                      #{o.number}
                    </Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4), 'text-on-surface-variant')}>
                    {o.table}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 4),
                      'text-on-surface-variant truncate max-w-xs',
                    )}
                  >
                    {o.items.map((it) => `${it.qty}× ${it.name}`).join(', ')}
                  </td>
                  <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4))}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.roundedFull,
                        'uppercase tracking-widest',
                        o.rawStatus === 'served' || o.rawStatus === 'paid'
                          ? 'bg-on-surface-variant/20 text-on-surface-variant'
                          : o.rawStatus === 'cancelled'
                            ? 'bg-error/15 text-error'
                            : 'bg-success/15 text-success',
                      )}
                    >
                      {o.rawStatus}
                    </span>
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 4),
                      'text-right font-bold tabular-nums',
                    )}
                  >
                    {fmtCents(o.totalCents ?? 0)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
