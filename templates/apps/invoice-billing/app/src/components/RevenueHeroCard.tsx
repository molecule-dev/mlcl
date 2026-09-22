import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Gradient hero card — total outstanding in 6xl-extrabold tabular-nums, frosted-glass
 * delta pill, decorative blurred orbs, inline SVG sparkline. The signature "money
 * front and center" surface for the Remit dashboard.
 *
 * Translated from personal-finance/NetWorthCard.tsx — palette swapped to Remit
 * teal gradient (primary → primary-container) with coral pill highlight.
 */

interface RevenueHeroCardProps {
  outstandingCents: number
  collectedCents: number
  changePct: number
  invoicesOpen: number
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(cents / 100))

export function RevenueHeroCard({
  outstandingCents,
  collectedCents,
  changePct,
  invoicesOpen,
}: RevenueHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const positive = changePct >= 0

  return (
    <div
      data-mol-id="revenue-hero"
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[300px] bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-white/75',
          )}
        >
          {t('revenueHeroCard.title', {}, { defaultValue: 'Total Outstanding' })}
        </h2>
        <div
          className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }))}
          style={{ flexWrap: 'wrap' }}
        >
          <span
            className={cm.cn('text-5xl min-[480px]:text-6xl font-extrabold tracking-tighter')}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatCurrency(outstandingCents)}
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
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
              {positive ? 'trending_up' : 'trending_down'}
            </span>
            {t(
              'revenueHeroCard.change',
              { sign: positive ? '+' : '-', pct: Math.abs(changePct).toFixed(1) },
              { defaultValue: '{{sign}}{{pct}}% vs last month' },
            )}
          </span>
        </div>

        <div className={cm.cn(cm.flex({ gap: 'lg' }), cm.sp('mt', 6))} style={{ flexWrap: 'wrap' }}>
          <div>
            <div
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest text-white/60 font-bold',
              )}
            >
              {t('revenueHeroCard.collected', {}, { defaultValue: 'Collected this month' })}
            </div>
            <div
              className={cm.cn(cm.fontWeight('bold'), cm.textSize('xl'))}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatCurrency(collectedCents)}
            </div>
          </div>
          <div>
            <div
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest text-white/60 font-bold',
              )}
            >
              {t('revenueHeroCard.invoicesOpen', {}, { defaultValue: 'Invoices open' })}
            </div>
            <div
              className={cm.cn(cm.fontWeight('bold'), cm.textSize('xl'))}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {invoicesOpen}
            </div>
          </div>
        </div>
      </div>

      <div className={cm.cn(cm.sp('mt', 8), cm.h(20), cm.w('full'), 'relative z-10')}>
        <svg
          className={cm.cn(cm.w('full'), cm.h('full'))}
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,80 Q40,60 80,55 T160,40 T240,28 T320,18 T400,8 L400,100 L0,100 Z"
            fill="white"
            opacity="0.18"
          />
          <path
            d="M0,80 Q40,60 80,55 T160,40 T240,28 T320,18 T400,8"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="400" cy="8" r="4" fill="var(--color-accent)" stroke="white" strokeWidth="2" />
        </svg>
      </div>

      <div
        className={cm.cn(cm.w(80), cm.h(80), cm.roundedFull)}
        style={{
          position: 'absolute',
          right: '-80px',
          bottom: '-80px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          filter: 'blur(64px)',
        }}
      />
      <div
        className={cm.cn(cm.w(20), cm.h(20), cm.roundedFull)}
        style={{
          position: 'absolute',
          right: '40px',
          top: '40px',
          backgroundColor: 'var(--color-accent-shadow)',
          filter: 'blur(32px)',
        }}
      />
    </div>
  )
}

export default RevenueHeroCard
