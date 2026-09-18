import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface KpiStatCardProps {
  label: string
  value: string
  trend?: {
    direction: 'up' | 'down' | 'flat'
    label: string
  }
  /** Material Symbol icon name (e.g. 'rocket_launch'). */
  icon?: string
  accent?: 'primary' | 'accent' | 'warning' | 'tertiary'
  /** Optional 30-point sparkline series (rendered as inline SVG). */
  sparkline?: ReadonlyArray<number>
}

const ACCENT_BORDER: Record<NonNullable<KpiStatCardProps['accent']>, string> = {
  primary: 'border-l-primary',
  accent: 'border-l-accent',
  warning: 'border-l-warning',
  tertiary: 'border-l-tertiary',
}

const ACCENT_BG: Record<NonNullable<KpiStatCardProps['accent']>, string> = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/10 text-accent',
  warning: 'bg-warning/10 text-warning',
  tertiary: 'bg-tertiary/10 text-tertiary',
}

/**
 * KPI tile — 4-column dashboard summary card with left-edge accent stripe,
 * uppercase 10px label, extrabold value, optional trend pill, optional
 * Material icon chip, optional inline-SVG sparkline.
 *
 * Translated from personal-finance/SavingsRateCard.tsx + crm/KpiCard.tsx.
 */
export function KpiStatCard({
  label,
  value,
  trend,
  icon,
  accent = 'primary',
  sparkline,
}: KpiStatCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const trendColor =
    trend?.direction === 'up'
      ? 'text-success'
      : trend?.direction === 'down'
        ? 'text-error'
        : 'text-on-surface-variant'
  const trendIcon =
    trend?.direction === 'up'
      ? 'trending_up'
      : trend?.direction === 'down'
        ? 'trending_down'
        : 'trending_flat'

  const sparklinePath = (() => {
    if (!sparkline || sparkline.length < 2) return null
    const W = 100,
      H = 30
    const min = Math.min(...sparkline),
      max = Math.max(...sparkline)
    const range = max - min || 1
    const pts = sparkline.map((v, i) => {
      const x = (i / (sparkline.length - 1)) * W
      const y = H - ((v - min) / range) * (H - 4) - 2
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    return pts.join(' ')
  })()

  return (
    <article
      className={cm.cn(
        cm.sp('p', 5),
        'rounded-lg border-l-4 bg-surface-container-lowest shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-transform',
        ACCENT_BORDER[accent],
      )}
      data-mol-id={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className={cm.cn(cm.flex({ align: 'start', justify: 'between' }), cm.sp('mb', 4))}>
        <span
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {label}
        </span>
        {icon && (
          <span className={cm.cn(cm.sp('p', 2), 'rounded-lg', ACCENT_BG[accent])}>
            <span
              className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}
              aria-hidden="true"
            >
              {icon}
            </span>
          </span>
        )}
      </div>
      <p
        className={cm.cn(
          cm.textSize('3xl'),
          'font-extrabold tabular-nums tracking-tight text-on-surface',
        )}
      >
        {value}
      </p>
      {trend && (
        <p
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            cm.sp('mt', 2),
            trendColor,
          )}
        >
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
            aria-hidden="true"
          >
            {trendIcon}
          </span>
          {t('kpiStatCard.trend', { label: trend.label }, { defaultValue: '{{label}}' })}
        </p>
      )}
      {sparklinePath && (
        <svg
          className={cm.cn(
            cm.w('full'),
            'mt-3 stroke-current opacity-70',
            `text-${accent === 'primary' ? 'primary' : accent}`,
          )}
          viewBox="0 0 100 30"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={sparklinePath} fill="none" strokeWidth={2} strokeLinecap="round" />
        </svg>
      )}
    </article>
  )
}

export default KpiStatCard
