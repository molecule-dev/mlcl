import { useNavigate } from 'react-router'

import { useTranslation, type UseTranslationResult } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

interface Goal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  icon: string
  color: string
  status: string
  monthly_contribution?: number
}

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string }> = {
  '#059669': { bg: 'bg-success-light', text: 'text-success', ring: 'text-success' },
  '#3b82f6': { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'text-blue-600' },
  '#f59e0b': { bg: 'bg-warning-light', text: 'text-warning', ring: 'text-warning' },
  '#8b5cf6': { bg: 'bg-purple-50', text: 'text-purple-700', ring: 'text-purple-600' },
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function getMonthlyContribution(goal: Goal, t: UseTranslationResult['t']): string {
  if (goal.monthly_contribution && goal.monthly_contribution > 0) {
    return t(
      'goalCard.monthlyAmount',
      { amount: formatCurrency(goal.monthly_contribution) },
      { defaultValue: '{{amount}}/mo' },
    )
  }
  if (goal.target_date && goal.current_amount < goal.target_amount) {
    const remaining = goal.target_amount - goal.current_amount
    const monthsLeft = Math.max(
      1,
      Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)),
    )
    return t(
      'goalCard.monthlyAmount',
      { amount: formatCurrency(remaining / monthsLeft) },
      { defaultValue: '{{amount}}/mo' },
    )
  }
  return t(
    'goalCard.monthlyAmount',
    { amount: formatCurrency(0) },
    { defaultValue: '{{amount}}/mo' },
  )
}

/**
 * Format a date as one 'Nov 2025' string.
 *
 * One value, not separate `{{month}}`/`{{year}}`, because GoalCard.tsx renders
 * this same `goalCard.estimatedDate` key with `{{date}}` — and that is the shape
 * all 78 translations hold. Passing month/year here made every non-English
 * locale render the literal text `{{date}}`. It is also better i18n: month/year
 * order is locale-specific, so the formatter should decide it, not a template.
 *
 * @param date - The date to format.
 * @returns The abbreviated month and full year.
 */
function shortMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function getEstimatedDate(goal: Goal, t: UseTranslationResult['t']): string {
  if (goal.monthly_contribution && goal.monthly_contribution > 0) {
    const remaining = goal.target_amount - goal.current_amount
    if (remaining <= 0) return t('goalCard.complete', {}, { defaultValue: 'Complete!' })
    const months = Math.ceil(remaining / goal.monthly_contribution)
    const date = new Date()
    date.setMonth(date.getMonth() + months)
    return t('goalCard.estimatedDate', { date: shortMonthYear(date) }, { defaultValue: '{{date}}' })
  }
  if (goal.target_date) {
    return t(
      'goalCard.estimatedDate',
      { date: shortMonthYear(new Date(goal.target_date)) },
      { defaultValue: '{{date}}' },
    )
  }
  return t('goalCard.targetDateUnknown', {}, { defaultValue: 'TBD' })
}

function DynamicGoalCard({ goal, onDelete }: { goal: Goal; onDelete?: (id: string) => void }) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const navigate = useNavigate()
  const pct = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
  const circumference = 2 * Math.PI * 34
  const offset = circumference - (pct / 100) * circumference
  const colors = COLOR_MAP[goal.color] || COLOR_MAP['#059669']

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={goal.name}
      className={cm.cn(
        cm.sp('p', 8),
        cm.cursorPointer,
        'rounded-3xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden',
      )}
      onClick={(e) => {
        // ConfirmButton omits DOM handlers, so the delete control can't stop
        // propagation itself — ignore any click originating from it here.
        if ((e.target as HTMLElement).closest('button')) return
        navigate(`/goals/${goal.id}`)
      }}
      onKeyDown={(e) => {
        // Ignore keys bubbling from the inner delete button.
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate(`/goals/${goal.id}`)
        }
      }}
    >
      {onDelete && (
        <ConfirmButton
          data-mol-id="goals-grid-goal-delete"
          aria-label={t('common.delete', {}, { defaultValue: 'Delete' })}
          label="×"
          confirmLabel={t(
            'goalsGrid.deleteConfirm',
            { name: goal.name },
            { defaultValue: 'Delete the goal "{{name}}"?' },
          )}
          onConfirm={() => onDelete(goal.id)}
          disarmSeconds={5}
          size="sm"
          color="error"
          variant="ghost"
          className={cm.cn(
            cm.position('absolute'),
            cm.sp('p', 2),
            cm.textSize('xs'),
            'top-2 right-2 z-20 rounded-lg text-on-surface-variant hover:bg-surface-container-highest',
          )}
        />
      )}
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), 'relative z-10')}>
        <div className={cm.flex({ gap: 'lg' })}>
          <div
            className={cm.cn(
              cm.w(14),
              cm.h(14),
              cm.flex({ align: 'center', justify: 'center' }),
              colors.bg,
              colors.text,
              'rounded-2xl',
            )}
          >
            <span className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined')}>
              {goal.icon || 'savings'}
            </span>
          </div>
          <div>
            <h3
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                cm.sp('mb', 1),
                'text-on-surface',
              )}
            >
              {goal.name}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {formatCurrency(goal.current_amount)}{' '}
              <span className={cm.cn('text-foreground-tertiary')}>
                {t(
                  'goalCard.targetAmount',
                  { amount: formatCurrency(goal.target_amount) },
                  { defaultValue: '/ {{amount}}' },
                )}
              </span>
            </p>
          </div>
        </div>
        <div className={cm.cn(cm.w(20), cm.h(20), 'relative')}>
          <svg className={cm.cn(cm.w('full'), cm.h('full'), 'transform -rotate-90')}>
            <circle
              className={cm.cn('text-foreground-tertiary')}
              cx="40"
              cy="40"
              fill="transparent"
              r="34"
              stroke="currentColor"
              strokeWidth="6"
            />
            <circle
              className={colors.ring}
              cx="40"
              cy="40"
              fill="transparent"
              r="34"
              stroke="currentColor"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeWidth="6"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className={cm.cn(cm.center, 'absolute inset-0')}>
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), colors.text)}>
              {t('goalCard.percentage', { pct }, { defaultValue: '{{pct}}%' })}
            </span>
          </div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.sp('mt', 8),
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('pt', 6),
          'border-t border-surface-container-high',
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
              'text-[10px] uppercase tracking-wider text-foreground-tertiary',
            )}
          >
            {t('goalCard.monthlyContributionLabel', {}, { defaultValue: 'Monthly Contribution' })}
          </p>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), colors.text)}>
            {getMonthlyContribution(goal, t)}
          </p>
        </div>
        <div className={cm.textRight}>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
              'text-[10px] uppercase tracking-wider text-foreground-tertiary',
            )}
          >
            {t('goalCard.estimatedDateLabel', {}, { defaultValue: 'Estimated Date' })}
          </p>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
            {getEstimatedDate(goal, t)}
          </p>
        </div>
      </div>
    </div>
  )
}

function GoalsBentoGrid({ goals, onDelete }: { goals: Goal[]; onDelete?: (id: string) => void }) {
  const cm = getClassMap()
  if (!goals.length) return null
  return (
    <section className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), cm.sp('mb', 16), 'md:grid-cols-2')}>
      {goals.map((goal) => (
        <DynamicGoalCard key={goal.id} goal={goal} onDelete={onDelete} />
      ))}
    </section>
  )
}

export default GoalsBentoGrid
export { GoalsBentoGrid }
