import { getClassMap } from '@molecule/app-ui'

export interface CalciteKpiTileProps {
  /** Material Symbol glyph name (e.g. `grid_on`, `bolt`, `function`). */
  icon: string
  /** Color accent — drives top-border + icon background. */
  accent?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  /** Tile label (small uppercase tracking-widest). */
  label: string
  /** Big metric value. */
  value: string | number
  /** Status pill copy (right-aligned, top-right). */
  status?: string
  /** Status pill tint. Defaults to `accent`. */
  statusAccent?: CalciteKpiTileProps['accent']
  /** Optional supporting line under the value. */
  hint?: string
}

const ACCENT_BORDER: Record<NonNullable<CalciteKpiTileProps['accent']>, string> = {
  primary: 'border-primary',
  success: 'border-emerald-500',
  warning: 'border-amber-500',
  error: 'border-error',
  info: 'border-violet-500',
}

const ACCENT_BG: Record<NonNullable<CalciteKpiTileProps['accent']>, string> = {
  primary: 'bg-primary-fixed text-primary',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  error: 'bg-error-container text-error',
  info: 'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300',
}

const STATUS_TEXT: Record<NonNullable<CalciteKpiTileProps['accent']>, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  info: 'text-violet-600 dark:text-violet-300',
}

/**
 * Calcite dashboard KPI tile — left-bordered card with type icon chip,
 * uppercase 10px label, extrabold value, hover lift.
 *
 * Translated from project-management's KpiCard.tsx but adapted to the
 * Calcite blue/emerald palette and the data-grid icon vocabulary.
 */
export function CalciteKpiTile({
  icon,
  accent = 'primary',
  label,
  value,
  status,
  statusAccent,
  hint,
}: CalciteKpiTileProps) {
  const cm = getClassMap()
  const statusColor = STATUS_TEXT[statusAccent ?? accent]
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-xl border-t-4 shadow-sm hover:-translate-y-0.5 transition-transform duration-300',
        ACCENT_BORDER[accent],
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <span
          className={cm.cn(
            cm.sp('p', 2),
            'material-symbols-outlined rounded-lg',
            ACCENT_BG[accent],
          )}
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          {icon}
        </span>
        {status && (
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), statusColor)}>
            {status}
          </span>
        )}
      </div>
      <p
        className={cm.cn(
          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
          cm.sp('mb', 2),
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(
          cm.textSize('4xl'),
          'font-extrabold tracking-tight text-on-surface tabular-nums',
        )}
      >
        {value}
      </p>
      {hint && (
        <p className={cm.cn(cm.sp('mt', 2), cm.textSize('xs'), 'text-on-surface-variant')}>
          {hint}
        </p>
      )}
    </div>
  )
}
