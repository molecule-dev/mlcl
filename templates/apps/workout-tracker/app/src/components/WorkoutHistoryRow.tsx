import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { type MuscleGroup, MuscleGroupBadge } from './MuscleGroupBadge.js'

export interface WorkoutHistoryEntry {
  id: string
  /** Workout title, e.g. "Push Day A" or "Heavy Squats". */
  name: string
  /** Human-readable date — already formatted upstream. */
  date: string
  /** Total volume in kg or lbs. */
  totalVolume: number
  /** Display unit. */
  unit?: string
  /** Duration in minutes. */
  durationMin: number
  /** Sets logged. */
  sets: number
  /** Number of personal records set in this workout. */
  newPRs?: number
  /** Primary muscle groups trained. */
  muscleGroups: MuscleGroup[]
}

interface WorkoutHistoryRowProps {
  entry: WorkoutHistoryEntry
}

/**
 * Editorial workout-history row — workout name + date on the left, total
 * volume (extrabold tabular-num), duration pill, sets count, optional PR
 * pill, and a row of muscle-group pills. Hover lifts the whole row to the
 * surface-container-low surface.
 *
 * Translated from crm/blog ActivityRow.tsx + personal-finance
 * AccountRecentTransactions.tsx editorial table style.
 */
export function WorkoutHistoryRow({ entry }: WorkoutHistoryRowProps) {
  const cm = getClassMap()
  const unit = entry.unit ?? 'kg'

  return (
    <Link
      to={`/history/${entry.id}`}
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'sm' }),
        cm.sp('p', 5),
        'rounded-xl bg-surface border border-outline/40 hover:border-primary/40 hover:bg-surface-variant/40 transition-colors group',
      )}
    >
      <header
        className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-[0.22em] text-on-surface-variant',
            )}
          >
            {entry.date}
          </span>
          <h3
            className={cm.cn(
              'text-xl font-bold text-on-surface tracking-tight group-hover:text-primary transition-colors',
            )}
          >
            {entry.name}
          </h3>
        </div>
        <div className={cm.cn(cm.flex({ direction: 'col', align: 'end' }))}>
          <span
            className={cm.cn('text-2xl font-extrabold text-on-surface tabular-nums leading-none')}
          >
            {entry.totalVolume.toLocaleString()}{' '}
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant uppercase tracking-widest font-bold',
              )}
            >
              {unit}
            </span>
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant mt-1 uppercase tracking-widest font-bold',
            )}
          >
            Total volume
          </span>
        </div>
      </header>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            'rounded-full bg-surface-variant text-on-surface-variant font-semibold tabular-nums',
          )}
        >
          <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-sm')}>
            schedule
          </span>
          {entry.durationMin} min
        </span>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            'rounded-full bg-surface-variant text-on-surface-variant font-semibold tabular-nums',
          )}
        >
          <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-sm')}>
            fitness_center
          </span>
          {entry.sets} sets
        </span>
        {entry.newPRs && entry.newPRs > 0 ? (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              'rounded-full bg-pr-light text-pr-text font-bold uppercase tracking-widest tabular-nums',
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-sm')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_fire_department
            </span>
            {entry.newPRs} PR{entry.newPRs === 1 ? '' : 's'}
          </span>
        ) : null}
        <span className={cm.cn('flex-1')} />
        <div className={cm.flex({ gap: 'xs' })}>
          {entry.muscleGroups.map((g) => (
            <MuscleGroupBadge key={g} group={g} compact />
          ))}
        </div>
      </div>
    </Link>
  )
}
