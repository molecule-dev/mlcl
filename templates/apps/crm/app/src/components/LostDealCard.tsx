import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function LostDealCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 4),
        'bg-surface-container-lowest rounded-xl border border-outline-variant/15 hover:border-primary/30 shadow-sm transition-all group relative opacity-70 grayscale-[0.5]',
      )}
      data-mol-id="deal-card-6"
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 3), 'gap-3')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(8),
            cm.h(8),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'rounded bg-surface-secondary text-foreground-secondary',
          )}
        >
          C
        </div>
        <div>
          <h4
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-on-surface leading-tight',
            )}
          >
            {t('lostDealCard.companyName', {}, { defaultValue: 'Cipher Systems' })}
          </h4>
          <p className={cm.fvad8194f2}>
            {t('lostDealCard.contactName', {}, { defaultValue: 'Elena Rossi' })}
          </p>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 3))}>
        <span className={cm.cn(cm.textSize('sm'), 'font-black text-on-surface')}>
          {t('lostDealCard.dealAmount', { amount: '$32,000' }, { defaultValue: '{{amount}}' })}
        </span>
        <span
          className={cm.cn(
            cm.fontWeight('medium'),
            cm.sp('px', 2),
            cm.roundedFull,
            'text-[10px] py-0.5 bg-surface-secondary text-foreground-secondary',
          )}
        >
          {t('lostDealCard.lossReason', {}, { defaultValue: 'Budget Cut' })}
        </span>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('pt', 3),
          'border-t border-outline-variant/10 text-[10px] text-on-surface-variant',
        )}
      >
        <span className={cm.cn(cm.flex({ align: 'center' }), 'gap-1')}>
          {t('lostDealCard.lostOnStage', { stage: 2 }, { defaultValue: 'Lost on Stage {{stage}}' })}
        </span>
        <div className={cm.cn(cm.flex(), '-space-x-2')}>
          <img
            className={cm.cn(cm.w(5), cm.h(5), cm.roundedFull, 'border border-surface')}
            alt=""
            data-alt="professional headshot of a woman with dark hair and a formal blazer"
            src="https://picsum.photos/seed/LostDealCard-1/1200/800"
          />
        </div>
      </div>
    </div>
  )
}

export default LostDealCard
export { LostDealCard }
