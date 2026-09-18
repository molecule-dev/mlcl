import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface BudgetSummaryCardProps {
  totalBudgeted: number
  totalSpent: number
  totalRemaining: number
  utilizationPct: number
  loading?: boolean
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function BudgetSummaryCard({
  totalBudgeted,
  totalSpent,
  totalRemaining,
  utilizationPct,
  loading,
}: BudgetSummaryCardProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(
        cm.sp('mb', 12),
        cm.grid({ cols: 1, gap: 'xl' }),
        'lg:grid-cols-12 items-end',
      )}
      data-mol-id="budget-summary-card"
    >
      <div className={cm.cn('lg:col-span-8')}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-[0.2em] text-foreground-tertiary block',
          )}
        >
          {t('budgetSummaryCard.allocationLabel', {}, { defaultValue: 'Monthly Allocation' })}
        </span>
        <h2
          className={cm.cn(
            cm.textSize('4xl'),
            cm.sp('mb', 6),
            'font-extrabold font-headline tracking-tighter text-success',
          )}
        >
          {t('budgetSummaryCard.heading', {}, { defaultValue: 'Total Budget' })}
        </h2>
        <div
          className={cm.cn(
            cm.sp('p', 10),
            'bg-surface-container-lowest rounded-[2rem] relative overflow-hidden',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', justify: 'between', gap: 'xl' }),
              'md:flex-row md:items-end relative z-10',
            )}
          >
            <div>
              <span
                className={cm.cn(
                  cm.textPrimary,
                  'text-6xl font-extrabold font-headline tracking-tight',
                )}
              >
                {loading
                  ? t('common.loading', {}, { defaultValue: '…' })
                  : formatCurrency(totalBudgeted)}
              </span>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mt', 4))}>
                <div className={cm.flex({ direction: 'col' })}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase text-foreground-tertiary tracking-wider',
                    )}
                  >
                    {t('budgetSummaryCard.spentLabel', {}, { defaultValue: 'Spent So Far' })}
                  </span>
                  <span
                    className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}
                  >
                    {loading
                      ? t('common.loading', {}, { defaultValue: '…' })
                      : formatCurrency(totalSpent)}
                  </span>
                </div>
                <div
                  className={cm.cn('w-px', cm.h(8), cm.sp('mx', 2), 'bg-surface-secondary')}
                ></div>
                <div className={cm.flex({ direction: 'col' })}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase text-foreground-tertiary tracking-wider',
                    )}
                  >
                    {t('budgetSummaryCard.remainingLabel', {}, { defaultValue: 'Remaining' })}
                  </span>
                  <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-success')}>
                    {loading
                      ? t('common.loading', {}, { defaultValue: '…' })
                      : formatCurrency(totalRemaining)}
                  </span>
                </div>
              </div>
            </div>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'end', gap: 'sm' }),
                'min-w-[200px]',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ justify: 'between' }),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.sp('px', 1),
                  cm.w('full'),
                  'text-foreground-secondary',
                )}
              >
                <span>
                  {t('budgetSummaryCard.utilizationLabel', {}, { defaultValue: 'Utilization' })}
                </span>
                <span className={cm.textPrimary}>
                  {t(
                    'budgetSummaryCard.utilizationPercentage',
                    { pct: utilizationPct },
                    { defaultValue: '{{pct}}%' },
                  )}
                </span>
              </div>
              <div
                className={cm.cn(
                  cm.roundedFull,
                  cm.w('full'),
                  cm.h(3),
                  'bg-surface-container-highest overflow-hidden',
                )}
              >
                <div
                  className={cm.cn(
                    cm.roundedFull,
                    cm.h('full'),
                    'bg-primary transition-all duration-1000',
                  )}
                  style={{ width: `${utilizationPct}%` }}
                ></div>
              </div>
            </div>
          </div>
          {/* Decorative background flourish */}
          <div
            className={cm.cn(
              cm.roundedFull,
              cm.w(64),
              cm.h(64),
              'absolute -right-12 -bottom-12 bg-success-light blur-3xl opacity-50 pointer-events-none',
            )}
          ></div>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'lg:col-span-4')}>
        <button
          className={cm.cn(
            cm.button(),
            cm.fontWeight('bold'),
            cm.textSize('lg'),
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.w('full'),
            cm.h(16),
            'bg-gradient-to-br from-primary to-primary-container text-white rounded-xl shadow-lg shadow-emerald-900/10 hover:shadow-emerald-900/20 transition-all transform active:scale-95',
          )}
          onClick={() => navigate('/budgets/new')}
        >
          <span className={cm.cn('material-symbols-outlined')}>add_circle</span>
          {t('budgetSummaryCard.addBudget', {}, { defaultValue: 'Add Budget' })}
        </button>
        <div
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ align: 'center', gap: 'md' }),
            'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.textPrimary,
              cm.w(12),
              cm.h(12),
              'bg-surface rounded-xl',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')}>insights</span>
          </div>
          <div>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-success')}>
              {t('budgetSummaryCard.insightTitle', {}, { defaultValue: 'Spending Insight' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary leading-tight')}>
              {t(
                'budgetSummaryCard.insightText',
                { pct: 12, month: t('common.months.february', {}, { defaultValue: 'February' }) },
                { defaultValue: "You're spending {{pct}}% less on dining compared to {{month}}." },
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default BudgetSummaryCard
export { BudgetSummaryCard }
