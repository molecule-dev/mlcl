/**
 * Gradient hero card — total portfolio value in 6xl-extrabold,
 * frosted-glass change pill, decorative blurred teal orbs,
 * inline area-chart sparkline of 30-day history.
 *
 * Translated from personal-finance's NetWorthCard.tsx. Argent's
 * navy/teal palette gives it a "private bank vault" feel rather
 * than the warmer personal-finance gradient.
 */

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface HistoryPoint {
  date: string
  value_cents: number
}

interface PortfolioHeroCardProps {
  totalValueCents: number
  dayChangeCents: number
  dayChangePct: number
  totalPnlCents: number
  totalPnlPct: number
  history: HistoryPoint[]
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function fmtUsd(cents: unknown, opts: { compact?: boolean } = {}): string {
  const c = num(cents)
  const sign = c < 0 ? '-' : ''
  const dollars = Math.abs(c) / 100
  if (opts.compact && dollars >= 1_000_000) return `${sign}$${(dollars / 1_000_000).toFixed(2)}M`
  return `${sign}$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtPct(v: unknown): string {
  const n = num(v)
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export function PortfolioHeroCard({
  totalValueCents,
  dayChangeCents,
  dayChangePct,
  totalPnlCents,
  totalPnlPct,
  history,
}: PortfolioHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const positive = dayChangePct >= 0

  const safeHistory = (Array.isArray(history) ? history : []).map((p) => ({
    date: String((p as { date?: unknown })?.date ?? ''),
    value_cents: num((p as { value_cents?: unknown })?.value_cents),
  }))
  const values = safeHistory.length > 0 ? safeHistory.map((p) => p.value_cents) : [0, 0]
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = Math.max(1, max - min)
  const points = safeHistory
    .map((p, i) => {
      const x = (i / Math.max(1, safeHistory.length - 1)) * 400
      const y = 90 - ((p.value_cents - min) / range) * 80
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const areaPath = points ? `M0,100 L${points.split(' ').join(' L')} L400,100 Z` : ''

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-white/70',
          )}
        >
          {t('portfolioHeroCard.label', {}, { defaultValue: 'Portfolio Value' })}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }), 'flex-wrap')}>
          <span className={cm.cn('text-6xl font-extrabold tracking-tighter tabular-nums')}>
            {fmtUsd(totalValueCents, { compact: true })}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface/20 backdrop-blur-md',
            )}
          >
            <span
              className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
              aria-hidden="true"
            >
              {positive ? 'trending_up' : 'trending_down'}
            </span>
            <span className={cm.cn('tabular-nums')}>
              {fmtUsd(dayChangeCents)} ({fmtPct(dayChangePct)})
            </span>
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'text-white/80 tabular-nums')}>
          {t(
            'portfolioHeroCard.allTime',
            { amount: fmtUsd(totalPnlCents), pct: fmtPct(totalPnlPct) },
            { defaultValue: '{{amount}} ({{pct}}) all-time' },
          )}
        </p>
      </div>

      <div className={cm.cn(cm.sp('mt', 8), cm.h(24), cm.w('full'), 'relative z-10')}>
        <svg
          className={cm.cn(cm.w('full'), cm.h('full'))}
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {areaPath ? <path d={areaPath} fill="white" opacity="0.2" /> : null}
          {points ? (
            <polyline points={points} fill="none" stroke="white" strokeWidth="2.5" />
          ) : null}
        </svg>
      </div>

      {/* Decorative orbs */}
      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-20 -bottom-20 bg-surface/10 blur-3xl',
        )}
      />
      <div
        className={cm.cn(
          cm.w(20),
          cm.h(20),
          cm.roundedFull,
          'absolute right-10 top-10 bg-surface/20 blur-xl',
        )}
      />
    </div>
  )
}
