/**
 * Gradient hero card — total cash on hand in 6xl-extrabold, frosted-glass
 * outstanding pill, decorative blurred orbs in brand navy + accent gold,
 * inline SVG sparkline of revenue history.
 *
 * Translated from personal-finance's NetWorthCard.tsx into the Ledger brand
 * (deep navy `--mol-color-primary` → `--mol-color-primary-dark`,
 * gold accent for the change pill).
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface CashHeroCardProps {
  cashOnHandCents: number
  outstandingCents: number
  overdueCents: number
  ytdRevenueCents: number
  ytdProfitCents: number
  revenueHistory: { month: string; amountCents: number }[]
}

function fmtUsd(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents) / 100
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 10_000) return `${sign}$${(abs / 1000).toFixed(1)}K`
  return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function CashHeroCard({
  cashOnHandCents,
  outstandingCents,
  overdueCents,
  ytdRevenueCents,
  ytdProfitCents,
  revenueHistory,
}: CashHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const points = revenueHistory.length > 0 ? revenueHistory : [{ month: '-', amountCents: 0 }]
  const max = Math.max(...points.map((p) => p.amountCents), 1)
  const min = Math.min(...points.map((p) => p.amountCents), 0)
  const range = Math.max(1, max - min)
  const path = points
    .map((p, i) => {
      const x = (i / Math.max(1, points.length - 1)) * 400
      const y = 100 - ((p.amountCents - min) / range) * 90
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const fill = `${path} L400,100 L0,100 Z`

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] lg:col-span-8 bg-gradient-to-br from-primary to-primary-dark rounded-[2rem] text-white relative overflow-hidden',
      )}
      data-mol-id="cash-hero-card"
    >
      <div className="relative z-10">
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.sp('mb', 2),
            'uppercase tracking-[0.2em] text-white/70',
          )}
        >
          {t('cashHeroCard.eyebrow', {}, { defaultValue: 'Cash on hand' })}
        </p>
        <div className={cm.flex({ align: 'baseline', gap: 'md' })}>
          <span className="text-6xl font-extrabold tracking-tighter tabular-nums">
            {fmtUsd(cashOnHandCents)}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface/15 backdrop-blur-md',
            )}
            style={{ color: 'var(--color-accent-gold)' }}
          >
            <span className={cm.cn('material-symbols-outlined text-sm')}>trending_up</span>
            {t(
              'cashHeroCard.ytdProfit',
              { amount: fmtUsd(ytdProfitCents) },
              { defaultValue: '{{amount}} YTD profit' },
            )}
          </span>
        </div>
        <div className={cm.cn(cm.flex({ gap: 'lg' }), cm.sp('mt', 6), 'text-white/80')}>
          <div>
            <p className={cm.cn(cm.textSize('xs'), 'uppercase tracking-wider text-white/60')}>
              {t('status.outstanding', {}, { defaultValue: 'Outstanding' })}
            </p>
            <p className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), 'tabular-nums')}>
              {fmtUsd(outstandingCents)}
            </p>
          </div>
          <div>
            <p className={cm.cn(cm.textSize('xs'), 'uppercase tracking-wider text-white/60')}>
              {t('status.overdue', {}, { defaultValue: 'Overdue' })}
            </p>
            <p
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), 'tabular-nums')}
              style={{ color: 'var(--color-accent-gold)' }}
            >
              {fmtUsd(overdueCents)}
            </p>
          </div>
          <div>
            <p className={cm.cn(cm.textSize('xs'), 'uppercase tracking-wider text-white/60')}>
              {t('cashHeroCard.ytdRevenueLabel', {}, { defaultValue: 'YTD revenue' })}
            </p>
            <p className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), 'tabular-nums')}>
              {fmtUsd(ytdRevenueCents)}
            </p>
          </div>
        </div>
      </div>

      <div className={cm.cn(cm.sp('mt', 8), cm.h(24), cm.w('full'), 'relative z-10 opacity-80')}>
        <svg
          className={cm.cn(cm.w('full'), cm.h('full'))}
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={fill} fill="white" opacity="0.15" />
          <path
            d={path}
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
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
        aria-hidden="true"
      />
      <div
        className={cm.cn(cm.w(64), cm.h(64), cm.roundedFull, 'absolute -left-16 top-10 blur-3xl')}
        style={{ backgroundColor: 'var(--color-accent-gold-bg)' }}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          cm.w(20),
          cm.h(20),
          cm.roundedFull,
          'absolute right-12 top-12 bg-surface/10 blur-xl',
        )}
        aria-hidden="true"
      />
    </div>
  )
}

export default CashHeroCard
