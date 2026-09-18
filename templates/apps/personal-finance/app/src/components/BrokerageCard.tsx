import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function BrokerageCard() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all group',
      )}
      data-mol-id="card-brokerage"
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
        <div
          className={cm.cn(cm.sp('p', 3), 'bg-purple-50 text-purple-600 rounded-xl')}
          data-mol-id="broker-icon"
        >
          <span className={cm.cn('material-symbols-outlined')}>show_chart</span>
        </div>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'bg-purple-50 text-purple-700 text-[10px] uppercase tracking-wider',
          )}
          data-mol-id="badge-broker"
        >
          {t('brokerageCard.category', {}, { defaultValue: 'Investment' })}
        </span>
      </div>
      <h3
        className={cm.cn(
          cm.textSize('lg'),
          cm.fontWeight('bold'),
          'font-headline text-on-surface-variant group-hover:text-purple-600 transition-colors',
        )}
      >
        {t('brokerageCard.title', {}, { defaultValue: 'Brokerage' })}
      </h3>
      <p
        className={cm.cn(
          cm.textSize('3xl'),
          cm.sp('mt', 1),
          'font-headline font-extrabold tracking-tight',
        )}
        data-mol-id="val-brokerage"
      >
        {t('brokerageCard.balance', { amount: '$15,500.00' }, { defaultValue: '{{amount}}' })}
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
          className={cm.cn(cm.w('full'), cm.h('full'), 'stroke-purple-500 stroke-2 fill-none')}
          preserveAspectRatio="none"
          viewBox="0 0 100 40"
        >
          <path
            d="M0 38 L 15 35 L 30 20 L 45 22 L 60 10 L 75 15 L 100 2"
            strokeLinecap="round"
          ></path>
        </svg>
      </div>
      <div className={cm.cn(cm.sp('pt', 4), 'border-t border-surface-container-high')}>
        <p
          className={cm.cn('text-[11px] text-foreground-tertiary uppercase tracking-tighter')}
          data-mol-id="label-broker-last"
        >
          {t('brokerageCard.lastTransactionLabel', {}, { defaultValue: 'Last Transaction' })}
        </p>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'text-foreground-secondary mt-0.5',
          )}
          data-mol-id="val-broker-last"
        >
          {t('brokerageCard.lastTransactionEmpty', {}, { defaultValue: 'No recent trades' })}
        </p>
      </div>
    </div>
  )
}

export default BrokerageCard
export { BrokerageCard }
