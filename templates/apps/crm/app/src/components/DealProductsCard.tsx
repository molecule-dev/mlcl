import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function DealProductsCard() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-3xl architectural-shadow',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 6))}>
        <h3
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-outline',
          )}
        >
          {t('dealProductsCard.sectionTitle', {}, { defaultValue: 'Products & Services' })}
        </h3>
        <button
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.textPrimary,
            cm.flex({ align: 'center' }),
            'gap-1 hover:underline',
          )}
          onClick={() => {
            /* TODO: wire when backend endpoint exists */
          }}
        >
          <span className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}>add</span>

          {t('dealProductsCard.addItem', {}, { defaultValue: 'Add Item' })}
        </button>
      </div>
      <div className={cm.stack(4)}>
        <div
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'center' }),
            cm.sp('p', 4),
            'bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
            <span className={cm.fv7cf36a08}>cloud</span>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
              {t(
                'dealProductsCard.cloudInfrastructure',
                {},
                { defaultValue: 'Cloud Infrastructure' },
              )}
            </p>
          </div>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
            {t(
              'dealProductsCard.lineItemAmount',
              { amount: '$180,000' },
              { defaultValue: '{{amount}}' },
            )}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'center' }),
            cm.sp('p', 4),
            'bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
            <span className={cm.fv7cf36a08}>security</span>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
              {t('dealProductsCard.securitySuite', {}, { defaultValue: 'Security Suite' })}
            </p>
          </div>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
            {t(
              'dealProductsCard.lineItemAmount',
              { amount: '$45,000' },
              { defaultValue: '{{amount}}' },
            )}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'center' }),
            cm.sp('p', 4),
            'bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
            <span className={cm.fv7cf36a08}>engineering</span>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
              {t(
                'dealProductsCard.implementationServices',
                {},
                { defaultValue: 'Implementation Services' },
              )}
            </p>
          </div>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
            {t(
              'dealProductsCard.lineItemAmount',
              { amount: '$20,000' },
              { defaultValue: '{{amount}}' },
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

export default DealProductsCard
export { DealProductsCard }
