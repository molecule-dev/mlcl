import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Gradient hero card — total reimbursement recovered in 6xl-extrabold,
 * frosted-glass change pill, decorative blurred orbs, inline SVG sparkline.
 *
 * Translated from personal-finance's NetWorthCard.tsx — palette swapped to
 * Recoup teal (#0d7377), label changed to "Reimbursement Recovered" to match
 * Recoup's tagline "Every receipt, recovered".
 */
export interface RecoveredAmountHeroCardProps {
  amountCents: number
  changeCents: number
  pendingCount: number
}

const formatUsd = (cents: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100)

const formatChange = (cents: number): string => {
  const prefix = cents >= 0 ? '+' : '-'
  return `${prefix}${formatUsd(Math.abs(cents))}`
}

export function RecoveredAmountHeroCard({
  amountCents,
  changeCents,
  pendingCount,
}: RecoveredAmountHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const trendIcon = changeCents >= 0 ? 'trending_up' : 'trending_down'

  return (
    <section
      data-mol-id="hero-recovered"
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[280px] bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden shadow-xl shadow-primary/10 max-md:p-6',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mb', 3),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-white/80',
          )}
        >
          {t(
            'recoveredAmountHeroCard.label',
            {},
            { defaultValue: 'Reimbursement recovered · YTD' },
          )}
        </p>
        <div className={cm.flex({ align: 'baseline', gap: 'md', wrap: 'wrap' })}>
          <span
            className={cm.cn(
              'text-6xl max-md:text-4xl font-extrabold tracking-tighter tabular-nums',
            )}
          >
            {formatUsd(amountCents)}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'rounded-full bg-surface/20 backdrop-blur-md',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
              {trendIcon}
            </span>
            <span className={cm.cn('tabular-nums')}>{formatChange(changeCents)}</span>
          </span>
        </div>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mt', 4),
            cm.fontWeight('medium'),
            'text-white/85',
          )}
        >
          {t(
            'recoveredAmountHeroCard.pending',
            { count: pendingCount },
            {
              defaultValue: '{{count}} report(s) currently pending review across all approvers.',
            },
          )}
        </p>
      </div>

      <div className={cm.cn(cm.sp('mt', 8), cm.h(20), cm.w('full'), 'relative z-10')}>
        <svg className={cm.cn('w-full h-full')} viewBox="0 0 400 100" preserveAspectRatio="none">
          <path
            d="M0,80 Q50,60 100,70 T200,30 T300,50 T400,10 L400,100 L0,100 Z"
            fill="white"
            opacity="0.3"
          />
          <path
            d="M0,80 Q50,60 100,70 T200,30 T300,50 T400,10"
            fill="none"
            stroke="white"
            strokeWidth="3"
          />
        </svg>
      </div>

      <div
        className={cm.cn(
          'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
        )}
      />
      <div
        className={cm.cn('absolute right-12 top-12 w-20 h-20 rounded-full bg-surface/15 blur-xl')}
      />
    </section>
  )
}

export default RecoveredAmountHeroCard
