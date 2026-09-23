import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface BalanceHeroCardProps {
  totalCents: number
  changeCents: number
  /** Optional balance-history series — drives the SVG sparkline if provided. */
  history?: ReadonlyArray<{ date: string; net_worth_cents: number }>
}

function fmt(cents: number) {
  const sign = cents < 0 ? '-' : ''
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Gradient hero card — total balance in 6xl-extrabold, 30-day change as a
 * frosted-glass pill, inline SVG sparkline, decorative blurred orbs.
 *
 * Translated from personal-finance's NetWorthCard.tsx pattern.
 */
export function BalanceHeroCard({ totalCents, changeCents, history }: BalanceHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const positive = changeCents >= 0

  // Build SVG path from history series (or fall back to a stylized mock curve).
  const sparklinePaths = (() => {
    if (!history || history.length < 2) {
      return {
        fill: 'M0,80 Q50,60 100,70 T200,30 T300,50 T400,10 L400,100 L0,100 Z',
        stroke: 'M0,80 Q50,60 100,70 T200,30 T300,50 T400,10',
      }
    }
    const W = 400,
      H = 100
    const values = history.map((p) => p.net_worth_cents)
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
        'min-h-[320px] p-6 sm:p-10 lg:col-span-8 bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary-fixed/80',
          )}
        >
          {t('balanceHeroCard.title', {}, { defaultValue: 'Total Balance' })}
        </h2>
        <div className={cm.flex({ align: 'baseline', gap: 'md' })}>
          <span
            className={cm.cn('text-4xl sm:text-6xl font-extrabold tracking-tighter tabular-nums')}
          >
            {fmt(totalCents)}
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
              'balanceHeroCard.change',
              { sign: positive ? '+' : '', amount: fmt(changeCents) },
              { defaultValue: '{{sign}}{{amount}}' },
            )}
          </span>
        </div>
      </div>

      {/* Mock area-chart sparkline */}
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

      {/* Decorative blurred orbs */}
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
