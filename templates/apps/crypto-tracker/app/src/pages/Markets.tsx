import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { CoinSparklineRow, type CoinSparklineRowData } from '../components/CoinSparklineRow.js'
import { MarketKpiQuad } from '../components/MarketKpiQuad.js'
import { unwrapList } from '../lib/unwrap.js'

interface MarketRow extends CoinSparklineRowData {
  change_1h_pct: number
  change_7d_pct: number
}

export function Markets() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rows, setRows] = useState<MarketRow[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/markets')
      .then((res) => {
        if (!cancelled) setRows(unwrapList<MarketRow>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('markets.loadError', {}, { defaultValue: 'Failed to load markets.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.toLowerCase().trim()
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.symbol.toLowerCase().includes(q),
    )
  }, [rows, query])

  const totalMarketCap = rows.reduce((a, r) => a + r.market_cap_usd, 0)
  const totalVolume = rows.reduce((a, r) => a + (r.volume_24h_usd ?? 0), 0)
  const btc = rows.find((r) => r.symbol === 'btc')
  const btcDominance = totalMarketCap > 0 && btc ? (btc.market_cap_usd / totalMarketCap) * 100 : 0

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
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            {t('markets.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}} terminal' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'tracking-tight',
            )}
          >
            {t('markets.heading', {}, { defaultValue: 'Markets' })}
          </h1>
        </div>
        <div className={cm.cn('w-full max-w-md')}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'markets.searchPlaceholder',
              {},
              { defaultValue: 'Search Bitcoin, ETH, …' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'w-full rounded-full border border-outline-variant/60 bg-surface-container-low/60 backdrop-blur',
              'focus:outline-none focus:ring-2 focus:ring-primary/40',
            )}
          />
        </div>
      </header>

      {!loading && rows.length > 0 ? (
        <MarketKpiQuad
          totalMarketCapUsd={totalMarketCap}
          totalVolume24hUsd={totalVolume}
          btcDominancePct={btcDominance}
          activeCoins={rows.length}
          marketCapChangePct={btc?.change_24h_pct}
        />
      ) : null}

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('markets.empty', {}, { defaultValue: 'No coins match.' })}
        </p>
      ) : (
        <section
          className={cm.cn(
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm overflow-hidden',
          )}
        >
          {/* Wide catalog table: scroll horizontally on small screens. */}
          <div className="overflow-x-auto">
            <table className={cm.cn('w-full')}>
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant bg-surface-container/40">
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>#</th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                    {t('markets.col.coin', {}, { defaultValue: 'Coin' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                    {t('form.price', {}, { defaultValue: 'Price' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                    {t('markets.col.change24h', {}, { defaultValue: '24h' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                    {t('markets.col.marketCap', {}, { defaultValue: 'Mkt cap' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                    {t('markets.col.volume24h', {}, { defaultValue: 'Vol 24h' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                    {t('markets.col.sparkline', {}, { defaultValue: 'Last 7d' })}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {filtered.map((r) => (
                  <CoinSparklineRow key={r.symbol} coin={r} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
