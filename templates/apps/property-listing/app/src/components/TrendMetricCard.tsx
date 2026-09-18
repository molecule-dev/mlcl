import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function TrendMetricCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'xs' }),
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow',
      )}
      data-mol-id="trend_metric_card"
    >
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'text-foreground-secondary uppercase tracking-wider',
        )}
      >
        {t('trendMetricCard.metricLabel', {}, { defaultValue: 'Avg Days on Market' })}
      </span>
      <div className={cm.flex({ align: 'end', justify: 'between' })}>
        <span className={cm.cn(cm.textSize('3xl'), 'font-extrabold text-success tracking-tighter')}>
          {t('trendMetricCard.value', { value: 18 }, { defaultValue: '{{value}}' })}
        </span>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'text-success bg-success-light rounded-md',
          )}
        >
          {t('trendMetricCard.trendChange', { days: -2 }, { defaultValue: '{{days}} days' })}
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
            arrow_downward
          </span>
        </span>
      </div>
    </div>
  )
}

export default TrendMetricCard
export { TrendMetricCard }
