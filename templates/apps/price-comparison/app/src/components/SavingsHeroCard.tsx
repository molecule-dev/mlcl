/**
 * Gradient hero card — lifetime savings in 6xl-extrabold tabular-nums,
 * frosted-glass watching pill, decorative blurred orbs, inline SVG
 * savings sparkline. Used on Dashboard and (with curated demo data) on
 * the Landing page so a logged-out visitor sees what Bargain looks like
 * inside.
 *
 * Translated from coupon-deals-platform/TotalSavingsHero.tsx (itself
 * adapted from personal-finance/NetWorthCard.tsx) — same hero anatomy
 * (decorative orbs / glass pill / oversized number / sparkline) re-skinned
 * in Bargain's deep-orange brand palette with a price-drop sparkline.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { fmtUsd } from '../lib/unwrap.js'

export interface SavingsHeroCardProps {
  /** Lifetime savings (cumulative best vs avg) in cents. */
  totalSavingsCents: number
  /** Number of products currently being watched. */
  watchingCount: number
  /** Number of price drops detected this week. */
  weekDropCount: number
  /** Last 8 months of cumulative savings (cents). */
  trend?: number[]
  /** Optional eyebrow override. */
  eyebrow?: string
}

function buildSparkline(values: number[]): string {
  if (values.length < 2) return ''
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(max - min, 1)
  const w = 240
  const h = 56
  const stepX = w / (values.length - 1)
  return values
    .map((v, i) => {
      const x = i * stepX
      const y = h - ((v - min) / range) * h
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

const DEFAULT_TREND = [3200, 4800, 6100, 7400, 9200, 11600, 14400, 18420]

export function SavingsHeroCard({
  totalSavingsCents,
  watchingCount,
  weekDropCount,
  trend = DEFAULT_TREND,
  eyebrow,
}: SavingsHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const path = buildSparkline(trend)
  const areaPath = path ? `${path} L240,56 L0,56 Z` : ''

  return (
    <section
      data-mol-id="savings-hero-card"
      className={cm.cn(
        cm.sp('p', 8),
        'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-on-primary',
      )}
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-surface/15 blur-3xl pointer-events-none',
        )}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -left-12 top-1/3 h-48 w-48 rounded-full bg-secondary/30 blur-3xl pointer-events-none',
        )}
      />

      <div className={cm.cn(cm.flex({ align: 'start', justify: 'between' }), 'relative gap-4')}>
        <div className={cm.cn('min-w-0')}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-primary/80',
            )}
          >
            {eyebrow ?? t('savingsHeroCard.eyebrow', {}, { defaultValue: 'Lifetime savings' })}
          </p>
          <p
            className={cm.cn(
              cm.sp('mt', 2),
              'text-6xl font-extrabold tracking-tighter tabular-nums leading-none',
            )}
          >
            {fmtUsd(totalSavingsCents)}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'text-on-primary/85')}>
            {t(
              'savingsHeroCard.tagline',
              { drops: weekDropCount },
              { defaultValue: '{{drops}} price drops detected this week. Keep saving.' },
            )}
          </p>
        </div>

        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'rounded-full bg-surface/20 backdrop-blur-md uppercase tracking-wider whitespace-nowrap',
          )}
          aria-label={t(
            'savingsHeroCard.watchingAria',
            { count: watchingCount },
            { defaultValue: '{{count}} products watched' },
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            visibility
          </span>
          {t(
            'savingsHeroCard.watchingPill',
            { count: watchingCount },
            { defaultValue: '{{count}} watching' },
          )}
        </span>
      </div>

      <div className={cm.cn(cm.sp('mt', 6), 'relative')}>
        <svg
          viewBox="0 0 240 56"
          className={cm.cn(cm.w('full'), 'block h-14 opacity-90')}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {areaPath && <path d={areaPath} fill="rgba(255,255,255,0.18)" />}
          {path && (
            <path
              d={path}
              fill="none"
              stroke="rgba(255,255,255,0.95)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </div>
    </section>
  )
}
