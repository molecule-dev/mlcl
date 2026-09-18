import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AgentDashboardAvgDaysKpiCard from './AgentDashboardAvgDaysKpiCard.js'
import AgentDashboardKpiCard from './AgentDashboardKpiCard.js'
import AgentDashboardShowingsKpiCard from './AgentDashboardShowingsKpiCard.js'

interface KpiStats {
  active_listings: number
  pending_leads: number
  upcoming_showings: number
  avg_days_on_market: number
}
function AgentDashboardKpiSection({ stats }: { stats: KpiStats }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4')}
      data-mol-id="kpi_section"
    >
      {/* Active Listings */}
      <Link to="/admin/listings" className={cm.cn('contents')} onClick={(e) => e.stopPropagation()}>
        <AgentDashboardKpiCard
          title={t('agentDashboard.activeListings', {}, { defaultValue: 'Active Listings' })}
          value={String(stats.active_listings)}
          trendLabel={t('agentDashboard.trendUp', { count: 2 }, { defaultValue: '+{{count}}' })}
          trendIcon="trending_up"
          trendColorClass="text-success bg-success-light"
        />
      </Link>
      <Link to="/admin/leads" className={cm.cn('contents')} onClick={(e) => e.stopPropagation()}>
        <AgentDashboardKpiCard
          title={t('agentDashboard.pendingLeads', {}, { defaultValue: 'Pending Leads' })}
          value={String(stats.pending_leads)}
          trendLabel={t('agentDashboard.trendStable', {}, { defaultValue: 'Stable' })}
          trendIcon="remove"
          trendColorClass="text-secondary bg-secondary/5"
        />
      </Link>
      {/* Showings This Week */}
      <Link to="/admin/showings" className={cm.cn('contents')} onClick={(e) => e.stopPropagation()}>
        <AgentDashboardShowingsKpiCard count={stats.upcoming_showings} />
      </Link>
      {/* Avg Days on Market */}
      <Link
        to="/admin/analytics"
        className={cm.cn('contents')}
        onClick={(e) => e.stopPropagation()}
      >
        <AgentDashboardAvgDaysKpiCard avgDays={stats.avg_days_on_market} />
      </Link>
    </section>
  )
}

export default AgentDashboardKpiSection
export { AgentDashboardKpiSection }
