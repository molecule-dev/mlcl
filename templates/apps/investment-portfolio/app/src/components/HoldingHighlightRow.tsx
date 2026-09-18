/**
 * Editorial list row — circular asset-class avatar, ticker + name,
 * tabular-nums value column, frosted change pill in success/error tone.
 *
 * Translated from personal-finance's AccountRecentTransactions row +
 * ActivityRow gestures (avatar circle, hover-lift, color-coded delta).
 */

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const ASSET_CLASS_ICON: Record<string, string> = {
  'US Equity': 'show_chart',
  'Intl Equity': 'public',
  'Fixed Income': 'account_balance',
  'Real Estate': 'apartment',
  Commodities: 'diamond',
  Cash: 'payments',
}

const ASSET_CLASS_TINT: Record<string, string> = {
  'US Equity': 'bg-teal-100 text-teal-700',
  'Intl Equity': 'bg-warning-light text-warning',
  'Fixed Income': 'bg-indigo-100 text-indigo-700',
  'Real Estate': 'bg-sky-100 text-sky-700',
  Commodities: 'bg-purple-100 text-purple-700',
  Cash: 'bg-surface-secondary text-foreground',
}

interface HoldingHighlightRowProps {
  symbol: string
  name: string
  assetClass: string
  marketValueCents: number
  dayChangePct: number
  pnlPct: number
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
  const dollars = num(cents) / 100
  return `$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtPct(v: unknown): string {
  const n = num(v)
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export function HoldingHighlightRow({
  symbol,
  name,
  assetClass,
  marketValueCents,
  dayChangePct,
  pnlPct,
}: HoldingHighlightRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const icon = ASSET_CLASS_ICON[assetClass] ?? 'donut_small'
  const tint = ASSET_CLASS_TINT[assetClass] ?? 'bg-surface-secondary text-foreground'
  const dayUp = num(dayChangePct) >= 0
  const pnlUp = num(pnlPct) >= 0

  return (
    <Link
      to={`/assets/${symbol}`}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'lg' }),
        cm.sp('px', 5),
        cm.sp('py', 4),
        'bg-surface-container-lowest rounded-2xl border border-transparent hover:border-outline-variant/40 hover:-translate-y-0.5 transition-all duration-200 group',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'min-w-0')}>
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            tint,
            'shrink-0',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
            {icon}
          </span>
        </div>
        <div className={cm.cn('min-w-0')}>
          <p className={cm.cn(cm.fontWeight('bold'), 'font-mono text-on-surface')}>
            {symbol}
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'ml-2 uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {assetClass}
            </span>
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>{name}</p>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
        <div className={cm.cn('text-right')}>
          <p className={cm.cn(cm.fontWeight('bold'), 'tabular-nums text-on-surface')}>
            {fmtUsd(marketValueCents)}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'tabular-nums text-on-surface-variant')}>
            {t('holdingHighlightRow.todayLabel', {}, { defaultValue: 'today' })}{' '}
            <span className={dayUp ? 'text-success' : 'text-error'}>{fmtPct(dayChangePct)}</span>
          </p>
        </div>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'tabular-nums whitespace-nowrap',
            pnlUp ? 'bg-success/15 text-success' : 'bg-error/15 text-error',
          )}
        >
          {fmtPct(pnlPct)}
        </span>
      </div>
    </Link>
  )
}
