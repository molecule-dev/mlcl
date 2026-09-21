/**
 * Gradient terminal-style hero card — total portfolio value in 6xl-extrabold
 * `tabular-nums`, frosted-glass change pill, area-fill sparkline traced from
 * 30-day history, decorative blurred orbs in the corners. Sits at the top of
 * the Sigil dashboard and portfolio screens.
 *
 * Translated from personal-finance/NetWorthCard.tsx (gradient + orbs +
 * sparkline anatomy) with a denser numeric treatment that matches the
 * Bloomberg-terminal mood from `DESIGN.md`.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { deltaIcon, fmtPct, fmtUsd } from '../lib/format.js'

export interface PortfolioHeroCardProps {
  totalValueUsd: number
  changePct: number
  changeUsd: number
  costBasisUsd: number
  totalPnlUsd: number
  totalPnlPct: number
  assetCount: number
  history?: number[]
}

export function PortfolioHeroCard({
  totalValueUsd,
  changePct,
  changeUsd,
  costBasisUsd,
  totalPnlUsd,
  totalPnlPct,
  assetCount,
  history = [],
}: PortfolioHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pillClass = changePct >= 0 ? 'text-success' : 'text-error'

  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        // Denser padding + smaller display number below the sm breakpoint —
        // p-10/text-6xl overflows a 390px viewport with the change pill.
        'p-5 sm:p-10',
        'min-h-[320px] bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden',
      )}
      data-mol-id="portfolio-hero"
    >
      <div className={cm.cn('relative z-10')}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-white/70',
          )}
          data-mol-id="hero-eyebrow"
        >
          {t('portfolioHeroCard.eyebrow', {}, { defaultValue: 'Total portfolio value' })}
        </p>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }), 'flex-wrap')}>
          <span
            className={cm.cn('text-4xl sm:text-6xl font-extrabold tracking-tighter tabular-nums')}
            data-mol-id="hero-value"
          >
            {fmtUsd(totalValueUsd)}
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
              pillClass,
            )}
            data-mol-id="hero-change-pill"
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              {deltaIcon(changePct)}
            </span>
            <span className="tabular-nums">{fmtPct(changePct)}</span>
            <span className="tabular-nums opacity-80">({fmtUsd(changeUsd)})</span>
          </span>
        </div>
        <dl
          className={cm.cn(
            cm.grid({ cols: 3, gap: 'lg' }),
            cm.sp('mt', 6),
            'max-w-xl text-white/80',
          )}
        >
          <HeroStat
            label={t('portfolioHeroCard.totalPnl', {}, { defaultValue: 'Total P/L' })}
            value={fmtUsd(totalPnlUsd)}
            sub={fmtPct(totalPnlPct)}
          />
          <HeroStat
            label={t('portfolioHeroCard.costBasis', {}, { defaultValue: 'Cost basis' })}
            value={fmtUsd(costBasisUsd)}
          />
          <HeroStat
            label={t('portfolioHeroCard.assetCount', {}, { defaultValue: 'Assets' })}
            value={String(assetCount)}
          />
        </dl>
      </div>

      <div
        className={cm.cn(cm.sp('mt', 8), cm.h(24), cm.w('full'), 'relative z-10 opacity-40')}
        aria-hidden="true"
      >
        <Sparkline points={history} width={600} height={96} />
      </div>

      {/* Decorative blurred orbs */}
      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-20 -bottom-24 bg-surface/10 blur-3xl',
        )}
      />
      <div
        className={cm.cn(
          cm.w(20),
          cm.h(20),
          cm.roundedFull,
          'absolute right-10 top-10 bg-surface/30 blur-xl',
        )}
      />
    </section>
  )
}

function HeroStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const cm = getClassMap()
  return (
    <div>
      <dt
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-white/60',
        )}
      >
        {label}
      </dt>
      <dd className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tabular-nums')}>
        {value}
        {sub ? (
          <span className={cm.cn(cm.textSize('xs'), cm.sp('ml', 2), 'opacity-80')}>{sub}</span>
        ) : null}
      </dd>
    </div>
  )
}

function Sparkline({ points, width, height }: { points: number[]; width: number; height: number }) {
  if (points.length < 2) return null
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width
      const y = height - ((p - min) / range) * height
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const fill = `${path} L${width},${height} L0,${height} Z`
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path d={fill} fill="white" fillOpacity="0.25" />
      <path d={path} fill="none" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}
