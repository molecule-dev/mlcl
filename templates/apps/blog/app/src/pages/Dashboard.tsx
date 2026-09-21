// Phase 1 baseline — verbatim JSX of design-blog-dashboard.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import DashboardRightSidebar from '../components/DashboardRightSidebar.js'
import DashboardWelcomeHeader from '../components/DashboardWelcomeHeader.js'
import EngagementTrendsSection from '../components/EngagementTrendsSection.js'
import KpiCardsSection from '../components/KpiCardsSection.js'
import MobileTopBar from '../components/MobileTopBar.js'
import RecentPostsSection from '../components/RecentPostsSection.js'
import SideNavBar from '../components/SideNavBar.js'
import TopNavBar from '../components/TopNavBar.js'
function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pageTitle = t('nav.dashboard', {}, { defaultValue: 'Dashboard' })
  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])
  return (
    <>
      {/* SideNavBar Component */}
      <SideNavBar />
      <TopNavBar />
      {/* Mobile chrome (renders nothing on desktop) */}
      <MobileTopBar />
      {/* Main Content Area */}
      <main
        aria-label={pageTitle}
        className={cm.cn(cm.minH('screen'), 'md:ml-[240px] pt-24 bg-surface-container-low/30')}
      >
        <div className={cm.cn(cm.mxAuto, cm.sp('p', 10), cm.stack(10), 'max-w-[1440px]')}>
          {/* Welcome Header */}
          <DashboardWelcomeHeader />
          {/* KPI Cards Row */}
          <KpiCardsSection />
          {/* Dashboard Layout: Content & Sidebar */}
          <div
            className={cm.cn(cm.flex({ direction: 'col' }), 'gap-10 lg:flex-row lg:items-start')}
          >
            {/* Recent Posts Section */}
            <RecentPostsSection />
            {/* Right Sidebar: Quick Actions */}
            <DashboardRightSidebar />
          </div>
          {/* Bottom Section: Engagement Chart */}
          <EngagementTrendsSection />
        </div>
      </main>
    </>
  )
}

export default Dashboard
export { Dashboard, Dashboard as DashboardPage }
