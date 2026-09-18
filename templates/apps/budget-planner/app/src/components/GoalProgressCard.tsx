/**
 * Savings-goal card — name, saved/target, percentage chip, progress bar,
 * monthly contribution + target date footnote. Tonal hover lift.
 *
 * Translated from personal-finance's SavingGoalCard / VacationGoalCard
 * treatment — kept the right-aligned percentage chip and 6px-rounded-full
 * progress bar with goal-state color coding (met / partial / unstarted).
 */

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMoney, getCurrency } from '../lib/format.js'

export interface Goal {
  id: string
  name: string
  target_cents: number
  saved_cents: number
  monthly_contribution_cents: number
  target_date: string | null
  category_name: string
}

interface GoalProgressCardProps {
  goal: Goal
}

function fmt(cents: number): string {
  return formatMoney(cents, getCurrency(), { fractionDigits: 0 })
}

function fmtDate(iso: string | null, t: ReturnType<typeof useTranslation>['t']): string {
  if (!iso) return t('goalProgressCard.openEnded', {}, { defaultValue: 'No deadline' })
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

export function GoalProgressCard({ goal }: GoalProgressCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const percent =
    goal.target_cents === 0
      ? 0
      : Math.min(100, Math.round((goal.saved_cents / goal.target_cents) * 100))
  const met = percent >= 100
  const unstarted = goal.saved_cents === 0
  const barColor = met ? 'bg-success' : unstarted ? 'bg-outline-variant' : 'bg-secondary'
  const chipColor = met
    ? 'bg-success/15 text-success'
    : unstarted
      ? 'bg-surface-container text-on-surface-variant'
      : 'bg-secondary/15 text-secondary'

  return (
    <Link
      to={`/goals/${goal.id}`}
      className={cm.cn(
        cm.sp('p', 6),
        'block bg-surface-container-lowest rounded-2xl shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all group',
      )}
      data-mol-id={`goal-card-${goal.id}`}
    >
      <div className={cm.flex({ align: 'start', justify: 'between', gap: 'md' })}>
        <div className={cm.cn('min-w-0 flex-1')}>
          <p
            className={cm.cn(
              cm.fontWeight('extrabold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {goal.category_name}
          </p>
          <h3
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'text-on-surface group-hover:text-primary transition-colors',
            )}
          >
            {goal.name}
          </h3>
        </div>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            'text-[10px] font-black uppercase tracking-widest tabular-nums',
            chipColor,
          )}
        >
          {t('goalProgressCard.percent', { percent }, { defaultValue: '{{percent}}%' })}
        </span>
      </div>
      <div className={cm.cn(cm.sp('mt', 5), 'space-y-2')}>
        <div className={cm.flex({ align: 'baseline', justify: 'between', gap: 'sm' })}>
          <span
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('extrabold'),
              'tabular-nums tracking-tight',
            )}
          >
            {fmt(goal.saved_cents)}
          </span>
          <span className={cm.cn(cm.textSize('sm'), 'tabular-nums text-on-surface-variant')}>
            {t(
              'goalProgressCard.of',
              { amount: fmt(goal.target_cents) },
              { defaultValue: 'of {{amount}}' },
            )}
          </span>
        </div>
        <div className={cm.cn('h-1.5 w-full rounded-full bg-surface-container overflow-hidden')}>
          <div
            className={cm.cn('h-full rounded-full transition-all', barColor)}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <div
        className={cm.cn(
          cm.sp('mt', 4),
          cm.flex({ align: 'center', justify: 'between' }),
          cm.textSize('xs'),
          'text-on-surface-variant',
        )}
      >
        <span className={cm.flex({ align: 'center', gap: 'xs' })}>
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
            aria-hidden="true"
          >
            savings
          </span>
          {t(
            'goalProgressCard.monthly',
            { amount: fmt(goal.monthly_contribution_cents) },
            { defaultValue: '{{amount}}/mo' },
          )}
        </span>
        <span className={cm.flex({ align: 'center', gap: 'xs' })}>
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
            aria-hidden="true"
          >
            event
          </span>
          {fmtDate(goal.target_date, t)}
        </span>
      </div>
    </Link>
  )
}
