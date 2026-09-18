import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Gradient hero card — total revenue in 6xl-extrabold, frosted-glass change
 * pill, decorative blurred orbs, inline SVG sparkline. Trove's headline number
 * for the seller dashboard.
 *
 * Translated from personal-finance/NetWorthCard.tsx.
 */

interface RevenueHeroCardProps {
  totalRevenueCents: number
  changePct: number
  changeAbsCents: number
  rangeLabel?: string
  /** 8-12 normalized data points (0–100) for the sparkline. */
  sparkline?: number[]
}

const DEFAULT_SPARK = [42, 38, 55, 49, 62, 71, 68, 84, 78, 92]

function formatUsd(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatUsdSigned(cents: number) {
  const sign = cents >= 0 ? '+' : '-'
  return `${sign}${formatUsd(Math.abs(cents))}`
}

function buildSparklinePath(points: number[]) {
  if (points.length === 0) return { area: '', line: '' }
  const w = 400
  const h = 100
  const max = Math.max(...points, 1)
  const stepX = points.length > 1 ? w / (points.length - 1) : w
  const coords = points.map((v, i) => {
    const x = i * stepX
    const y = h - (v / max) * (h - 10) - 5
    return [x, y] as const
  })
  const line = coords.reduce(
    (acc, [x, y], i) =>
      acc + (i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : ` L${x.toFixed(1)},${y.toFixed(1)}`),
    '',
  )
  const area = `${line} L${w},${h} L0,${h} Z`
  return { area, line }
}

function RevenueHeroCard({
  totalRevenueCents,
  changePct,
  changeAbsCents,
  rangeLabel,
  sparkline,
}: RevenueHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const points = sparkline?.length ? sparkline : DEFAULT_SPARK
  const { area, line } = buildSparklinePath(points)
  const positive = changeAbsCents >= 0

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
            cm.textSize('sm'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-white/80',
          )}
        >
          {t(
            'revenueHeroCard.title',
            { range: rangeLabel ?? '' },
            { defaultValue: 'Total Revenue' },
          )}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }), 'flex-wrap')}>
          <span
            className={cm.cn('text-6xl font-extrabold tracking-tighter')}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatUsd(totalRevenueCents)}
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
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              {positive ? 'trending_up' : 'trending_down'}
            </span>
            {t(
              'revenueHeroCard.change',
              {
                amount: formatUsdSigned(changeAbsCents),
                pct: changePct.toFixed(1),
              },
              { defaultValue: '{{amount}} ({{pct}}%)' },
            )}
          </span>
        </div>
      </div>
      <div className={cm.cn(cm.sp('mt', 12), cm.h(24), cm.w('full'), 'relative z-10')}>
        <svg
          className={cm.cn(cm.w('full'), cm.h('full'))}
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
        >
          <path d={area} fill="white" fillOpacity="0.3" />
          <path
            d={line}
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
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

export default RevenueHeroCard
export { RevenueHeroCard }
