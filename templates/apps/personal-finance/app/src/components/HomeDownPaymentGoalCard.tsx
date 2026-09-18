import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function HomeDownPaymentGoalCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all group',
      )}
      data-mol-id="goal-card-4"
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
        <div className={cm.flex({ gap: 'lg' })}>
          <div className={cm.cn(cm.sp('p', 3), 'bg-purple-50 text-purple-600 rounded-xl')}>
            <span className={cm.cn('material-symbols-outlined')}>home</span>
          </div>
          <div>
            <h3
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                'font-headline text-on-surface-variant group-hover:text-purple-600 transition-colors',
              )}
            >
              {t('homeDownPaymentGoalCard.title', {}, { defaultValue: 'Home Down Payment' })}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.sp('mt', 1),
                'text-on-surface-variant',
              )}
            >
              {t(
                'homeDownPaymentGoalCard.savedAmount',
                { amount: '$15,000' },
                { defaultValue: '{{amount}}' },
              )}
              <span className={cm.cn('text-foreground-tertiary')}>
                {t(
                  'homeDownPaymentGoalCard.goalAmount',
                  { amount: '$60,000' },
                  { defaultValue: '/ {{amount}}' },
                )}
              </span>
            </p>
          </div>
        </div>
        {/* Progress Ring 25% */}
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
              className={cm.cn('text-purple-600')}
              cx="40"
              cy="40"
              fill="transparent"
              r="34"
              stroke="currentColor"
              strokeDasharray="213.6"
              strokeDashoffset="160.2"
              strokeWidth="6"
            ></circle>
          </svg>
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'absolute inset-0')}
          >
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-purple-700')}>
              {t(
                'homeDownPaymentGoalCard.progressPercent',
                { percent: 25 },
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
              'homeDownPaymentGoalCard.monthlyContributionLabel',
              {},
              { defaultValue: 'Monthly Contribution' },
            )}
          </p>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-foreground-secondary mt-0.5',
            )}
          >
            {t(
              'homeDownPaymentGoalCard.monthlyContribution',
              { amount: '$2,500' },
              { defaultValue: '{{amount}}/mo' },
            )}
          </p>
        </div>
        <div className={cm.textRight}>
          <p className={cm.cn('text-[11px] text-foreground-tertiary uppercase tracking-tighter')}>
            {t(
              'homeDownPaymentGoalCard.estimatedDateLabel',
              {},
              { defaultValue: 'Estimated Date' },
            )}
          </p>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-foreground-secondary mt-0.5',
            )}
          >
            {t(
              'homeDownPaymentGoalCard.estimatedDate',
              { date: 'Aug 2027' },
              { defaultValue: '{{date}}' },
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

export default HomeDownPaymentGoalCard
export { HomeDownPaymentGoalCard }
