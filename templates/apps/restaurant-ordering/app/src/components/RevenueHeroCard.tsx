import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface RevenueHeroCardProps {
  /** Total revenue for the current shift, in cents. */
  revenueCents: number
  /** Change vs. yesterday's matching shift, in cents (positive = up). */
  changeCents: number
  /** Optional hourly trend — drives the SVG sparkline if provided. */
  history?: ReadonlyArray<{ hour: string; cents: number }>
  /** Currently active orders (paint a small chip in the corner). */
  activeOrders?: number
}

function fmt(cents: number) {
  const sign = cents < 0 ? '-' : ''
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Gradient hero card — today's revenue in 6xl-extrabold, frosted-glass
 * change pill, decorative blurred orbs, inline SVG sparkline of hourly
 * sales.
 *
 * Translated from banking-dashboard's BalanceHeroCard.tsx (which in turn
 * was translated from personal-finance's NetWorthCard.tsx).
 */
export function RevenueHeroCard({
  revenueCents,
  changeCents,
  history,
  activeOrders,
}: RevenueHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const positive = changeCents >= 0

  const sparklinePaths = (() => {
    if (!history || history.length < 2) {
      return {
        fill: 'M0,80 Q50,55 100,65 T200,40 T300,30 T400,15 L400,100 L0,100 Z',
        stroke: 'M0,80 Q50,55 100,65 T200,40 T300,30 T400,15',
      }
    }
    const W = 400,
      H = 100
    const values = history.map((p) => p.cents)
    const min = Math.min(...values),
      max = Math.max(...values)
    const range = max - min || 1
    const pts = values.map((v, i) => {
      const x = (i / (values.length - 1)) * W
      const y = H - ((v - min) / range) * (H * 0.85) - H * 0.1
      return [x, y]
    })
    const stroke = pts
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' ')
    const fill = `${stroke} L${W},${H} L0,${H} Z`
    return { fill, stroke }
  })()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] lg:col-span-8 bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'uppercase tracking-widest text-primary-fixed/80',
            )}
          >
            {t('revenueHeroCard.title', {}, { defaultValue: "Today's revenue" })}
          </h2>
          {typeof activeOrders === 'number' && activeOrders > 0 && (
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
              <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                restaurant
              </span>
              {t(
                'revenueHeroCard.activeOrders',
                { count: activeOrders },
                { defaultValue: '{{count}} active' },
              )}
            </span>
          )}
        </div>
        <div className={cm.flex({ align: 'baseline', gap: 'md' })}>
          <span
            className={cm.cn('text-6xl font-extrabold tracking-tighter tabular-nums font-display')}
          >
            {fmt(revenueCents)}
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
            <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
              {positive ? 'trending_up' : 'trending_down'}
            </span>
            {t(
              'revenueHeroCard.change',
              { sign: positive ? '+' : '', amount: fmt(changeCents) },
              { defaultValue: '{{sign}}{{amount}} vs yesterday' },
            )}
          </span>
        </div>
      </div>

      <div
        className={cm.cn(
          cm.sp('mt', 12),
          cm.h(24),
          cm.w('full'),
          cm.flex({ align: 'end' }),
          'relative z-10',
        )}
      >
        <svg
          className={cm.cn(cm.w('full'), cm.h('full'))}
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
        >
          <path d={sparklinePaths.fill} fill="white" opacity="0.3" />
          <path d={sparklinePaths.stroke} fill="none" stroke="white" strokeWidth="3" />
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
          'absolute right-10 top-10 bg-primary-fixed/20 blur-xl',
        )}
      />
    </div>
  )
}
