import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ProjectedSavingsCard() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all group',
      )}
      data-mol-id="card-projected-savings"
    >
      <div>
        <div
          className={cm.cn(cm.sp('p', 3), cm.sp('mb', 6), 'bg-primary/10 text-primary rounded-xl')}
          data-mol-id="projected-savings-icon"
        >
          <span className={cm.cn('material-symbols-outlined')}>savings</span>
        </div>
        <h3
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            'font-headline text-on-surface-variant group-hover:text-primary transition-colors',
          )}
        >
          {t('projectedSavingsCard.title', {}, { defaultValue: 'Projected Savings' })}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-foreground-secondary')}>
          {t(
            'projectedSavingsCard.savingsProjection',
            {
              amount: '$1,240',
              period: new Date(
                new Date().getFullYear(),
                new Date().getMonth() + 1,
                0,
              ).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
            },
            { defaultValue: 'Based on current trends, you will save {{amount}} by {{period}}.' },
          )}
        </p>
      </div>
      <div className={cm.sp('mt', 8)}>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'end' }), cm.sp('mb', 2))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] text-foreground-tertiary uppercase tracking-widest',
            )}
          >
            {t('nav.progress', {}, { defaultValue: 'Progress' })}
          </span>
          <span
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              cm.textPrimary,
              'font-headline',
            )}
          >
            {t(
              'projectedSavingsCard.progressPercent',
              { percent: 82 },
              { defaultValue: '{{percent}}%' },
            )}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.h(1.5),
            cm.w('full'),
            cm.roundedFull,
            'bg-surface-container-highest overflow-hidden',
          )}
        >
          <div
            className={cm.cn(cm.h('full'), cm.roundedFull, 'bg-primary')}
            style={{ width: '82%' }}
          ></div>
        </div>
      </div>
    </div>
  )
}

export default ProjectedSavingsCard
export { ProjectedSavingsCard }
