import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AssetAllocationCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'center' }),
        cm.sp('p', 6),
        'lg:col-span-4 bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all group',
      )}
    >
      <h3
        className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), cm.sp('mb', 6), 'font-headline')}
      >
        {t('assetAllocationCard.title', {}, { defaultValue: 'Asset Allocation' })}
      </h3>
      <div className={cm.stack(6)}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <div className={cm.cn(cm.roundedFull, cm.w(3), cm.h(3), 'bg-primary')}></div>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('assetAllocationCard.cash', {}, { defaultValue: 'Cash' })}
            </span>
          </div>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
            {t(
              'assetAllocationCard.allocationPercent',
              { percent: 62 },
              { defaultValue: '{{percent}}%' },
            )}
          </span>
        </div>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <div className={cm.cn(cm.roundedFull, cm.w(3), cm.h(3), 'bg-secondary')}></div>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('assetAllocationCard.investments', {}, { defaultValue: 'Investments' })}
            </span>
          </div>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
            {t(
              'assetAllocationCard.allocationPercent',
              { percent: 28 },
              { defaultValue: '{{percent}}%' },
            )}
          </span>
        </div>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <div className={cm.cn(cm.roundedFull, cm.w(3), cm.h(3), 'bg-tertiary')}></div>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('assetAllocationCard.other', {}, { defaultValue: 'Other' })}
            </span>
          </div>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
            {t(
              'assetAllocationCard.allocationPercent',
              { percent: 10 },
              { defaultValue: '{{percent}}%' },
            )}
          </span>
        </div>
        <div className={cm.cn(cm.sp('pt', 4), 'border-t border-surface-container-high')}>
          <p className={cm.cn('text-[11px] text-foreground-tertiary uppercase tracking-tighter')}>
            {t('assetAllocationCard.strategyLabel', {}, { defaultValue: 'Growth Strategy' })}
          </p>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-foreground-secondary mt-0.5',
            )}
          >
            {t('assetAllocationCard.strategyValue', {}, { defaultValue: 'Moderate Conservative' })}
          </p>
        </div>
      </div>
    </div>
  )
}

export default AssetAllocationCard
export { AssetAllocationCard }
