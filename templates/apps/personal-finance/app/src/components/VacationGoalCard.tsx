import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function VacationGoalCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all group',
      )}
      data-mol-id="goal-card-2"
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
        <div className={cm.flex({ gap: 'lg' })}>
          <div className={cm.cn(cm.sp('p', 3), 'bg-blue-50 text-blue-700 rounded-xl')}>
            <span className={cm.cn('material-symbols-outlined')} data-icon="flight_takeoff">
              flight_takeoff
            </span>
          </div>
          <div>
            <h3
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                cm.sp('mb', 1),
                'font-headline text-on-surface-variant group-hover:text-blue-600 transition-colors',
              )}
            >
              {t('vacationGoalCard.title', {}, { defaultValue: 'Vacation' })}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'vacationGoalCard.savedAmount',
                { amount: '$2,100' },
                { defaultValue: '{{amount}}' },
              )}
              <span className={cm.cn('text-foreground-tertiary')}>
                {t(
                  'vacationGoalCard.targetAmount',
                  { amount: '$5,000' },
                  { defaultValue: '/ {{amount}}' },
                )}
              </span>
            </p>
          </div>
        </div>
        {/* Progress Ring 42% */}
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
            ></circle>
            <circle
              className={cm.cn('text-blue-600')}
              cx="40"
              cy="40"
              fill="transparent"
              r="34"
              stroke="currentColor"
              strokeDasharray="213.6"
              strokeDashoffset="123.8"
              strokeWidth="6"
            ></circle>
          </svg>
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'absolute inset-0')}
          >
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-blue-700')}>
              {t(
                'vacationGoalCard.progressPercent',
                { percent: 42 },
                { defaultValue: '{{percent}}%' },
              )}
            </span>
          </div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('pt', 4),
          'border-t border-surface-container-high',
        )}
      >
        <div>
          <p className={cm.cn('text-[11px] text-foreground-tertiary uppercase tracking-tighter')}>
            {t(
              'vacationGoalCard.monthlyContributionLabel',
              {},
              { defaultValue: 'Monthly Contribution' },
            )}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-blue-800 mt-0.5')}>
            {t(
              'vacationGoalCard.monthlyContribution',
              { amount: '$300' },
              { defaultValue: '{{amount}}/mo' },
            )}
          </p>
        </div>
        <div className={cm.textRight}>
          <p className={cm.cn('text-[11px] text-foreground-tertiary uppercase tracking-tighter')}>
            {t('vacationGoalCard.estimatedDateLabel', {}, { defaultValue: 'Estimated Date' })}
          </p>
          <p
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface mt-0.5')}
          >
            {t(
              'vacationGoalCard.estimatedDate',
              { date: 'Jun 2024' },
              { defaultValue: '{{date}}' },
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

export default VacationGoalCard
export { VacationGoalCard }
