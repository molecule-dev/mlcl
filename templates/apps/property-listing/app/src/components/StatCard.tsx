import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function StatCard({ leadsCount }: { leadsCount?: number | null }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'xs' }),
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }))}>
        <span
          className={cm.cn(
            cm.textPrimary,
            cm.sp('p', 3),
            cm.roundedFull,
            'material-symbols-outlined bg-primary-fixed/30',
          )}
          data-icon="hub"
        >
          hub
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
          {t('statCard.growth', { percent: 5 }, { defaultValue: '+{{percent}}%' })}
        </span>
      </div>
      <div>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'text-foreground-secondary uppercase tracking-wider',
          )}
        >
          {t('statCard.totalLeads', {}, { defaultValue: 'Total Leads' })}
        </p>
        <h3 className={cm.cn(cm.textSize('3xl'), 'text-success font-extrabold tracking-tighter')}>
          {leadsCount ?? 84}
        </h3>
      </div>
    </div>
  )
}

export default StatCard
export { StatCard }
