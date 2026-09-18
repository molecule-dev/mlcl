import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface SiftStatsCardProps {
  label: string
  value: ReactNode
  /** Material symbol icon name. */
  icon: string
  /** Tone for the icon chip (defaults to primary). */
  tone?: 'primary' | 'amber' | 'emerald' | 'red' | 'purple' | 'cyan'
  /** Trend caption shown below the value (e.g. "+12% vs yesterday"). */
  trend?: { direction: 'up' | 'down' | 'neutral'; label: string }
  /** Optional secondary string after the value (e.g. "items"). */
  unit?: string
  /** Optional foot bar (used by Queue Volume) — fraction in [0, 1]. */
  bar?: number
  /** Highlight as the brand-accented card with a subtle gradient. */
  accented?: boolean
}

const TONE_CHIP: Record<NonNullable<SiftStatsCardProps['tone']>, { bg: string; text: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
  amber: { bg: 'bg-amber-500/10', text: 'text-warning' },
  emerald: { bg: 'bg-emerald-600/10', text: 'text-success' },
  red: { bg: 'bg-red-600/10', text: 'text-error' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-500' },
}

const TREND_TEXT: Record<'up' | 'down' | 'neutral', string> = {
  up: 'text-success',
  down: 'text-error',
  neutral: 'text-on-surface-variant',
}

const TREND_ICON: Record<'up' | 'down' | 'neutral', string> = {
  up: 'trending_up',
  down: 'trending_down',
  neutral: 'trending_flat',
}

/**
 * Branded KPI card — rounded surface, uppercase tracked label, bold numeric
 * value, tinted icon chip, optional trend indicator and progress bar.
 *
 * Used at the top of Dashboard, Analytics, and Queue.
 */
export function SiftStatsCard({
  label,
  value,
  icon,
  tone = 'primary',
  trend,
  unit,
  bar,
  accented,
}: SiftStatsCardProps) {
  const cm = getClassMap()
  const chip = TONE_CHIP[tone]
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm transition-transform hover:-translate-y-0.5',
      )}
    >
      {accented && (
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent z-0',
          )}
        />
      )}
      <div className={cm.cn('relative z-10')}>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
          <span
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label',
            )}
          >
            {label}
          </span>
          <span
            aria-hidden="true"
            className={cm.cn(
              'material-symbols-outlined p-2 rounded-full text-[20px]',
              chip.bg,
              chip.text,
            )}
            data-icon={icon}
          >
            {icon}
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'baseline' }), 'gap-2')}>
          <span
            className={cm.cn(
              'text-3xl font-extrabold text-on-surface font-headline tracking-tight tabular-nums',
            )}
          >
            {value}
          </span>
          {unit && (
            <span className={cm.cn('text-sm font-medium text-on-surface-variant')}>{unit}</span>
          )}
        </div>
        {trend && (
          <p
            className={cm.cn(
              cm.flex({ align: 'center' }),
              'text-xs font-medium mt-4 gap-1',
              TREND_TEXT[trend.direction],
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-[14px]')}>
              {TREND_ICON[trend.direction]}
            </span>
            {trend.label}
          </p>
        )}
        {typeof bar === 'number' && (
          <div
            className={cm.cn(
              'mt-4 h-1 w-full bg-surface-container-high rounded-full overflow-hidden',
            )}
          >
            <div
              className={cm.cn('h-full rounded-full')}
              style={{
                width: `${Math.max(0, Math.min(1, bar)) * 100}%`,
                backgroundColor: tone === 'amber' ? 'var(--color-warning)' : 'var(--color-primary)',
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
