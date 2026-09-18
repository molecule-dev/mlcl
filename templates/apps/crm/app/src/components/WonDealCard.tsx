import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function WonDealCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-3xl border border-outline-variant/15 hover:border-primary/30 shadow-sm transition-all group relative opacity-80',
      )}
      data-mol-id="deal-card-5"
    >
      <div className={cm.fv3e2e1ab2}>
        <span
          className={cm.fv4314cc92}
          style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
        >
          check_circle
        </span>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 3), 'gap-3')}>
        <div
          className={cm.cn(
            cm.h(8),
            cm.w(8),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'rounded bg-success-light text-success',
          )}
        >
          {t('wonDealCard.companyInitial', {}, { defaultValue: 'H' })}
        </div>
        <div>
          <h4
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-on-surface leading-tight',
            )}
          >
            {t('wonDealCard.companyName', {}, { defaultValue: 'Horizon Media' })}
          </h4>
          <p className={cm.fvad8194f2}>
            {t('wonDealCard.contactName', {}, { defaultValue: 'Tom Baker' })}
          </p>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 3))}>
        <span className={cm.cn(cm.textSize('sm'), 'font-black text-on-surface')}>
          {t('wonDealCard.dealValue', { amount: '$88,000' }, { defaultValue: '{{amount}}' })}
        </span>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.sp('px', 2),
            cm.roundedFull,
            'text-[10px] py-0.5 bg-success-light text-success',
          )}
        >
          {t('wonDealCard.status', {}, { defaultValue: 'Closed' })}
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
          {t(
            'wonDealCard.closedDaysAgo',
            { days: 2 },
            { defaultValue: 'Closed {{days}} days ago' },
          )}
        </span>
        <div className={cm.cn(cm.flex({}), '-space-x-2')}>
          <img
            className={cm.cn(cm.h(5), cm.w(5), cm.roundedFull, 'border border-surface')}
            alt=""
            data-alt="professional portrait of a young man with a slight smile and clean office attire"
            src="https://picsum.photos/seed/WonDealCard-1/1200/800"
          />
        </div>
      </div>
    </div>
  )
}

export default WonDealCard
export { WonDealCard }
