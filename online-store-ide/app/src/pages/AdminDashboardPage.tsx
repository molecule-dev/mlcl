// Phase 1 baseline — verbatim JSX of design-online-store-admin-dashboard.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AdminDashboardKpiGrid from '../components/AdminDashboardKpiGrid.js'
import AdminDashboardLowStockAlerts from '../components/AdminDashboardLowStockAlerts.js'
import AdminDashboardRecentOrdersTable from '../components/AdminDashboardRecentOrdersTable.js'
import AdminDashboardRevenueChart from '../components/AdminDashboardRevenueChart.js'
import AdminDashboardSideNav from '../components/AdminDashboardSideNav.js'
import AdminDashboardTopNavBar from '../components/AdminDashboardTopNavBar.js'
import AdminDashboardTopProducts from '../components/AdminDashboardTopProducts.js'
import AdminDashboardWelcomeSection from '../components/AdminDashboardWelcomeSection.js'
function AdminDashboardPage() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div className={cm.cn('bg-surface-secondary/50 text-text-primary antialiased')}>
      {/* Shared Component: SideNavBar */}
      <AdminDashboardSideNav />
      {/* Shared Component: TopNavBar */}
      <AdminDashboardTopNavBar />
      {/* Main Content Canvas */}
      <main
        aria-label={t('admin.dashboard.regionLabel', {}, { defaultValue: 'Admin dashboard' })}
        className={cm.cn(cm.sp('pt', 16), cm.minH('screen'), 'ml-64')}
      >
        <div className={cm.cn(cm.sp('p', 8), cm.maxW('[1280px]'), cm.mxAuto, cm.stack(8))}>
          {/* Welcome Section */}
          <AdminDashboardWelcomeSection />
          {/* KPI Cards Grid */}
          <AdminDashboardKpiGrid />
          {/* Dashboard Body Grid */}
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'lg:grid-cols-3')}>
            {/* Revenue Chart Section */}
            <div className={cm.cn(cm.stack(8), 'lg:col-span-2')}>
              <AdminDashboardRevenueChart />
              <AdminDashboardRecentOrdersTable />
            </div>
            {/* Right Column Sidebars */}
            <div className={cm.stack(8)}>
              {/* Top Products */}
              <AdminDashboardTopProducts />
              {/* Low Stock Alerts */}
              <AdminDashboardLowStockAlerts />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminDashboardPage
export { AdminDashboardPage, AdminDashboardPage as AdminDashboardPagePage }
