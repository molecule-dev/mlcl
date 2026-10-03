// Phase 1 baseline — verbatim JSX of design-online-store-admin-orders.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AdminLayout } from '../components/AdminLayout.js'
import AdminOrdersFiltersBar from '../components/AdminOrdersFiltersBar.js'
import AdminOrdersPageHeader from '../components/AdminOrdersPageHeader.js'
import AdminOrdersStatsGrid from '../components/AdminOrdersStatsGrid.js'
import AdminOrdersTable from '../components/AdminOrdersTable.js'
import AdminOrdersTopBar from '../components/AdminOrdersTopBar.js'
function AdminOrdersPage() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <AdminLayout>
      <div className={cm.cn('bg-surface-secondary text-foreground antialiased')}>
        {/* Page header bar (search/notifications chrome — the nav shell lives
            in AdminLayout) */}
        <AdminOrdersTopBar />
        {/* Main Content Canvas */}
        <section
          aria-label={t('admin.orders.regionLabel', {}, { defaultValue: 'Admin orders' })}
          className={cm.cn(cm.flex1, cm.sp('p', 8), 'bg-surface-secondary')}
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
        </section>
      </div>
    </AdminLayout>
  )
}

export default AdminOrdersPage
export { AdminOrdersPage, AdminOrdersPage as AdminOrdersPagePage }
