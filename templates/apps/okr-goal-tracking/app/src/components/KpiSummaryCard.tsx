import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface KpiSummaryCardProps {
  /** Material Symbols Outlined glyph name. */
  icon: string
  /** Localised label rendered as eyebrow caps. */
  label: string
  /** Big tabular-nums value. */
  value: string | number
  /** Optional trend caption + direction. */
  trend?: { label: string; direction: 'up' | 'down' | 'flat' }
  /** Drives left border accent + icon tint. */
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
  className?: string
}

/** The tone's accent color: the inset bar and the label (DESIGN.md → "Accent bars"). */
const TONE_ACCENT: Record<NonNullable<KpiSummaryCardProps['tone']>, string> = {
  // 700/800/600 stops: the accent doubles as the 11px uppercase label's
  // text color (accentCardLabel tone custom), and the 500 stops fail the
  // 4.5:1 AA floor on the card background (axe serious on the a11y gate).
  primary: 'var(--color-primary)',
  success: 'var(--color-emerald-700)',
  warning: 'var(--color-amber-800)',
  danger: 'var(--color-red-700)',
  neutral: 'var(--color-slate-600)',
}

const TONE_ICON_BG: Record<NonNullable<KpiSummaryCardProps['tone']>, string> = {
  primary: 'bg-primary-fixed text-primary',
  success: 'bg-success-light text-success-text',
  warning: 'bg-warning-light text-warning',
  danger: 'bg-error-light text-error',
  neutral: 'bg-surface-secondary text-foreground-secondary',
}

/**
 * Top-of-dashboard KPI tile — icon chip, eyebrow label, big value, trend
 * footer. Translated from project-management/KpiCard.tsx (left-edge
 * elevation pattern) and crm/KpiCard.tsx (tone palette), adapted to OKR
 * brand cadence (uppercase 10px caps, tabular-nums values).
 */
export function KpiSummaryCard({
  icon,
  label,
  value,
  trend,
  tone = 'primary',
  className,
}: KpiSummaryCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const trendColor =
    trend?.direction === 'up'
      ? 'text-success-text'
      : trend?.direction === 'down'
        ? 'text-error'
        : 'text-on-surface-variant'
  const trendIcon =
    trend?.direction === 'up'
      ? 'trending_up'
      : trend?.direction === 'down'
        ? 'trending_down'
        : 'trending_flat'

  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        cm.stack(3),
        cm.accentCard({ tone: 'custom' }),
        'bg-surface-container-lowest rounded-xl shadow-sm hover:-translate-y-0.5 transition-transform duration-200',
        className,
      )}
      style={{ ['--mol-accent' as string]: TONE_ACCENT[tone] }}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'material-symbols-outlined w-10 h-10 rounded-lg text-[22px]',
            TONE_ICON_BG[tone],
          )}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
        {trend && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-wider tabular-nums',
              trendColor,
            )}
          >
            <span className="material-symbols-outlined text-[14px]">{trendIcon}</span>
            {trend.label}
          </span>
        )}
      </div>
      <span className={cm.accentCardLabel({ tone: 'custom' })}>{label}</span>
      <p
        className={cm.cn('font-extrabold tracking-tight tabular-nums text-on-surface', 'text-3xl')}
      >
        {value}
      </p>
      <span className="sr-only">
        {t('kpiSummaryCard.srLabel', { label, value }, { defaultValue: '{{label}}: {{value}}' })}
      </span>
    </div>
  )
}

export default KpiSummaryCard
