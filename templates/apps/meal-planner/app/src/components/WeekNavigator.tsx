import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { addWeeks, formatWeekRange, isCurrentWeek, weekStartOf } from '../lib/plan.js'

interface WeekNavigatorProps {
  /** Monday-ISO of the displayed week. */
  weekStart: string
  /** Called with the new Monday-ISO after prev/next/today. */
  onChange: (weekStart: string) => void
  /** Extra controls rendered inline (defaults). */
  children?: React.ReactNode
}

/**
 * Prev / range / next week stepper shared by the plan grid and the grocery
 * list. Shows a "This week" pill when the displayed week is not current.
 */
export function WeekNavigator({ weekStart, onChange, children }: WeekNavigatorProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const current = isCurrentWeek(weekStart)

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
        cm.sp('p', 2),
        'bg-surface rounded-full border border-outline shadow-sm',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
        <button
          type="button"
          data-mol-id="week-prev"
          aria-label={t('simmer.week.prevLabel', {}, { defaultValue: 'Previous week' })}
          onClick={() => onChange(addWeeks(weekStart, -1))}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-10 h-10 rounded-full text-on-surface-variant hover:bg-primary-container/50 hover:text-primary transition-colors',
          )}
        >
          <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
            chevron_left
          </span>
        </button>
        <span
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.sp('px', 2),
            'text-on-surface min-w-[7.5rem] text-center',
          )}
        >
          {formatWeekRange(weekStart)}
        </span>
        <button
          type="button"
          data-mol-id="week-next"
          aria-label={t('simmer.week.nextLabel', {}, { defaultValue: 'Next week' })}
          onClick={() => onChange(addWeeks(weekStart, 1))}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-10 h-10 rounded-full text-on-surface-variant hover:bg-primary-container/50 hover:text-primary transition-colors',
          )}
        >
          <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
            chevron_right
          </span>
        </button>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
        {children}
        {!current ? (
          <button
            type="button"
            data-mol-id="week-today"
            onClick={() => onChange(weekStartOf())}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'rounded-full bg-accent text-on-accent uppercase tracking-widest',
            )}
          >
            {t('simmer.week.today', {}, { defaultValue: 'This week' })}
          </button>
        ) : null}
      </div>
    </div>
  )
}
