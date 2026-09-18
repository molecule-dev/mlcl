import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface KpiCardProps {
  efficiencyScore: number
  totalLogs: number
  completedCount: number
}

export default function ActivitiesKpiCard({
  efficiencyScore,
  totalLogs,
  completedCount,
}: KpiCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.04)]',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 6), 'gap-2')}>
        <span className={cm.cn(cm.roundedFull, 'w-1.5 h-6 bg-primary')}></span>
        <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface-variant')}>
          {t('activitiesKpiCard.efficiencyScoreLabel', {}, { defaultValue: 'Efficiency Score' })}
        </h3>
      </div>
      <div className={cm.cn(cm.flex({}), cm.sp('mb', 2), 'items-baseline gap-2')}>
        <span className={cm.cn(cm.textSize('4xl'), 'font-black text-on-surface tracking-tighter')}>
          {t(
            'activitiesKpiCard.efficiencyValue',
            { value: efficiencyScore },
            { defaultValue: '{{value}}%' },
          )}
        </span>
      </div>
      <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-foreground-secondary')}>
        {t(
          'activitiesKpiCard.responseRateNote',
          {},
          { defaultValue: 'Activity response rate is above the team average this week.' },
        )}
      </p>
      <div
        className={cm.cn(
          cm.sp('mt', 6),
          cm.sp('pt', 6),
          cm.grid({ cols: 2, gap: 'md' }),
          'border-t border-border',
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
              'text-[10px] uppercase text-foreground-tertiary',
            )}
          >
            {t('activitiesKpiCard.totalLogsLabel', {}, { defaultValue: 'Total Logs' })}
          </p>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
            {totalLogs.toLocaleString()}
          </p>
        </div>
        <div>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
              'text-[10px] uppercase text-foreground-tertiary',
            )}
          >
            {t('common.completed', {}, { defaultValue: 'Completed' })}
          </p>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
            {completedCount}
          </p>
        </div>
      </div>
    </div>
  )
}
export { ActivitiesKpiCard }
