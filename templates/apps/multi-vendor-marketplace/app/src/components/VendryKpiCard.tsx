import { getClassMap } from '@molecule/app-ui'

export type VendryKpiTone = 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'

interface VendryKpiCardProps {
  /** Material Symbols Outlined glyph name. */
  icon: string
  /** Uppercase eyebrow label. */
  label: string
  /** Big stat value (numeric, currency, percent — pre-formatted). */
  value: string
  /** Trend pill text, e.g. "+12.4%" or "−$48.10". */
  trend?: string
  /** Trend direction; defaults to neutral if omitted. */
  trendDirection?: 'up' | 'down' | 'flat'
  /** Optional caption beneath the value. */
  caption?: string
  /** Color tone for the icon chip + accent. */
  tone?: VendryKpiTone
}

const toneToTokens: Record<VendryKpiTone, { iconBg: string; iconText: string; accent: string }> = {
  primary: { iconBg: 'bg-primary/10', iconText: 'text-primary', accent: 'border-primary' },
  secondary: { iconBg: 'bg-secondary/10', iconText: 'text-secondary', accent: 'border-secondary' },
  info: { iconBg: 'bg-info/10', iconText: 'text-info', accent: 'border-info' },
  success: { iconBg: 'bg-success/10', iconText: 'text-success', accent: 'border-success' },
  warning: { iconBg: 'bg-warning/10', iconText: 'text-warning', accent: 'border-warning' },
  error: { iconBg: 'bg-error/10', iconText: 'text-error', accent: 'border-error' },
}

/**
 * Vendor-dashboard KPI card — left-accent border, uppercase 10px label,
 * 3xl extrabold value, hover lift, optional trend pill.
 *
 * Translated from online-store's AdminDashboardKpiGrid card pattern,
 * normalized into a single reusable component with brand tone tokens.
 */
export function VendryKpiCard({
  icon,
  label,
  value,
  trend,
  trendDirection = 'flat',
  caption,
  tone = 'primary',
}: VendryKpiCardProps) {
  const cm = getClassMap()
  const tokens = toneToTokens[tone]
  const trendClass =
    trendDirection === 'up'
      ? 'bg-success/10 text-success'
      : trendDirection === 'down'
        ? 'bg-error/10 text-error'
        : 'bg-surface-container text-on-surface-variant'
  const trendIcon =
    trendDirection === 'up'
      ? 'trending_up'
      : trendDirection === 'down'
        ? 'trending_down'
        : 'trending_flat'

  return (
    <article
      className={cm.cn(
        cm.sp('p', 6),
        'group relative overflow-hidden rounded-2xl border border-outline-variant bg-surface transition-all hover:shadow-md hover:-translate-y-0.5',
      )}
      style={{ borderLeftWidth: '4px' }}
      data-tone={tone}
    >
      <div
        className={cm.cn('absolute left-0 top-0 bottom-0 w-1', tokens.accent)}
        style={{ backgroundColor: 'currentColor', color: 'inherit' }}
        aria-hidden
      />
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <div className={cm.cn(cm.sp('p', 2), 'rounded-xl', tokens.iconBg, tokens.iconText)}>
          <span className="material-symbols-outlined" aria-hidden>
            {icon}
          </span>
        </div>
        {trend && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.roundedFull,
              trendClass,
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden>
              {trendIcon}
            </span>
            {trend}
          </span>
        )}
      </div>
      <p
        className={cm.cn(
          cm.fontWeight('bold'),
          'text-[10px] uppercase tracking-widest text-on-surface-variant font-black',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(
          cm.fontWeight('bold'),
          'text-3xl mt-1 text-on-surface tabular-nums font-extrabold tracking-tight',
        )}
      >
        {value}
      </p>
      {caption && (
        <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {caption}
        </p>
      )}
    </article>
  )
}

export default VendryKpiCard
