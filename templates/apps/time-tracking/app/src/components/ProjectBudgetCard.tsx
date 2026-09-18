import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Project tile — colored 4px-left border accent (project color),
 * uppercase client eyebrow, project name, monospace tracked hours,
 * and a budget burn-down bar that turns rose when over budget.
 *
 * Treatment translated from personal-finance's BudgetCategoryCard.tsx
 * and crm's DealCard.tsx.
 */

export interface ProjectBudgetCardProps {
  id: string
  clientName: string | null
  name: string
  color: string
  hourlyRate?: number | null
  trackedHoursLabel: string
  budgetHours?: number | null
  trackedHours: number
  billable: boolean
}

export function ProjectBudgetCard({
  id,
  clientName,
  name,
  color,
  hourlyRate,
  trackedHoursLabel,
  budgetHours,
  trackedHours,
  billable,
}: ProjectBudgetCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const budget = budgetHours ?? 0
  const pct = budget > 0 ? Math.min(Math.round((trackedHours / budget) * 100), 200) : 0
  const overBudget = pct > 100
  const barFill = Math.min(pct, 100)
  const budgetLabel = budget > 0 ? (Math.round(budget * 10) / 10).toString() : '0'

  return (
    <Link
      to={`/projects/${id}`}
      data-test={`project-row-${id}`}
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'md' }),
        cm.sp('p', 5),
        'bg-surface rounded-xl shadow-sm border-l-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
      )}
      style={{ borderLeftColor: color }}
    >
      <div className={cm.flex({ justify: 'between', align: 'start' })}>
        <div className={cm.cn('min-w-0', cm.flex1)}>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-foreground-secondary truncate',
            )}
          >
            {clientName || t('projectBudgetCard.noClient', {}, { defaultValue: 'Internal' })}
          </p>
          <p
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground truncate')}
          >
            {name}
          </p>
        </div>
        {billable && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 2),
              'h-6 rounded-full text-[10px] font-black uppercase tracking-widest bg-violet-100 text-violet-700 shrink-0',
            )}
          >
            <span className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}>
              attach_money
            </span>
            {t('projectBudgetCard.billable', {}, { defaultValue: 'Billable' })}
          </span>
        )}
      </div>

      <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
        <span
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'tabular-nums font-mono text-foreground',
          )}
        >
          {trackedHoursLabel}
        </span>
        {hourlyRate != null && (
          <span
            className={cm.cn(
              'text-[11px] uppercase tracking-widest text-foreground-secondary font-bold',
            )}
          >
            {t('projectBudgetCard.rate', { rate: hourlyRate }, { defaultValue: '${{rate}}/hr' })}
          </span>
        )}
      </div>

      {budget > 0 && (
        <div className={cm.stack(2)}>
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('xs'))}
          >
            <span className={cm.cn('text-foreground-secondary')}>
              {t(
                'projectBudgetCard.budget',
                { hours: budgetLabel },
                { defaultValue: 'Budget · {{hours}}h' },
              )}
            </span>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                overBudget ? 'text-error' : 'text-foreground',
              )}
            >
              {t(
                overBudget ? 'projectBudgetCard.pctOver' : 'projectBudgetCard.pct',
                { pct: pct.toString() },
                { defaultValue: overBudget ? '{{pct}}% — over' : '{{pct}}%' },
              )}
            </span>
          </div>
          <div
            className={cm.cn(
              'relative h-1.5 w-full rounded-full bg-surface-secondary overflow-hidden',
            )}
          >
            <div
              className={cm.cn(
                'absolute inset-y-0 left-0 rounded-full transition-all',
                overBudget ? 'bg-rose-500' : 'bg-emerald-500',
              )}
              style={{ width: `${barFill}%` }}
            />
            {overBudget && (
              <div
                className={cm.cn('absolute inset-y-0 right-0 bg-rose-700/40')}
                style={{ width: `${pct - 100}%`, maxWidth: '100%' }}
              />
            )}
          </div>
        </div>
      )}
    </Link>
  )
}

export default ProjectBudgetCard
