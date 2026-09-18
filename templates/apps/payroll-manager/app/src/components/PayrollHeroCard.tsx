import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { fmtMoney } from '../lib/money.js'

interface PayrollHeroCardProps {
  /** Total gross of the next/upcoming pay run, in dollars (not cents). */
  nextRunGross: number
  /** ISO date string for the next pay-run pay date. */
  nextRunDate: string
  /** Number of employees included in the next run. */
  nextRunEmployeeCount: number
  /** YoY (or QoQ) change in dollars. Positive = growth. */
  changeAmount: number
  /** Optional history series to drive the SVG sparkline. */
  history?: ReadonlyArray<{ pay_date: string; total_gross: number }>
}

/**
 * Gradient hero card — next pay run total in 6xl-extrabold, frosted-glass
 * pill with employee count, decorative blurred orbs, inline SVG sparkline
 * across the bottom edge.
 *
 * Translated from banking-dashboard's BalanceHeroCard.tsx, retuned for
 * the Stipend brand (cyan→emerald gradient) and pay-run framing.
 */
export function PayrollHeroCard({
  nextRunGross,
  nextRunDate,
  nextRunEmployeeCount,
  changeAmount,
  history,
}: PayrollHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const positive = changeAmount >= 0

  const sparklinePaths = (() => {
    if (!history || history.length < 2) {
      return {
        fill: 'M0,80 Q50,55 100,65 T200,40 T300,30 T400,15 L400,100 L0,100 Z',
        stroke: 'M0,80 Q50,55 100,65 T200,40 T300,30 T400,15',
      }
    }
    const W = 400
    const H = 100
    const values = history.map((p) => p.total_gross)
    const min = Math.min(...values)
    const max = Math.max(...values)
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

  const dateLabel = new Date(nextRunDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] lg:col-span-8 rounded-[2rem] text-white relative overflow-hidden bg-gradient-to-br from-primary to-secondary',
      )}
    >
      <div className="relative z-10">
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-white/80',
          )}
        >
          {t(
            'payrollHeroCard.eyebrow',
            { date: dateLabel },
            { defaultValue: 'Next pay run · {{date}}' },
          )}
        </p>
        <div className={cm.flex({ align: 'baseline', gap: 'md', wrap: 'wrap' })}>
          <span className="text-6xl font-extrabold tracking-tighter tabular-nums">
            {fmtMoney(nextRunGross)}
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
            <span className={cm.cn(`material-symbols-outlined text-sm`)} aria-hidden="true">
              {positive ? 'trending_up' : 'trending_down'}
            </span>
            {t(
              'payrollHeroCard.change',
              { sign: positive ? '+' : '', amount: fmtMoney(changeAmount) },
              { defaultValue: '{{sign}}{{amount}} vs prior cycle' },
            )}
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mt', 6))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              'bg-surface/15 backdrop-blur-md',
            )}
          >
            <span className={cm.cn(`material-symbols-outlined text-sm`)} aria-hidden="true">
              group
            </span>
            {t(
              'payrollHeroCard.employees',
              { count: nextRunEmployeeCount },
              { defaultValue: '{{count}} employees' },
            )}
          </span>
          <Link
            to="/run-payroll"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'bg-surface text-primary hover:bg-surface/90 transition-colors',
            )}
          >
            {t('payrollHeroCard.cta', {}, { defaultValue: 'Review and run' })}
            <span className={cm.cn(`material-symbols-outlined text-base`)} aria-hidden="true">
              arrow_forward
            </span>
          </Link>
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
          `absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-surface/10 blur-3xl pointer-events-none`,
        )}
      />
      <div
        className={cm.cn(
          `absolute right-10 top-10 w-20 h-20 rounded-full bg-surface/15 blur-xl pointer-events-none`,
        )}
      />
    </div>
  )
}
