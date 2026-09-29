// Phase 1 baseline — verbatim JSX of design-online-store-admin-orders.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AdminOrdersFiltersBar from '../components/AdminOrdersFiltersBar.js'
import AdminOrdersPageHeader from '../components/AdminOrdersPageHeader.js'
import AdminOrdersStatsGrid from '../components/AdminOrdersStatsGrid.js'
import AdminOrdersTable from '../components/AdminOrdersTable.js'
import AdminOrdersTopBar from '../components/AdminOrdersTopBar.js'
import AdminSideNav from '../components/AdminSideNav.js'
function AdminOrdersPage() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div className={cm.cn('bg-surface-secondary text-foreground antialiased')}>
      {/* Top Header Bar (Shared Component: TopNavBar) */}
      <AdminOrdersTopBar />
      <div className={cm.cn(cm.flex(), 'min-h-screen')}>
        <AdminSideNav />
        {/* Main Content Canvas */}
        <main
          aria-label={t('admin.orders.regionLabel', {}, { defaultValue: 'Admin orders' })}
          className={cm.cn(
            cm.flex1,
            cm.sp('p', 8),
            'ml-0 md:ml-[260px] bg-surface-secondary min-h-screen',
          )}
          data-mol-id="main-content"
        >
          <div className={cm.stack(8)}>
            {/* Page Header */}
            <AdminOrdersPageHeader />
            {/* Stats Row */}
            <AdminOrdersStatsGrid />
            {/* Filters Bar */}
            <AdminOrdersFiltersBar />
            {/* Orders Table */}
            <AdminOrdersTable />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdminOrdersPage
export { AdminOrdersPage, AdminOrdersPage as AdminOrdersPagePage }
