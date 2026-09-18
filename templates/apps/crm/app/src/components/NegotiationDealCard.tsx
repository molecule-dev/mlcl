import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function NegotiationDealCard() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-3xl shadow-sm border border-border hover:shadow-md transition-shadow group',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 2))}>
        <span
          className={cm.cn(
            cm.sp('px', 2),
            cm.fontWeight('bold'),
            'text-[11px] text-primary bg-primary/5 py-0.5 rounded',
          )}
        >
          {t('negotiationDealCard.companyName', {}, { defaultValue: 'BlueSky Inc' })}
        </span>
        <span className={cm.cn(cm.textSize('xs'), 'font-black text-on-surface')}>
          {t('negotiationDealCard.dealValue', {}, { defaultValue: '$1.1M' })}
        </span>
      </div>
      <h4
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          'text-on-surface group-hover:text-primary',
        )}
      >
        {t('negotiationDealCard.dealName', {}, { defaultValue: 'Enterprise Security Suite' })}
      </h4>
      <div className={cm.cn(cm.sp('mt', 4), cm.flex({ justify: 'between', align: 'center' }))}>
        <div className={cm.cn(cm.flex(), '-space-x-2')}>
          <img
            className={cm.cn(cm.w(6), cm.h(6), cm.roundedFull, 'border-2 border-surface')}
            alt=""
            data-alt="middle aged professional man in business casual, warm sunset light"
            src="https://picsum.photos/seed/NegotiationDealCard-1/1200/800"
          />
        </div>
        <span className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-on-surface-variant')}>
          {t(
            'negotiationDealCard.daysInStage',
            { days: 21 },
            { defaultValue: '{{days}} days in stage' },
          )}
        </span>
      </div>
    </div>
  )
}

export default NegotiationDealCard
export { NegotiationDealCard }
