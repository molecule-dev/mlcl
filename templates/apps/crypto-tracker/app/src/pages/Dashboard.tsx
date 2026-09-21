import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { CoinSparklineRow, type CoinSparklineRowData } from '../components/CoinSparklineRow.js'
import { MarketKpiQuad } from '../components/MarketKpiQuad.js'
import { NewsSignalCard, type NewsSignalCardData } from '../components/NewsSignalCard.js'
import { PortfolioHeroCard } from '../components/PortfolioHeroCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface PortfolioStats {
  total_value_usd: number
  change_24h_pct: number
  change_24h_usd: number
  cost_basis_usd: number
  total_pnl_usd: number
  total_pnl_pct: number
  asset_count: number
}

interface PortfolioHolding {
  symbol: string
  name: string
  amount: number
  cost_basis_usd: number
  current_value_usd: number
  pnl_usd: number
  pnl_pct: number
  allocation_pct: number
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [portfolio, setPortfolio] = useState<PortfolioStats | null>(null)
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([])
  const [movers, setMovers] = useState<CoinSparklineRowData[]>([])
  const [news, setNews] = useState<NewsSignalCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/reports/portfolio_stats').catch(() => null),
      http.get('/api/portfolio').catch(() => null),
      http.get('/api/markets').catch(() => null),
      http.get('/api/news').catch(() => null),
    ])
      .then(([stats, holdingsRes, marketsRes, newsRes]) => {
        if (cancelled) return
        setPortfolio(unwrapSingle<PortfolioStats>(stats))
        setHoldings(unwrapList<PortfolioHolding>(holdingsRes))
        setMovers(unwrapList<CoinSparklineRowData>(marketsRes).slice(0, 6))
        setNews(unwrapList<NewsSignalCardData>(newsRes).slice(0, 3))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('nav.failedToLoadDashboard', {}, { defaultValue: 'Failed to load dashboard.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 10), cm.textCenter, cm.textMuted)}>
        {t('dashboard.loading', {}, { defaultValue: 'Loading the latest signals…' })}
      </div>
    )
  }
  if (error) {
    return <div className={cm.cn(cm.sp('p', 10), cm.textCenter, 'text-error')}>{error}</div>
  }

  const totalMarketCap = movers.reduce((a, m) => a + m.market_cap_usd, 0)
  const totalVolume = movers.reduce((a, m) => a + (m.volume_24h_usd ?? 0), 0)
  const btc = movers.find((m) => m.symbol === 'btc')
  const btcDominance = totalMarketCap > 0 && btc ? (btc.market_cap_usd / totalMarketCap) * 100 : 0
  const sparklineHistory = holdings.slice(0, 7).map((h, i) => 1 + i + (h.pnl_pct ?? 0) / 100)

  return (
    <div
      className={cm.cn(
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.maxW('7xl'),
        cm.mxAuto,
        'lg:px-10 space-y-8',
      )}
    >
      <header className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}>
        <div>
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t(
              'dashboard.eyebrow',
              { appName: APP_NAME },
              { defaultValue: '{{appName}} terminal' },
            )}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'tracking-tight',
            )}
          >
            {t('dashboard.heading', {}, { defaultValue: 'Today on the ledger' })}
          </h1>
        </div>
        <Link
          to="/portfolio"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors',
          )}
        >
          {t('dashboard.viewPortfolioCta', {}, { defaultValue: 'Open portfolio →' })}
        </Link>
      </header>

      {portfolio ? (
        <PortfolioHeroCard
          totalValueUsd={portfolio.total_value_usd}
          changePct={portfolio.change_24h_pct}
          changeUsd={portfolio.change_24h_usd}
          costBasisUsd={portfolio.cost_basis_usd}
          totalPnlUsd={portfolio.total_pnl_usd}
          totalPnlPct={portfolio.total_pnl_pct}
          assetCount={portfolio.asset_count}
          history={sparklineHistory}
        />
      ) : null}

      <MarketKpiQuad
        totalMarketCapUsd={totalMarketCap}
        totalVolume24hUsd={totalVolume}
        btcDominancePct={btcDominance}
        activeCoins={movers.length}
        marketCapChangePct={btc?.change_24h_pct}
      />

      <section
        className={cm.cn(
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm overflow-hidden',
        )}
      >
        <header
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            'border-b border-outline-variant/40',
          )}
        >
          <h2
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('dashboard.moversHeading', {}, { defaultValue: 'Top movers · 24h' })}
          </h2>
          <Link
            to="/markets"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.sp('px', 2),
              cm.sp('py', 2),
              'text-primary-dark hover:underline inline-block',
            )}
          >
            {t('dashboard.allMarketsCta', {}, { defaultValue: 'All markets →' })}
          </Link>
        </header>
        {/* Wide 7-column table: scroll horizontally on small screens instead
            of being clipped by the section's overflow-hidden. */}
        <div className="overflow-x-auto">
          <table className={cm.cn('w-full')}>
            <thead>
              <tr
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant bg-surface-container/40',
                )}
              >
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>#</th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('dashboard.col.coin', {}, { defaultValue: 'Coin' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('form.price', {}, { defaultValue: 'Price' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('dashboard.col.change24h', {}, { defaultValue: '24h' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('dashboard.col.marketCap', {}, { defaultValue: 'Mkt cap' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('dashboard.col.volume', {}, { defaultValue: 'Volume' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('dashboard.col.last7d', {}, { defaultValue: 'Last 7d' })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {movers.map((m) => (
                <CoinSparklineRow key={m.symbol} coin={m} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {news.length > 0 ? (
        <section className={cm.cn('space-y-4')}>
          <header className={cm.flex({ align: 'center', justify: 'between' })}>
            <h2
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('dashboard.newsHeading', {}, { defaultValue: 'Latest signals' })}
            </h2>
            <Link
              to="/news"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                cm.sp('px', 2),
                cm.sp('py', 2),
                'text-primary-dark hover:underline inline-block',
              )}
            >
              {t('dashboard.allNewsCta', {}, { defaultValue: 'All news →' })}
            </Link>
          </header>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-3')}>
            {news.map((n) => (
              <NewsSignalCard key={n.id} item={n} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
