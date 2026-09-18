import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function MonthlyCashFlowCard({
  transactions,
}: {
  transactions: { id: string; amount: number; type: string }[]
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const income = transactions
    .filter((tx) => tx.type === 'income')
    .reduce((s, tx) => s + Math.abs(tx.amount), 0)
  const expenses = transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((s, tx) => s + Math.abs(tx.amount), 0)
  const total = income + expenses
  const incomeRatio = total > 0 ? Math.round((income / total) * 100) : 0
  const remaining = income - expenses
  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'xl' }),
        cm.sp('p', 6),
        'col-span-12 lg:col-span-5 bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all',
      )}
    >
      <div>
        <h3
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('lg'),
            cm.sp('mb', 6),
            'font-headline text-on-surface-variant',
          )}
        >
          {t('monthlyCashFlowCard.title', {}, { defaultValue: 'Monthly Cash Flow' })}
        </h3>
        <div className={cm.stack(6)}>
          <div className={cm.flex({ justify: 'between', align: 'end' })}>
            <div>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  cm.sp('mb', 1),
                  'text-foreground-secondary',
                )}
              >
                {t('monthlyCashFlowCard.totalIncome', {}, { defaultValue: 'Total Income' })}
              </p>
              <p className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-success')}>
                {formatCurrency(income)}
              </p>
            </div>
            <div className={cm.textRight}>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  cm.sp('mb', 1),
                  'text-foreground-secondary',
                )}
              >
                {t('monthlyCashFlowCard.expenses', {}, { defaultValue: 'Expenses' })}
              </p>
              <p className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-tertiary')}>
                {formatCurrency(expenses)}
              </p>
            </div>
          </div>
          <div
            className={cm.cn(
              cm.flex(),
              cm.w('full'),
              cm.h(2),
              cm.roundedFull,
              'relative bg-surface-container-highest overflow-hidden',
            )}
          >
            <div
              className={cm.cn(cm.h('full'), 'bg-primary')}
              style={{ width: `${incomeRatio}%` }}
            ></div>
            <div
              className={cm.cn(cm.h('full'), 'bg-tertiary/20')}
              style={{ width: `${100 - incomeRatio}%` }}
            ></div>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-foreground-secondary',
            )}
          >
            <span>
              {t(
                'monthlyCashFlowCard.incomeRatio',
                { ratio: incomeRatio },
                { defaultValue: 'Income Ratio: {{ratio}}%' },
              )}
            </span>
            <span>
              {t(
                'monthlyCashFlowCard.remaining',
                { amount: formatCurrency(remaining) },
                { defaultValue: 'Remaining: {{amount}}' },
              )}
            </span>
          </div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('p', 5),
          'mt-auto bg-surface-container-lowest rounded-2xl',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <div className={cm.cn(cm.center, cm.w(10), cm.h(10), 'rounded-xl bg-secondary/10')}>
            <span
              className={cm.cn('material-symbols-outlined text-secondary')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              trending_up
            </span>
          </div>
          <div>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-wider text-foreground-tertiary',
              )}
            >
              {t('monthlyCashFlowCard.savingsRate', {}, { defaultValue: 'Savings Rate' })}
            </p>
            <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
              {income > 0 ? ((remaining / income) * 100).toFixed(1) : '0.0'}%
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MonthlyCashFlowCard
export { MonthlyCashFlowCard }
