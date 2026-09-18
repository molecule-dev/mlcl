import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SpendingInsightCard() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'md:col-span-2 bg-secondary-container rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all relative overflow-hidden group',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <h3
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'text-white font-headline',
          )}
        >
          {t('spendingInsightCard.title', {}, { defaultValue: 'Spending Insight' })}
        </h3>
        <p className={cm.cn(cm.maxW('sm'), cm.sp('mb', 6), 'text-on-secondary-container/80')}>
          {t(
            'spendingInsightCard.insight',
            { percent: '12%', category: 'Dining' },
            {
              defaultValue:
                "You've spent {{percent}} less on {{category}} compared to last month. Keep up the great work!",
            },
          )}
        </p>
        <Link
          to="/reports"
          className={cm.cn(
            'bg-surface text-secondary px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition-transform',
          )}
        >
          {t('spendingInsightCard.viewReport', {}, { defaultValue: 'View Spending Report' })}
        </Link>
      </div>
      <div
        className={cm.cn(
          'absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform duration-700',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-[12rem]')}>analytics</span>
      </div>
    </div>
  )
}
export default SpendingInsightCard
export { SpendingInsightCard }
