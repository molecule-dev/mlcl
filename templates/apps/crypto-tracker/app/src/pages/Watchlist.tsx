import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { deltaClass, fmtPct, fmtUsd, priceFractionDigits } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface WatchlistRow {
  id: string
  symbol: string
  name: string
  price_usd: number
  change_24h_pct: number
  market_cap_usd: number
  added_at: string
}

export function Watchlist() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rows, setRows] = useState<WatchlistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/watchlist')
      .then((res) => {
        if (!cancelled) setRows(unwrapList<WatchlistRow>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('watchlist.loadError', {}, { defaultValue: 'Failed to load watchlist.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const handleRemove = async (row: WatchlistRow) => {
    const previous = rows
    setRows((cur) => cur.filter((r) => r.symbol !== row.symbol))
    try {
      await http.delete(`/api/watchlist/by-symbol/${encodeURIComponent(row.symbol.toLowerCase())}`)
    } catch (_error) {
      // optimistic update: restore previous list on failure
      setRows(previous)
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
          {t('watchlist.heading', {}, { defaultValue: 'Watchlist' })}
        </h1>
        <Link
          to="/markets"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          {t('watchlist.addCta', {}, { defaultValue: 'Browse markets' })}
        </Link>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : rows.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'watchlist.empty',
            {},
            { defaultValue: 'No coins on your watchlist — star coins from /markets to add them.' },
          )}
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
                  {t('watchlist.col.coin', {}, { defaultValue: 'Coin' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('form.price', {}, { defaultValue: 'Price' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('watchlist.col.change24h', {}, { defaultValue: '24h' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('watchlist.col.marketCap', {}, { defaultValue: 'Mkt cap' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {rows.map((r) => (
                <tr key={r.symbol} className={cm.cn('hover:bg-surface-container')}>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <Link
                      to={`/coin/${r.symbol}`}
                      className={cm.cn(cm.fontWeight('semibold'), 'hover:underline')}
                    >
                      {r.name}{' '}
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                          'uppercase ml-1',
                        )}
                      >
                        {r.symbol}
                      </span>
                    </Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right tabular-nums')}>
                    {fmtUsd(r.price_usd, priceFractionDigits(r.price_usd))}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      cm.fontWeight('semibold'),
                      deltaClass(r.change_24h_pct),
                    )}
                  >
                    {fmtPct(r.change_24h_pct)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      'text-on-surface-variant',
                    )}
                  >
                    {fmtUsd(r.market_cap_usd)}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                    <button
                      type="button"
                      data-testid={`watchlist-remove-${r.symbol.toLowerCase()}`}
                      onClick={() => handleRemove(r)}
                      className={cm.cn(cm.textSize('sm'), 'text-error hover:underline')}
                    >
                      {t('common.remove', {}, { defaultValue: 'Remove' })}
                    </button>
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
