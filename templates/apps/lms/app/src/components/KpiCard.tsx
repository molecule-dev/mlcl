import { KpiCard as KpiCardBase, KpiCardTrend } from '@molecule/app-kpi-card-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useDashboardStats } from '../lib/useDashboardStats.js'

/**
 * Dashboard "Active Courses" KPI tile.
 *
 * Was originally a "Study Hours" tile that displayed a hardcoded value.
 * The schema has no time-tracking surface, so we replaced the metric
 * with one we can compute honestly: the count of `enrollments` rows for
 * the current user. Same shared `<KpiCardBase>` primitive — only the
 * label, value, icon, and trend changed.
 */
function KpiCard() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const { stats, loading } = useDashboardStats()
  const value = loading
    ? '—'
    : t('kpiCard.metricValue', { count: stats?.activeCourses ?? 0 }, { defaultValue: '{{count}}' })
  return (
    <KpiCardBase
      title={t('kpiCard.metricLabel', {}, { defaultValue: 'Active Courses' })}
      value={value}
      icon={
        <span className={cm.cn(cm.sp('p', 2), 'bg-primary-container/30 rounded-lg')}>
          <span
            className={cm.cn('material-symbols-outlined', cm.textPrimary)}
            data-icon="menu_book"
          >
            menu_book
          </span>
        </span>
      }
      trend={
        stats?.activeCourses && stats.activeCourses > 0 ? (
          <KpiCardTrend delta={stats.activeCourses} />
        ) : undefined
      }
      upperLabel
      emphasizeValue
      hoverLift
    />
  )
}
export default KpiCard
export { KpiCard }
