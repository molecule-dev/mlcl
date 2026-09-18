import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Tutor-dashboard hero — gradient backdrop, large numeric earnings value
 * (`text-6xl`), frosted-glass change pill, decorative blurred orbs and an
 * inline SVG sparkline of weekly earnings.
 *
 * Translated from personal-finance NetWorthCard.
 */

export type EarningsHeroCardProps = {
  tutorName: string
  monthLabel: string
  earningsCents: number
  changePercent: number
  trendCents: number[]
}

function formatMoney(cents: number): string {
  const dollars = cents / 100
  return dollars.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function buildSparkPath(values: number[], width: number, height: number): string {
  if (values.length === 0) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1, max - min)
  const stepX = width / Math.max(1, values.length - 1)
  return values
    .map((v, i) => {
      const x = i * stepX
      const y = height - ((v - min) / span) * height
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export function EarningsHeroCard({
  tutorName,
  monthLabel,
  earningsCents,
  changePercent,
  trendCents,
}: EarningsHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const positive = changePercent >= 0
  const sparkPath = buildSparkPath(trendCents, 320, 80)
  const sparkArea = sparkPath ? `${sparkPath} L320,80 L0,80 Z` : ''

  return (
    <section
      className={cm.cn(
        'relative overflow-hidden rounded-[2rem] text-on-primary shadow-xl',
        cm.sp('p', 10),
      )}
      style={{
        background:
          'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-primary-dark) 60%, #4338ca 100%)',
      }}
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -right-24 -bottom-24 w-80 h-80 rounded-full bg-surface/15 blur-3xl',
        )}
      />
      <div
        aria-hidden="true"
        className={cm.cn('absolute -left-12 -top-16 w-56 h-56 rounded-full blur-3xl')}
        style={{ backgroundColor: 'rgba(245, 158, 11, 0.3)' }}
      />

      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), 'relative z-10')}>
        <div className={cm.stack(2)}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'opacity-80 uppercase tracking-widest',
            )}
          >
            {t(
              'earningsHero.eyebrow',
              { month: monthLabel },
              { defaultValue: 'Earnings • {{month}}' },
            )}
          </p>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              'font-display text-5xl md:text-6xl tracking-tighter tabular-nums',
            )}
          >
            {formatMoney(earningsCents)}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'opacity-85')}>
            {t(
              'earningsHero.greeting',
              { name: tutorName },
              { defaultValue: 'Welcome back, {{name}} — keep the momentum.' },
            )}
          </p>
        </div>

        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'rounded-full px-3 py-1.5 backdrop-blur-md',
          )}
          style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>
            {positive ? 'trending_up' : 'trending_down'}
          </span>
          {t(
            'earningsHero.change',
            { percent: Math.abs(changePercent).toFixed(1), sign: positive ? '+' : '−' },
            { defaultValue: '{{sign}}{{percent}}% vs last month' },
          )}
        </span>
      </div>

      {sparkPath && (
        <svg
          aria-hidden="true"
          viewBox="0 0 320 80"
          preserveAspectRatio="none"
          className={cm.cn(cm.w('full'), cm.sp('mt', 8), 'relative z-10 h-20')}
        >
          <defs>
            <linearGradient id="earnings-spark-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          <path d={sparkArea} fill="url(#earnings-spark-fill)" />
          <path d={sparkPath} fill="none" stroke="white" strokeWidth={2} strokeLinejoin="round" />
        </svg>
      )}
    </section>
  )
}

export default EarningsHeroCard
