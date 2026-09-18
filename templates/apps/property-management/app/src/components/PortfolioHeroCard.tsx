import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Gradient navy hero card — total monthly rent in 6xl-extrabold
 * tracking-tighter, frosted-glass change pill, decorative blurred
 * orbs, inline SVG sparkline of last 12-month rent collection.
 *
 * Translated from personal-finance/NetWorthCard.tsx with Hearthstone
 * navy palette and a property-management lens (rent collected, not
 * net worth).
 */
export interface PortfolioHeroCardProps {
  /** Total rent collected this month, in cents. */
  totalCents: number
  /** Month-over-month delta in cents (positive = up). */
  changeCents: number
  /** 12-point monthly history (cents) for the inline sparkline. */
  history?: ReadonlyArray<number>
}

function fmtCurrency(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}$${(abs / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function buildSparklinePath(history: ReadonlyArray<number>): { area: string; line: string } {
  if (!history.length) return { area: '', line: '' }
  const max = Math.max(...history)
  const min = Math.min(...history)
  const range = max - min || 1
  const w = 400
  const h = 100
  const stepX = w / Math.max(history.length - 1, 1)
  const points = history.map((v, i) => {
    const x = i * stepX
    const y = h - ((v - min) / range) * (h - 12) - 6
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const line = `M${points.join(' L')}`
  const area = `${line} L${w},${h} L0,${h} Z`
  return { area, line }
}

export function PortfolioHeroCard({ totalCents, changeCents, history }: PortfolioHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isUp = changeCents >= 0
  const { area, line } = buildSparklinePath(
    history && history.length ? history : [82, 84, 81, 86, 88, 87, 90, 89, 92, 95, 93, 97],
  )

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] lg:col-span-8 bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-on-primary relative overflow-hidden',
      )}
      data-mol-id="portfolio-hero-card"
    >
      <div className={cm.cn('relative z-10')}>
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-on-primary/70',
          )}
        >
          {t('portfolioHeroCard.title', {}, { defaultValue: 'Total Rent Collected · This Month' })}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md', wrap: 'wrap' }))}>
          <span className={cm.cn('text-6xl font-extrabold tracking-tighter tabular-nums')}>
            {fmtCurrency(totalCents)}
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
              {isUp ? 'trending_up' : 'trending_down'}
            </span>
            {t(
              'portfolioHeroCard.change',
              { sign: isUp ? '+' : '', amount: fmtCurrency(changeCents) },
              { defaultValue: '{{sign}}{{amount}} vs last month' },
            )}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 4), 'text-on-primary/70 max-w-md')}>
          {t(
            'portfolioHeroCard.subtitle',
            {},
            { defaultValue: 'Rent roll across every building, every unit. Updated continuously.' },
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
          <path d={area} fill="white" opacity="0.3" />
          <path d={line} fill="none" stroke="white" strokeWidth="3" />
        </svg>
      </div>
      {/* Decorative orbs */}
      <div
        className={cm.cn(
          'absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-surface/10 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute right-10 top-10 w-20 h-20 rounded-full bg-secondary/30 blur-2xl',
        )}
        aria-hidden="true"
      />
    </div>
  )
}

export default PortfolioHeroCard
