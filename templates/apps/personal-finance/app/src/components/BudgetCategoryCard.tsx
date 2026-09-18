import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface BudgetCategoryCardProps {
  name: string
  icon: string
  description: string
  spent: number
  amount: number
  pct: number
  status: string
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function BudgetCategoryCard({
  name,
  icon,
  description,
  spent,
  amount,
  pct,
}: BudgetCategoryCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl group hover:shadow-2xl hover:shadow-on-surface/5 transition-all',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
        <div className={cm.cn(cm.sp('p', 3), 'bg-success-light text-success rounded-xl')}>
          <span className={cm.cn('material-symbols-outlined')}>{icon}</span>
        </div>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'text-[10px] uppercase tracking-wider',
            spent > amount ? 'text-error bg-error-light' : 'text-success bg-success-light',
          )}
        >
          {spent > amount
            ? t('budgetCategoryCard.overBudget', {}, { defaultValue: 'Over Budget' })
            : t('budgetCategoryCard.onTrack', {}, { defaultValue: 'On Track' })}
        </span>
      </div>
      <h3
        className={cm.cn(
          cm.textSize('lg'),
          cm.fontWeight('bold'),
          cm.sp('mb', 1),
          'font-headline text-on-surface-variant group-hover:text-primary transition-colors',
        )}
      >
        {name}
      </h3>
      <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 6), 'text-foreground-tertiary')}>
        {description}
      </p>
      <div
        className={cm.cn(
          cm.flex({ justify: 'between' }),
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          cm.sp('mb', 2),
        )}
      >
        <span className={cm.cn('text-on-surface')}>
          {formatCurrency(spent)}
          <span className={cm.cn(cm.fontWeight('normal'), 'text-foreground-tertiary')}>
            {t(
              'budgetCategoryCard.ofTotal',
              { total: formatCurrency(amount) },
              { defaultValue: '/ {{total}}' },
            )}
          </span>
        </span>
        <span className={pct > 100 ? 'text-error' : cm.textPrimary}>
          {t('budgetCategoryCard.percentage', { pct }, { defaultValue: '{{pct}}%' })}
        </span>
      </div>
      <div
        className={cm.cn(
          cm.roundedFull,
          cm.w('full'),
          'h-1.5 bg-surface-container-highest overflow-hidden',
        )}
      >
        <div
          className={cm.cn(cm.roundedFull, cm.h('full'), pct > 100 ? 'bg-red-500' : 'bg-primary')}
          style={{ width: `${Math.min(pct, 100)}%` }}
        ></div>
      </div>
    </div>
  )
}

export default BudgetCategoryCard
export { BudgetCategoryCard }
