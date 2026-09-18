import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function KpiCard() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow',
      )}
    >
      <div className={cm.flex({ justify: 'between', align: 'start' })}>
        <span
          className={cm.cn(
            cm.textPrimary,
            cm.sp('p', 3),
            cm.roundedFull,
            'material-symbols-outlined bg-primary-fixed/30',
          )}
          data-icon="visibility"
        >
          visibility
        </span>
        <span
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('px', 2),
            cm.sp('py', 1),
            'rounded-md',
            'text-success bg-success-light',
          )}
        >
          {t('kpiCard.changePercent', { value: '+12' }, { defaultValue: '{{value}}%' })}
        </span>
      </div>
      <div>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            cm.sp('mb', 1),
            'text-foreground-secondary uppercase tracking-wider',
          )}
        >
          {t('kpiCard.metricLabel', {}, { defaultValue: 'Total Views' })}
        </p>
        <h3 className={cm.cn(cm.textSize('3xl'), 'font-extrabold text-success tracking-tighter')}>
          {t('kpiCard.metricValue', { count: '24.5k' }, { defaultValue: '{{count}}' })}
        </h3>
      </div>
    </div>
  )
}
export default KpiCard
