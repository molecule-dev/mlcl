import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function GoalCard() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all group relative overflow-hidden',
      )}
      data-mol-id="goal-card-1"
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), 'relative z-10')}>
        <div className={cm.flex({ gap: 'lg' })}>
          <div className={cm.cn(cm.sp('p', 3), 'bg-success-light text-success rounded-xl')}>
            <span className={cm.cn('material-symbols-outlined')} data-icon="security">
              security
            </span>
          </div>
          <div>
            <h3
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                cm.sp('mb', 1),
                'font-headline text-on-surface-variant group-hover:text-success transition-colors',
              )}
            >
              {t('goalCard.name', {}, { defaultValue: 'Emergency Fund' })}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {t('goalCard.currentAmount', { amount: '$8,000' }, { defaultValue: '{{amount}}' })}
              <span className={cm.cn('text-foreground-tertiary')}>
                {t(
                  'goalCard.targetAmount',
                  { amount: '$10,000' },
                  { defaultValue: '/ {{amount}}' },
                )}
              </span>
            </p>
          </div>
        </div>
        {/* Progress Ring 80% */}
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
              className={cm.cn('text-success')}
              cx="40"
              cy="40"
              fill="transparent"
              r="34"
              stroke="currentColor"
              strokeDasharray="213.6"
              strokeDashoffset="42.72"
              strokeWidth="6"
            ></circle>
          </svg>
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'absolute inset-0')}
          >
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-success')}>
              {t('goalCard.progress', { percent: 80 }, { defaultValue: '{{percent}}%' })}
            </span>
          </div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.sp('mt', 8),
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('pt', 4),
          'border-t border-surface-container-high',
        )}
      >
        <div>
          <p className={cm.cn('text-[11px] text-foreground-tertiary uppercase tracking-tighter')}>
            {t('goalCard.monthlyContributionLabel', {}, { defaultValue: 'Monthly Contribution' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-success mt-0.5')}>
            {t('goalCard.monthlyAmount', { amount: '$500' }, { defaultValue: '{{amount}}/mo' })}
          </p>
        </div>
        <div className={cm.textRight}>
          <p className={cm.cn('text-[11px] text-foreground-tertiary uppercase tracking-tighter')}>
            {t('goalCard.estimatedDateLabel', {}, { defaultValue: 'Estimated Date' })}
          </p>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-foreground-secondary mt-0.5',
            )}
          >
            {t('goalCard.estimatedDate', { date: 'Nov 2025' }, { defaultValue: '{{date}}' })}
          </p>
        </div>
      </div>
    </div>
  )
}

export default GoalCard
export { GoalCard }
