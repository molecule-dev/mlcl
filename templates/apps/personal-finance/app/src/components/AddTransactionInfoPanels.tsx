import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AddTransactionInfoPanels() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section className={cm.cn(cm.grid({ cols: 3, gap: 'xl' }), cm.sp('px', 12), 'pb-20')}>
      <div className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
          <span
            className={cm.cn(
              cm.textPrimary,
              cm.sp('p', 2),
              'material-symbols-outlined bg-primary/5 rounded-lg',
            )}
          >
            history
          </span>
          <h4
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'tracking-widest uppercase text-outline',
            )}
          >
            {t(
              'addTransactionInfoPanels.recentActivityTitle',
              {},
              { defaultValue: 'Recent Activity' },
            )}
          </h4>
        </div>
        <div className={cm.stack(4)}>
          <div className={cm.flex({ justify: 'between', align: 'center' })}>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}>
              {t(
                'addTransactionInfoPanels.examplePurchase',
                {},
                { defaultValue: 'Starbucks Reserve' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-tertiary')}>
              {t(
                'addTransactionInfoPanels.transactionAmount',
                { amount: '14.50' },
                { defaultValue: '-${{amount}}' },
              )}
            </p>
          </div>
          <div className={cm.flex({ justify: 'between', align: 'center' })}>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}>
              {t(
                'addTransactionInfoPanels.exampleSubscription',
                {},
                { defaultValue: 'Apple Subscription' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-tertiary')}>
              {t(
                'addTransactionInfoPanels.transactionAmount',
                { amount: '9.99' },
                { defaultValue: '-${{amount}}' },
              )}
            </p>
          </div>
        </div>
      </div>
      <div className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
          <span
            className={cm.cn(
              cm.sp('p', 2),
              'material-symbols-outlined text-secondary bg-secondary/5 rounded-lg',
            )}
          >
            pie_chart
          </span>
          <h4
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'tracking-widest uppercase text-outline',
            )}
          >
            {t(
              'addTransactionInfoPanels.categoryLimitTitle',
              {},
              { defaultValue: 'Category Limit' },
            )}
          </h4>
        </div>
        <div className={cm.stack(3)}>
          <div
            className={cm.cn(
              cm.flex({ justify: 'between' }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
            )}
          >
            <span className={cm.cn('text-on-surface')}>
              {t(
                'addTransactionInfoPanels.spendingCategoryLabel',
                {},
                { defaultValue: 'Food & Dining' },
              )}
            </span>
            <span className={cm.cn('text-outline')}>
              {t(
                'addTransactionInfoPanels.categoryUsagePercent',
                { percent: 75 },
                { defaultValue: '{{percent}}%' },
              )}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.h(1.5),
              cm.w('full'),
              cm.roundedFull,
              'bg-surface-container-highest overflow-hidden',
            )}
          >
            <div className={cm.cn(cm.h('full'), 'bg-primary')} style={{ width: '75%' }}></div>
          </div>
          <p className={cm.cn('text-[10px] text-outline italic')}>
            {t(
              'addTransactionInfoPanels.monthlyLimitRemaining',
              { amount: 250 },
              { defaultValue: 'You are ${{amount}} away from your monthly limit' },
            )}
          </p>
        </div>
      </div>
      <div className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
          <span
            className={cm.cn(
              cm.sp('p', 2),
              'material-symbols-outlined text-tertiary bg-tertiary/5 rounded-lg',
            )}
          >
            lightbulb
          </span>
          <h4
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'tracking-widest uppercase text-outline',
            )}
          >
            {t(
              'addTransactionInfoPanels.curatorInsightTitle',
              {},
              { defaultValue: 'Curator Insight' },
            )}
          </h4>
        </div>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'leading-relaxed text-on-surface-variant',
          )}
        >
          {t(
            'addTransactionInfoPanels.curatorInsightBody',
            {},
            {
              defaultValue:
                'Adding a recurring tag to this rent payment will help improve your net growth projections for Q4.',
            },
          )}
        </p>
      </div>
    </section>
  )
}

export default AddTransactionInfoPanels
export { AddTransactionInfoPanels }
