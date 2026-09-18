import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SavingsCard() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all group',
      )}
      data-mol-id="card-savings"
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
        <div
          className={cm.cn(cm.sp('p', 3), 'bg-blue-50 text-blue-600 rounded-xl')}
          data-mol-id="savings-icon"
        >
          <span className={cm.cn('material-symbols-outlined')}>money_bag</span>
        </div>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'bg-blue-50 text-blue-700 text-[10px] uppercase tracking-wider',
          )}
          data-mol-id="badge-savings"
        >
          {t('savingsCard.category', {}, { defaultValue: 'Bank' })}
        </span>
      </div>
      <h3
        className={cm.cn(
          cm.textSize('lg'),
          cm.fontWeight('bold'),
          'font-headline text-on-surface-variant group-hover:text-blue-600 transition-colors',
        )}
      >
        {t('savingsCard.title', {}, { defaultValue: 'Savings' })}
      </h3>
      <p
        className={cm.cn(
          cm.textSize('3xl'),
          cm.sp('mt', 1),
          'font-headline font-extrabold tracking-tight',
        )}
        data-mol-id="val-savings"
      >
        {t('savingsCard.balance', { amount: '$28,000.00' }, { defaultValue: '{{amount}}' })}
      </p>
      <div
        className={cm.cn(
          cm.sp('my', 6),
          cm.h(12),
          cm.w('full'),
          'opacity-60 group-hover:opacity-100 transition-opacity',
        )}
      >
        <svg
          className={cm.cn(cm.w('full'), cm.h('full'), 'stroke-secondary stroke-2 fill-none')}
          preserveAspectRatio="none"
          viewBox="0 0 100 40"
        >
          <path d="M0 30 L 20 28 L 40 15 L 60 18 L 80 5 L 100 2" strokeLinecap="round"></path>
        </svg>
      </div>
      <div className={cm.cn(cm.sp('pt', 4), 'border-t border-surface-container-high')}>
        <p
          className={cm.cn('text-[11px] text-foreground-tertiary uppercase tracking-tighter')}
          data-mol-id="label-savings-last"
        >
          {t('savingsCard.lastTransaction', {}, { defaultValue: 'Last Transaction' })}
        </p>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'text-foreground-secondary mt-0.5',
          )}
          data-mol-id="val-savings-last"
        >
          {t(
            'savingsCard.lastTransactionDetails',
            { amount: '+$1,500.00', date: 'Apr 01' },
            { defaultValue: '{{amount}} {{date}}' },
          )}
        </p>
      </div>
    </div>
  )
}

export default SavingsCard
export { SavingsCard }
