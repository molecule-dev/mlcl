import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TicketCounts {
  open: number
  pending: number
  resolved: number
  overdue: number
}
function DashboardKpiRow({
  counts = { open: 42, pending: 8, resolved: 156, overdue: 3 },
  slaCompliance,
  loading = false,
}: {
  counts?: TicketCounts
  slaCompliance?: number
  loading?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const totalTickets = counts.open + counts.pending + counts.resolved
  const resolutionRate = totalTickets > 0 ? Math.round((counts.resolved / totalTickets) * 100) : 94
  // Real SLA compliance (resolution target vs elapsed) when provided; fall back to the resolution
  // rate only until the caller supplies it.
  const slaValue = slaCompliance ?? resolutionRate
  return (
    <div className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'md:grid-cols-2 lg:grid-cols-4')}>
      {/* KPI Card 1 */}
      <div
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-xl border-t-4 border-primary editorial-shadow',
        )}
      >
        <div className={cm.flex({ justify: 'between', align: 'start' })}>
          <span
            className={cm.cn(
              cm.sp('p', 2),
              cm.textPrimary,
              'material-symbols-outlined bg-primary/10 rounded-lg',
            )}
            data-icon="assignment_late"
          >
            assignment_late
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 1 }),
              'text-error',
            )}
          >
            {t('dashboardKpiRow.openTrend', { change: '+12' }, { defaultValue: '{{change}}%' })}
            <span
              className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}
              data-icon="trending_up"
            >
              trending_up
            </span>
          </span>
        </div>
        <p
          className={cm.cn(
            cm.textSize('4xl'),
            cm.sp('mt', 4),
            cm.fontWeight('bold'),
            'text-on-surface',
          )}
        >
          {loading ? t('common.loading', {}, { defaultValue: '—' }) : counts.open}
        </p>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'text-on-surface-variant uppercase tracking-wider',
          )}
        >
          {t('dashboardKpiRow.openTickets', {}, { defaultValue: 'Open Tickets' })}
        </p>
      </div>
      {/* KPI Card 2 */}
      <div
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-xl border-t-4 border-primary editorial-shadow',
        )}
      >
        <div className={cm.flex({ justify: 'between', align: 'start' })}>
          <span
            className={cm.cn(
              cm.sp('p', 2),
              cm.textPrimary,
              'material-symbols-outlined bg-primary/10 rounded-lg',
            )}
            data-icon="schedule"
          >
            schedule
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 1 }),
              'text-success',
            )}
          >
            {t(
              'dashboardKpiRow.responseTrend',
              { change: '-0.4' },
              { defaultValue: '{{change}}h' },
            )}
            <span
              className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}
              data-icon="trending_down"
            >
              trending_down
            </span>
          </span>
        </div>
        <p
          className={cm.cn(
            cm.textSize('4xl'),
            cm.sp('mt', 4),
            cm.fontWeight('bold'),
            'text-on-surface',
          )}
        >
          {t('dashboardKpiRow.responseTimeValue', { value: '2.4' }, { defaultValue: '{{value}}h' })}
        </p>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'text-on-surface-variant uppercase tracking-wider',
          )}
        >
          {t('dashboardKpiRow.avgResponseTime', {}, { defaultValue: 'Avg Response Time' })}
        </p>
      </div>
      {/* KPI Card 3 */}
      <div
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-xl border-t-4 border-primary editorial-shadow',
        )}
      >
        <div className={cm.flex({ justify: 'between', align: 'start' })}>
          <span
            className={cm.cn(
              cm.sp('p', 2),
              cm.textPrimary,
              'material-symbols-outlined bg-primary/10 rounded-lg',
            )}
            data-icon="verified"
          >
            verified
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 1 }),
              'text-error',
            )}
          >
            {t('dashboardKpiRow.slaTrend', { change: '-2' }, { defaultValue: '{{change}}%' })}
            <span
              className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}
              data-icon="trending_down"
            >
              trending_down
            </span>
          </span>
        </div>
        <p
          className={cm.cn(
            cm.textSize('4xl'),
            cm.sp('mt', 4),
            cm.fontWeight('bold'),
            'text-on-surface',
          )}
        >
          {loading
            ? t('common.loading', {}, { defaultValue: '—' })
            : t(
                'dashboardKpiRow.resolutionRateValue',
                { rate: slaValue },
                { defaultValue: '{{rate}}%' },
              )}
        </p>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'text-on-surface-variant uppercase tracking-wider',
          )}
        >
          {t('dashboardKpiRow.slaCompliance', {}, { defaultValue: 'SLA Compliance' })}
        </p>
      </div>
      {/* KPI Card 4 */}
      <div
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-xl border-t-4 border-primary editorial-shadow',
        )}
      >
        <div className={cm.flex({ justify: 'between', align: 'start' })}>
          <span
            className={cm.cn(
              cm.sp('p', 2),
              cm.textPrimary,
              'material-symbols-outlined bg-primary/10 rounded-lg',
            )}
            data-icon="thumb_up"
          >
            thumb_up
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 1 }),
              'text-success',
            )}
          >
            {t(
              'dashboardKpiRow.satisfactionTrend',
              { change: '+0.2' },
              { defaultValue: '{{change}}' },
            )}
            <span
              className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}
              data-icon="trending_up"
            >
              trending_up
            </span>
          </span>
        </div>
        <p className={cm.cn(cm.textSize('4xl'), cm.sp('mt', 4), 'font-black text-on-surface')}>
          {t('dashboardKpiRow.satisfactionValue', { value: '4.6' }, { defaultValue: '{{value}}' })}
          <span
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('normal'),
              'text-foreground-tertiary',
            )}
          >
            {t('dashboardKpiRow.ratingMax', { max: 5 }, { defaultValue: '/{{max}}' })}
          </span>
        </p>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-on-surface-variant uppercase tracking-wider',
          )}
        >
          {t('dashboardKpiRow.customerSatisfaction', {}, { defaultValue: 'Customer Satisfaction' })}
        </p>
      </div>
    </div>
  )
}

export default DashboardKpiRow
export { DashboardKpiRow }
