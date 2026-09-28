import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Compact KPI card with the inset accent bar, uppercase label in its color, and
 * extrabold value. Hover lifts the card slightly. Used in the metric
 * triad/quad above the dashboard activity feed.
 *
 * Translated from personal-finance's DashboardAccountOverview pattern,
 * narrowed to a single-stat editorial card.
 */
export interface WritingStatCardProps {
  /** Translation key — the i18n key used for the label fallback. */
  labelKey: string
  /** English fallback shown if no translation exists. */
  labelDefault: string
  /** Pre-formatted display value (e.g. "12,400" or "92"). */
  value: string
  /** Optional secondary suffix (e.g. "/100"). */
  suffix?: string
  /** Material Symbols Outlined glyph. */
  icon: string
  /**
   * Accent color: `primary` for documents, `secondary` for SEO/score-related,
   * `success` for published, `info` for readability. Drives the accent bar,
   * the label and the icon tint.
   */
  tone?: 'primary' | 'secondary' | 'success' | 'info'
  /** Optional trend pill (e.g. "+12%"). Renders only when provided. */
  trend?: string
  /** Whether the trend is positive. Defaults to true. */
  trendPositive?: boolean
}

const TONE_CLASS: Record<
  NonNullable<WritingStatCardProps['tone']>,
  { accent: string; icon: string }
> = {
  primary: { accent: 'var(--color-primary)', icon: 'text-primary' },
  secondary: { accent: 'var(--color-secondary)', icon: 'text-secondary' },
  success: { accent: 'var(--color-success)', icon: 'text-success' },
  info: { accent: 'var(--color-info)', icon: 'text-info' },
}

export function WritingStatCard({
  labelKey,
  labelDefault,
  value,
  suffix,
  icon,
  tone = 'primary',
  trend,
  trendPositive = true,
}: WritingStatCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const toneClass = TONE_CLASS[tone]
  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        cm.accentCard({ tone: 'custom' }),
        'bg-surface-container-lowest rounded-xl shadow-sm transition-transform hover:-translate-y-0.5',
      )}
      style={{ ['--mol-accent' as string]: toneClass.accent }}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.accentCardLabel({ tone: 'custom' }),
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-base', toneClass.icon)}
            aria-hidden="true"
          >
            {icon}
          </span>
          {t(labelKey, {}, { defaultValue: labelDefault })}
        </span>
        {trend ? (
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('px', 2),
              cm.roundedFull,
              'text-[10px] py-0.5',
              trendPositive
                ? 'bg-success-container text-on-success-container'
                : 'bg-error-container text-on-error-container',
            )}
          >
            {trend}
          </span>
        ) : null}
      </div>
      <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }))}>
        <span className={cm.cn('text-3xl font-extrabold tracking-tight text-on-surface')}>
          {value}
        </span>
        {suffix ? <span className={cm.cn(cm.textSize('sm'), cm.textMuted)}>{suffix}</span> : null}
      </div>
    </div>
  )
}

export default WritingStatCard
