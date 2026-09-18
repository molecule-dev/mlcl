import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SavingsRateCard() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <article
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'lg' }),
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl lg:col-span-1 group hover:shadow-2xl hover:shadow-on-surface/5 transition-all',
      )}
      data-mol-id="report-card-4"
    >
      <div className={cm.flex({ justify: 'between', align: 'start' })}>
        <div>
          <span
            className={cm.cn(
              cm.sp('mb', 1),
              cm.fontWeight('bold'),
              'text-[10px] tracking-wider uppercase text-outline block',
            )}
          >
            {t('savingsRateCard.category', {}, { defaultValue: 'Efficiency' })}
          </span>
          <h2
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'font-headline text-on-surface-variant group-hover:text-secondary transition-colors',
            )}
          >
            {t('savingsRateCard.title', {}, { defaultValue: 'Savings Rate' })}
          </h2>
        </div>
        <p
          className={cm.cn(
            cm.textSize('3xl'),
            cm.sp('mt', 1),
            'font-extrabold font-headline text-secondary tracking-tight',
          )}
        >
          {t('savingsRateCard.rate', { rate: 24.5 }, { defaultValue: '{{rate}}%' })}
        </p>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.h(64),
          cm.w('full'),
          'bg-surface-container-low/30 rounded-2xl relative group-hover:bg-surface-container-low/50 transition-colors',
        )}
        data-mol-id="viz-4"
      >
        <div className={cm.cn(cm.flex({ align: 'end', gap: 'xs' }), cm.h(32), 'w-4/5')}>
          <div className={cm.cn(cm.flex1, 'bg-secondary/10 h-[60%] rounded-t-sm')}></div>
          <div className={cm.cn(cm.flex1, 'bg-secondary/20 h-[75%] rounded-t-sm')}></div>
          <div className={cm.cn(cm.flex1, 'bg-secondary/30 h-[65%] rounded-t-sm')}></div>
          <div className={cm.cn(cm.flex1, 'bg-secondary/40 h-[85%] rounded-t-sm')}></div>
          <div className={cm.cn(cm.flex1, 'bg-secondary/50 h-[70%] rounded-t-sm')}></div>
          <div className={cm.cn(cm.flex1, 'bg-secondary/60 h-[95%] rounded-t-sm')}></div>
          <div className={cm.cn(cm.flex1, 'bg-secondary h-[80%] rounded-t-sm')}></div>
        </div>
        {/* Ambient Glow */}
        <div
          className={cm.cn(
            'absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity blur-3xl pointer-events-none',
          )}
        ></div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('pt', 4),
          'mt-auto border-t border-surface-container-high',
        )}
      >
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-secondary')}>
          {t(
            'savingsRateCard.optimalTarget',
            { target: '20%+' },
            { defaultValue: 'Optimal target: {{target}}' },
          )}
        </p>
        <Link
          className={cm.cn(
            'text-primary font-bold text-sm tracking-tight hover:underline underline-offset-4',
          )}
          data-mol-id="link-details-4"
          to="/reports"
        >
          {t('common.viewDetails', {}, { defaultValue: 'View Details' })}
        </Link>
      </div>
    </article>
  )
}

export default SavingsRateCard
export { SavingsRateCard }
