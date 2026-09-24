// Phase 1 baseline — verbatim JSX of design-blog-dashboard.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AppShell from '../components/AppShell.js'
import DashboardRightSidebar from '../components/DashboardRightSidebar.js'
import DashboardWelcomeHeader from '../components/DashboardWelcomeHeader.js'
import EngagementTrendsSection from '../components/EngagementTrendsSection.js'
import KpiCardsSection from '../components/KpiCardsSection.js'
import RecentPostsSection from '../components/RecentPostsSection.js'
function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pageTitle = t('nav.dashboard', {}, { defaultValue: 'Dashboard' })
  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])
  return (
    <AppShell title={pageTitle} search contentClassName={cm.cn('pt-8 bg-surface-container-low/30')}>
      {/* Main Content Area */}
      <div className={cm.cn(cm.mxAuto, cm.sp('p', 10), cm.stack(10), 'max-w-[1440px]')}>
        {/* Welcome Header */}
        <DashboardWelcomeHeader />
        {/* KPI Cards Row */}
        <KpiCardsSection />
        {/* Dashboard Layout: Content & Sidebar */}
        <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-10 lg:flex-row lg:items-start')}>
          {/* Recent Posts Section */}
          <RecentPostsSection />
          {/* Right Sidebar: Quick Actions */}
          <DashboardRightSidebar />
        </div>
        {/* Bottom Section: Engagement Chart */}
        <EngagementTrendsSection />
      </div>
    </AppShell>
  )
}

export default Dashboard
export { Dashboard, Dashboard as DashboardPage }
