import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function BounceRateCard() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 8),
        'bg-surface-container-low rounded-xl shadow-sm hover:translate-y-[-2px] transition-transform',
      )}
    >
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          cm.sp('mb', 2),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {t('bounceRateCard.bounceRate', {}, { defaultValue: 'Bounce Rate' })}
      </p>
      <div className={cm.flex({ align: 'end', gap: 'sm' })}>
        <h3 className={cm.cn(cm.textSize('3xl'), 'font-black text-on-surface')}>
          {t('bounceRateCard.rateValue', { rate: '42%' }, { defaultValue: '{{rate}}' })}
        </h3>
      </div>
    </div>
  )
}

export default BounceRateCard
export { BounceRateCard }
