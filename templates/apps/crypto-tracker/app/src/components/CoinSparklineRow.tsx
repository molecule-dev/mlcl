/**
 * Editorial table row for a single coin — name + uppercase mono ticker, price,
 * 24h delta as a bold colored pill, market cap, and an inline 7d sparkline
 * using `text-success` / `text-error` strokes from the Material 3 token set.
 *
 * Translated from personal-finance/AccountRecentTransactions.tsx (row hover
 * pattern) with the dense Bloomberg-numeric treatment from DESIGN.md.
 */
import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { deltaClass, fmtPct, fmtUsd, priceFractionDigits } from '../lib/format.js'

export interface CoinSparklineRowData {
  symbol: string
  name: string
  rank?: number
  price_usd: number
  change_24h_pct: number
  market_cap_usd: number
  volume_24h_usd?: number
  sparkline_7d?: number[]
}

export function CoinSparklineRow({
  coin,
  showRank = true,
}: {
  coin: CoinSparklineRowData
  showRank?: boolean
}) {
  const cm = getClassMap()
  const positive = coin.change_24h_pct >= 0
  return (
    <tr
      className={cm.cn('hover:bg-surface-container/60 transition-colors duration-150')}
      data-mol-id={`coin-row-${coin.symbol}`}
    >
      {showRank ? (
        <td
          className={cm.cn(cm.sp('px', 4), cm.sp('py', 4), 'tabular-nums text-on-surface-variant')}
        >
          {coin.rank ?? '—'}
        </td>
      ) : null}
      <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 4))}>
        <Link
          to={`/coin/${coin.symbol}`}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.fontWeight('semibold'),
            'hover:text-primary transition-colors',
          )}
        >
          <span
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              cm.textSize('xs'),
              'bg-primary-container text-on-primary-container font-extrabold uppercase tabular-nums',
            )}
            aria-hidden="true"
          >
            {coin.symbol.slice(0, 2)}
          </span>
          <span>
            {coin.name}
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('ml', 2),
                'uppercase font-mono tabular-nums text-on-surface-variant tracking-wider',
              )}
            >
              {coin.symbol}
            </span>
          </span>
        </Link>
      </td>
      <td
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 4),
          'text-right tabular-nums',
          cm.fontWeight('semibold'),
        )}
      >
        {fmtUsd(coin.price_usd, priceFractionDigits(coin.price_usd))}
      </td>
      <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 4), 'text-right')}>
        <span
          className={cm.cn(
            cm.sp('px', 2),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'py-0.5 tabular-nums',
            positive ? 'bg-success/15' : 'bg-error/15',
            deltaClass(coin.change_24h_pct),
          )}
        >
          {fmtPct(coin.change_24h_pct)}
        </span>
      </td>
      <td
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 4),
          'text-right tabular-nums text-on-surface-variant',
        )}
      >
        {fmtUsd(coin.market_cap_usd)}
      </td>
      {coin.volume_24h_usd !== undefined ? (
        <td
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 4),
            'text-right tabular-nums text-on-surface-variant',
          )}
        >
          {fmtUsd(coin.volume_24h_usd)}
        </td>
      ) : null}
      <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 4))}>
        <Sparkline points={coin.sparkline_7d ?? []} positive={positive} />
      </td>
    </tr>
  )
}

function Sparkline({ points, positive }: { points: number[]; positive: boolean }) {
  if (points.length < 2) return null
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const w = 120
  const h = 36
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w
      const y = h - ((p - min) / range) * h
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="block">
      <path
        d={path}
        fill="none"
        stroke={positive ? 'var(--mol-color-success, #22c55e)' : 'var(--mol-color-error, #ef4444)'}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
