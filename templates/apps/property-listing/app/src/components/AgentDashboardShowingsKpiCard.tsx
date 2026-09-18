import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function AgentDashboardShowingsKpiCard({ count = 5 }: { count?: number }) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'xs' }),
        cm.sp('p', 6),
        cm.surface,
        'rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow',
      )}
      data-mol-id="kpi_3"
    >
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          cm.textMuted,
          'uppercase tracking-wider',
        )}
      >
        {t('showingsKpi.title', {}, { defaultValue: 'Showings This Week' })}
      </span>
      <div className={cm.flex({ align: 'end', justify: 'between' })}>
        <span className={cm.cn(cm.textSize('3xl'), 'font-extrabold text-success tracking-tighter')}>
          {count}
        </span>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'text-tertiary bg-tertiary-fixed/30 rounded-md',
          )}
        >
          {t('showingsKpi.today', { count: 2 }, { defaultValue: 'Today: {{count}}' })}
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>event</span>
        </span>
      </div>
    </div>
  )
}
export { AgentDashboardShowingsKpiCard }
