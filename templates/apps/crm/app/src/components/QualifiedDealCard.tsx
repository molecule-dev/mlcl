import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function QualifiedDealCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
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
            cm.textPrimary,
            'text-[11px] bg-primary/5 py-0.5 rounded',
          )}
        >
          {t('qualifiedDealCard.company', {}, { defaultValue: 'Global Logistics' })}
        </span>
        <span className={cm.cn(cm.textSize('xs'), 'font-black text-on-surface')}>
          {t('qualifiedDealCard.dealValue', { amount: '$120,000' }, { defaultValue: '{{amount}}' })}
        </span>
      </div>
      <h4
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          'text-on-surface group-hover:text-primary',
        )}
      >
        {t('qualifiedDealCard.dealName', {}, { defaultValue: 'Annual Software Licensing' })}
      </h4>
      <div className={cm.cn(cm.sp('mt', 4), cm.flex({ justify: 'between', align: 'center' }))}>
        <div className={cm.cn(cm.flex(), '-space-x-2')}>
          <img
            className={cm.cn(cm.w(6), cm.h(6), cm.roundedFull, 'border-2 border-surface')}
            alt=""
            data-alt="portrait of a professional woman with a welcoming smile, natural outdoor lighting"
            src="https://picsum.photos/seed/QualifiedDealCard-1/1200/800"
          />
        </div>
        <span className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-on-surface-variant')}>
          {t(
            'qualifiedDealCard.daysInStage',
            { days: 12 },
            { defaultValue: '{{days}} days in stage' },
          )}
        </span>
      </div>
    </div>
  )
}

export default QualifiedDealCard
export { QualifiedDealCard }
