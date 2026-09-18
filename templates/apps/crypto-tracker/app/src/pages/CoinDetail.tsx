import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { fmtPct, fmtUsd, priceFractionDigits } from '../lib/format.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface CoinDetailData {
  symbol: string
  name: string
  rank: number
  price_usd: number
  change_1h_pct: number
  change_24h_pct: number
  change_7d_pct: number
  change_30d_pct: number
  market_cap_usd: number
  fully_diluted_valuation_usd: number
  volume_24h_usd: number
  circulating_supply: number
  total_supply: number
  max_supply: number | null
  ath_usd: number
  atl_usd: number
  history_30d: { ts: string; price_usd: number }[]
  description: string
  links: { website?: string; whitepaper?: string; twitter?: string }
}

export function CoinDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { symbol } = useParams<{ symbol: string }>()
  const [coin, setCoin] = useState<CoinDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [watching, setWatching] = useState(false)
  const [watchPending, setWatchPending] = useState(false)

  useEffect(() => {
    if (!symbol) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/markets/${symbol}`)
      .then((res) => {
        if (!cancelled) setCoin(unwrapSingle<CoinDetailData>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('coinDetail.loadError', {}, { defaultValue: 'Failed to load coin.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, symbol, t])

  useEffect(() => {
    if (!symbol) return
    let cancelled = false
    http
      .get('/api/watchlist')
      .then((res) => {
        if (cancelled) return
        const list = (res as { data?: Array<{ symbol: string }> })?.data ?? []
        const isWatched = list.some(
          (row) => (row.symbol || '').toLowerCase() === symbol.toLowerCase(),
        )
        setWatching(isWatched)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http, symbol])

  const toggleWatch = async () => {
    if (!coin || watchPending) return
    setWatchPending(true)
    const next = !watching
    setWatching(next)
    try {
      if (next) {
        await http.post('/api/watchlist', { symbol: coin.symbol.toLowerCase(), name: coin.name })
      } else {
        await http.delete(
          `/api/watchlist/by-symbol/${encodeURIComponent(coin.symbol.toLowerCase())}`,
        )
      }
    } catch (_error) {
      // optimistic update: restore watching state on failure
      setWatching(!next)
    } finally {
      setWatchPending(false)
    }
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 10), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }
  if (error || !coin) {
    return (
      <div className={cm.cn(cm.sp('p', 10), cm.textCenter, 'text-error')}>
        {error ?? t('coinDetail.notFound', {}, { defaultValue: 'Coin not found.' })}
      </div>
    )
  }

  const prices = coin.history_30d.map((p) => p.price_usd)
  const max = Math.max(...prices)
  const min = Math.min(...prices)
  const range = max - min || 1
  const heroPositive = coin.change_24h_pct >= 0
  const heroBg = heroPositive
    ? 'bg-gradient-to-br from-primary/95 via-primary to-primary/80'
    : 'bg-gradient-to-br from-error/90 via-error to-error/70'

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
      <Link
        to="/markets"
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          'text-primary hover:underline inline-flex items-center gap-1',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
        {t('coinDetail.back', {}, { defaultValue: 'All markets' })}
      </Link>

      <header
        className={cm.cn(
          cm.sp('p', 8),
          'relative overflow-hidden rounded-[2rem] text-on-primary shadow-xl',
          heroBg,
        )}
      >
        <div
          aria-hidden="true"
          className={cm.cn(
            'pointer-events-none absolute -top-16 -right-12 h-56 w-56 rounded-full bg-on-primary/10 blur-3xl',
          )}
        />
        <div
          aria-hidden="true"
          className={cm.cn(
            'pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-on-primary/10 blur-3xl',
          )}
        />
        <div className={cm.cn('relative z-10 flex flex-wrap items-start justify-between gap-6')}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-on-primary/80">
              {t('coinDetail.rank', { rank: coin.rank }, { defaultValue: 'Rank #{{rank}}' })}
            </p>
            <h1
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 2),
                'tracking-tight',
              )}
            >
              {coin.name}
              <span
                className={cm.cn(
                  'text-base ml-3 uppercase font-mono tabular-nums opacity-80 tracking-wider',
                )}
              >
                {coin.symbol}
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.sp('mt', 4),
                'font-mono text-5xl font-extrabold tabular-nums tracking-tight',
              )}
            >
              {fmtUsd(coin.price_usd, priceFractionDigits(coin.price_usd))}
            </p>
            <div className={cm.cn(cm.sp('mt', 4), cm.flex({ gap: 'md', wrap: 'wrap' }), 'text-sm')}>
              <DeltaChip label="1h" pct={coin.change_1h_pct} />
              <DeltaChip label="24h" pct={coin.change_24h_pct} />
              <DeltaChip label="7d" pct={coin.change_7d_pct} />
              <DeltaChip label="30d" pct={coin.change_30d_pct} />
            </div>
          </div>
          <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }))}>
            <button
              type="button"
              data-testid="coin-detail-watch-toggle"
              onClick={toggleWatch}
              disabled={watchPending}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                'rounded-full bg-on-primary/15 hover:bg-on-primary/25 text-on-primary backdrop-blur transition-colors inline-flex items-center gap-2 disabled:opacity-60',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>star</span>
              {watching
                ? t('coinDetail.watchingCta', {}, { defaultValue: 'Watching' })
                : t('coinDetail.watchCta', {}, { defaultValue: 'Watch' })}
            </button>
            <Link
              to={`/alerts/new?symbol=${encodeURIComponent(coin.symbol.toUpperCase())}`}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                'rounded-full bg-on-primary text-primary hover:bg-on-primary/90 transition-colors inline-flex items-center gap-2',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>
                notifications_active
              </span>
              {t('coinDetail.alertCta', {}, { defaultValue: 'Set alert' })}
            </Link>
          </div>
        </div>
      </header>

      <section
        className={cm.cn(
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm',
          cm.sp('p', 6),
        )}
      >
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            {t('coinDetail.chartHeading', {}, { defaultValue: 'Price · last 30 days' })}
          </h2>
          <p className={cm.cn('text-xs font-mono text-on-surface-variant tabular-nums')}>
            {fmtUsd(min, priceFractionDigits(min))} – {fmtUsd(max, priceFractionDigits(max))}
          </p>
        </header>
        <svg viewBox="0 0 600 220" className={cm.cn('w-full h-56')} role="img">
          <defs>
            <linearGradient
              id={`coin-detail-area-${coin.symbol}`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop
                offset="0%"
                stopColor={
                  coin.change_30d_pct >= 0
                    ? 'var(--mol-color-success, #22c55e)'
                    : 'var(--mol-color-error, #ef4444)'
                }
                stopOpacity="0.35"
              />
              <stop
                offset="100%"
                stopColor={
                  coin.change_30d_pct >= 0
                    ? 'var(--mol-color-success, #22c55e)'
                    : 'var(--mol-color-error, #ef4444)'
                }
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <polygon
            fill={`url(#coin-detail-area-${coin.symbol})`}
            points={
              coin.history_30d
                .map((p, i, arr) => {
                  const x = (i / Math.max(1, arr.length - 1)) * 580 + 10
                  const y = 210 - ((p.price_usd - min) / range) * 200
                  return `${x.toFixed(1)},${y.toFixed(1)}`
                })
                .join(' ') + ` 590,210 10,210`
            }
          />
          <polyline
            fill="none"
            stroke={
              coin.change_30d_pct >= 0
                ? 'var(--mol-color-success, #22c55e)'
                : 'var(--mol-color-error, #ef4444)'
            }
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={coin.history_30d
              .map((p, i, arr) => {
                const x = (i / Math.max(1, arr.length - 1)) * 580 + 10
                const y = 210 - ((p.price_usd - min) / range) * 200
                return `${x.toFixed(1)},${y.toFixed(1)}`
              })
              .join(' ')}
          />
        </svg>
      </section>

      <section className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'lg:grid-cols-2')}>
        <div
          className={cm.cn(
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm',
            cm.sp('p', 6),
            'space-y-3',
          )}
        >
          <h2 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            {t('coinDetail.statsHeading', {}, { defaultValue: 'Key stats' })}
          </h2>
          <Row
            label={t('coinDetail.marketCap', {}, { defaultValue: 'Market cap' })}
            value={fmtUsd(coin.market_cap_usd)}
          />
          <Row
            label={t('coinDetail.fdv', {}, { defaultValue: 'Fully diluted valuation' })}
            value={fmtUsd(coin.fully_diluted_valuation_usd)}
          />
          <Row
            label={t('coinDetail.volume24h', {}, { defaultValue: 'Volume · 24h' })}
            value={fmtUsd(coin.volume_24h_usd)}
          />
          <Row
            label={t('coinDetail.circulating', {}, { defaultValue: 'Circulating supply' })}
            value={`${coin.circulating_supply.toLocaleString()} ${coin.symbol.toUpperCase()}`}
          />
          <Row
            label={t('coinDetail.maxSupply', {}, { defaultValue: 'Max supply' })}
            value={
              coin.max_supply
                ? `${coin.max_supply.toLocaleString()} ${coin.symbol.toUpperCase()}`
                : '∞'
            }
          />
          <Row
            label={t('coinDetail.allTimeHigh', {}, { defaultValue: 'All-time high' })}
            value={fmtUsd(coin.ath_usd, priceFractionDigits(coin.ath_usd))}
          />
          <Row
            label={t('coinDetail.allTimeLow', {}, { defaultValue: 'All-time low' })}
            value={fmtUsd(coin.atl_usd, priceFractionDigits(coin.atl_usd))}
          />
        </div>
        <div
          className={cm.cn(
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm',
            cm.sp('p', 6),
            'space-y-4',
          )}
        >
          <h2 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            {t('nav.about', {}, { defaultValue: 'About' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {coin.description}
          </p>
          <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }), cm.sp('pt', 2))}>
            {coin.links.website ? (
              <ExternalLink
                href={coin.links.website}
                icon="public"
                label={t('coinDetail.links.website', {}, { defaultValue: 'Website' })}
              />
            ) : null}
            {coin.links.whitepaper ? (
              <ExternalLink
                href={coin.links.whitepaper}
                icon="article"
                label={t('coinDetail.links.whitepaper', {}, { defaultValue: 'Whitepaper' })}
              />
            ) : null}
            {coin.links.twitter ? (
              <ExternalLink
                href={coin.links.twitter}
                icon="alternate_email"
                label={t('coinDetail.links.twitter', {}, { defaultValue: 'Twitter' })}
              />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('sm'))}>
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className="tabular-nums font-mono font-semibold">{value}</dd>
    </div>
  )
}

function DeltaChip({ label, pct }: { label: string; pct: number }) {
  const cm = getClassMap()
  return (
    <span
      className={cm.cn(
        cm.sp('px', 3),
        cm.sp('py', 1),
        cm.roundedFull,
        cm.fontWeight('bold'),
        'tabular-nums backdrop-blur bg-on-primary/15',
      )}
    >
      <span className={cm.cn(cm.sp('mr', 1), 'text-xs uppercase tracking-widest opacity-70')}>
        {label}
      </span>
      {fmtPct(pct)}
    </span>
  )
}

function ExternalLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  const cm = getClassMap()
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cm.cn(
        cm.sp('px', 3),
        cm.sp('py', 2),
        cm.textSize('sm'),
        cm.fontWeight('semibold'),
        'rounded-full border border-outline-variant/60 hover:border-primary hover:text-primary transition-colors inline-flex items-center gap-2',
      )}
    >
      <span className={cm.cn('material-symbols-outlined text-base')}>{icon}</span>
      {label}
    </a>
  )
}
