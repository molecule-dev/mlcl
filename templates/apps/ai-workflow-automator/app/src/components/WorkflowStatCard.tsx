/**
 * KPI card — uppercase eyebrow label, large value, trend delta, accent icon
 * tile, hover-lift micro-interaction.
 *
 * Translated from personal-finance's DashboardAccountOverview KPI cards plus
 * the Material 3 surface-container ladder used by banking-dashboard.
 */
import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface WorkflowStatCardProps {
  label: string
  value: ReactNode
  /** Optional sublabel rendered below the value (e.g. "this week"). */
  caption?: string
  /** Material Symbols glyph for the icon tile. */
  icon: string
  /** Accent CSS color — use CSS vars from the brand palette (e.g. var(--color-node-trigger), var(--color-node-condition), var(--color-node-action), var(--color-primary)). */
  accent?: string
  /** Trend value with sign-driven color (positive/green, negative/red). */
  trend?: { value: string; direction: 'up' | 'down' | 'flat' }
}

export function WorkflowStatCard({
  label,
  value,
  caption,
  icon,
  accent = 'var(--color-node-trigger)',
  trend,
}: WorkflowStatCardProps) {
  const cm = getClassMap()

  const trendColor =
    trend?.direction === 'up'
      ? 'var(--color-run-completed-fg)'
      : trend?.direction === 'down'
        ? 'var(--color-status-failure)'
        : 'var(--color-status-muted-fg)'
  const trendArrow =
    trend?.direction === 'up'
      ? 'arrow_upward'
      : trend?.direction === 'down'
        ? 'arrow_downward'
        : 'remove'

  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        cm.accentCard({ tone: 'custom' }),
        'rounded-xl bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md overflow-hidden',
      )}
      style={{
        border: '1px solid var(--color-border)',
        // The accent bar (DESIGN.md → "Accent bars") reads this variable.
        ['--mol-accent' as string]: accent,
      }}
    >
      <div className={cm.cn(cm.flex({ align: 'start', justify: 'between' }), cm.sp('mb', 3))}>
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'rounded-xl')}
          style={{
            width: 44,
            height: 44,
            background: `color-mix(in srgb, ${accent} 12%, transparent)`,
          }}
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}
            style={{ color: accent }}
          >
            {icon}
          </span>
        </div>
        {trend && (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
            )}
            style={{ color: trendColor }}
          >
            <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>
              {trendArrow}
            </span>
            {trend.value}
          </div>
        )}
      </div>
      <div className={cm.cn(cm.accentCardLabel({ tone: 'custom' }), cm.sp('mb', 1))}>{label}</div>
      <div
        className={cm.cn('text-3xl font-extrabold tracking-tight', cm.sp('mb', 1))}
        style={{ color: 'var(--color-foreground)' }}
      >
        {value}
      </div>
      {caption && <div className={cm.cn(cm.textSize('xs'), cm.textMuted)}>{caption}</div>}
    </div>
  )
}
