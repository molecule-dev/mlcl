import { getClassMap } from '@molecule/app-ui'

export interface SetEntry {
  id: string
  /** 1-based set ordinal (1, 2, 3, …). */
  setNumber: number
  /** Previous-session reference, e.g. "100 × 5". */
  previous?: string
  /** Weight value (already converted to user's unit). */
  weight?: number
  /** Display unit ("kg" or "lbs"). */
  unit?: string
  /** Reps logged. */
  reps?: number
  /** Whether this set is logged-and-confirmed. */
  completed?: boolean
  /** Whether this is the active set being worked on. */
  current?: boolean
  /** Whether this set set a new personal record. */
  isPR?: boolean
}

interface SetRowProps {
  entry: SetEntry
  /**
   * Required: invoked when the user toggles set completion. The parent
   * is responsible for the actual PATCH /workouts/:id/sets/:setId call
   * and re-fetch — SetRow only fires the callback. Without a callback
   * the checkbox is rendered disabled, never as a no-op handler.
   */
  onToggleComplete?: (next: boolean) => void
}

/**
 * One logged set on the ActiveWorkout screen — set ordinal, prior reference,
 * weight, reps, and a completion checkmark. Completed rows tint green,
 * current row tints peach with a 3px primary left-border (matches DESIGN.md
 * "Set Row" recipe verbatim).
 *
 * Bespoke to Forja — no direct sibling translation. Inspired by the
 * editorial transaction rows in personal-finance/AccountRecentTransactions.tsx.
 */
export function SetRow({ entry, onToggleComplete }: SetRowProps) {
  const cm = getClassMap()
  const unit = entry.unit ?? 'kg'
  const tone = entry.completed
    ? 'bg-set-completed border-volume-up/40'
    : entry.current
      ? 'bg-set-current border-l-[3px] border-l-primary border-outline/40'
      : 'bg-surface border-outline/30'

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 3),
        cm.sp('py', 2),
        'h-12 rounded-lg border tabular-nums',
        tone,
      )}
    >
      <span
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.fontWeight('bold'),
          'w-8 h-8 rounded-full text-on-surface-variant bg-surface-variant text-sm shrink-0',
        )}
      >
        {entry.setNumber}
      </span>
      <span className={cm.cn(cm.textSize('xs'), 'w-20 text-on-surface-variant truncate')}>
        {entry.previous ?? '—'}
      </span>
      <span
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'w-24 h-10 rounded-md border border-outline/60 bg-input-background text-on-surface font-semibold',
        )}
      >
        {entry.weight !== undefined ? `${entry.weight}` : '—'}{' '}
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant ml-1')}>{unit}</span>
      </span>
      <span
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'w-20 h-10 rounded-md border border-outline/60 bg-input-background text-on-surface font-semibold',
        )}
      >
        {entry.reps !== undefined ? `${entry.reps}` : '—'}
      </span>
      <span className={cm.cn('flex-1')} />
      {entry.isPR ? (
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 2),
            cm.sp('py', 0),
            cm.textSize('xs'),
            'rounded-full bg-pr-light text-pr-text font-bold uppercase tracking-widest',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-sm')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            local_fire_department
          </span>
          PR
        </span>
      ) : null}
      <button
        type="button"
        aria-label={entry.completed ? 'Uncheck set' : 'Mark set complete'}
        disabled={!onToggleComplete}
        onClick={onToggleComplete ? () => onToggleComplete(!entry.completed) : undefined}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'w-10 h-10 rounded-full transition-colors shrink-0',
          entry.completed
            ? 'bg-primary text-on-primary'
            : 'bg-surface-variant text-on-surface-variant hover:bg-primary/20 hover:text-primary',
        )}
      >
        <span
          aria-hidden="true"
          className={cm.cn('material-symbols-outlined')}
          style={entry.completed ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          check
        </span>
      </button>
    </div>
  )
}
