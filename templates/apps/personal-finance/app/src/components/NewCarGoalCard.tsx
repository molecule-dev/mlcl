import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function NewCarGoalCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl bg-surface-container-lowest hover:shadow-2xl hover:shadow-on-surface/5 transition-all group relative overflow-hidden',
      )}
      data-mol-id="goal-card-3"
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), 'relative z-10')}>
        <div className={cm.cn(cm.flex({ gap: 'lg' }))}>
          <div
            className={cm.cn(
              cm.w(14),
              cm.h(14),
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-warning-light text-warning rounded-xl',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="directions_car">
              directions_car
            </span>
          </div>
          <div>
            <h3
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                cm.sp('mb', 1),
                'font-headline text-on-surface-variant group-hover:text-warning transition-colors',
              )}
            >
              {t('newCarGoalCard.title', {}, { defaultValue: 'New Car' })}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'newCarGoalCard.savedAmount',
                { amount: '$3,500' },
                { defaultValue: '{{amount}}' },
              )}
              <span className={cm.cn('text-foreground-tertiary')}>
                {t(
                  'newCarGoalCard.targetAmount',
                  { amount: '$25,000' },
                  { defaultValue: '/ {{amount}}' },
                )}
              </span>
            </p>
          </div>
        </div>
        {/* Progress Ring 14% */}
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
              className={cm.cn('text-warning')}
              cx="40"
              cy="40"
              fill="transparent"
              r="34"
              stroke="currentColor"
              strokeDasharray="213.6"
              strokeDashoffset="183.7"
              strokeWidth="6"
            ></circle>
          </svg>
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'absolute inset-0')}
          >
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-warning')}>
              {t(
                'newCarGoalCard.progressPercent',
                { percent: '14%' },
                { defaultValue: '{{percent}}' },
              )}
            </span>
          </div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.sp('mt', 8),
          cm.sp('pt', 4),
          cm.flex({ justify: 'between', align: 'center' }),
          'border-t border-surface-container-high',
        )}
      >
        <div>
          <p className={cm.cn('text-[11px] text-foreground-tertiary uppercase tracking-tighter')}>
            {t(
              'newCarGoalCard.monthlyContributionLabel',
              {},
              { defaultValue: 'Monthly Contribution' },
            )}
          </p>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'mt-0.5 text-warning')}>
            {t(
              'newCarGoalCard.monthlyContribution',
              { amount: '$1,200' },
              { defaultValue: '{{amount}}/mo' },
            )}
          </p>
        </div>
        <div className={cm.textRight}>
          <p className={cm.cn('text-[11px] text-foreground-tertiary uppercase tracking-tighter')}>
            {t('newCarGoalCard.estimatedDateLabel', {}, { defaultValue: 'Estimated Date' })}
          </p>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'mt-0.5 text-on-surface')}>
            {t('newCarGoalCard.estimatedDate', { date: 'Jan 2026' }, { defaultValue: '{{date}}' })}
          </p>
        </div>
      </div>
    </div>
  )
}

export default NewCarGoalCard
export { NewCarGoalCard }
