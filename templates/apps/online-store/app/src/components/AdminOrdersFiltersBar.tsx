import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useAdminOrdersRoute } from '../utils/adminOrdersRoute.js'

function AdminOrdersFiltersBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const list = useAdminOrdersRoute()
  const { status, date } = list.filters
  const search = list.filters.q ?? ''
  const [advancedOpen, setAdvancedOpen] = useState(false)
  return (
    <div
      className={cm.cn(
        cm.sp('p', 4),
        cm.sp('mb', 6),
        cm.flex({ align: 'center', wrap: 'wrap', gap: 4 }),
        'bg-surface rounded-xl shadow-sm border border-border',
      )}
      data-mol-id="filters-bar"
    >
      <div className={cm.cn(cm.flex1, cm.maxW('sm'), 'relative min-w-[280px]')}>
        <span
          className={cm.cn(
            cm.textSize('lg'),
            'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary',
          )}
        >
          search
        </span>
        <input
          className={cm.cn(
            cm.w('full'),
            cm.sp('pl', 10),
            cm.sp('pr', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'border-border rounded-lg focus:ring-green-500/20 focus:border-green-500 transition-all',
          )}
          data-mol-id="order-search"
          aria-label={t(
            'adminOrdersFiltersBar.searchAriaLabel',
            {},
            { defaultValue: 'Search orders' },
          )}
          placeholder={t(
            'adminOrdersFiltersBar.searchPlaceholder',
            {},
            { defaultValue: 'Search customer, ID...' },
          )}
          type="text"
          value={search}
          onChange={(e) => list.setFilters({ q: e.target.value || undefined }, { replace: true })}
        />
      </div>
      <select
        className={cm.cn(
          cm.textSize('sm'),
          'border-border rounded-lg focus:ring-green-500/20 focus:border-green-500 transition-all min-w-[140px]',
        )}
        data-mol-id="status-filter"
        aria-label={t(
          'adminOrdersFiltersBar.statusAriaLabel',
          {},
          { defaultValue: 'Filter by status' },
        )}
        value={status}
        onChange={(e) => list.setFilters({ status: e.target.value })}
      >
        <option value="">
          {t('adminOrdersFiltersBar.statusAll', {}, { defaultValue: 'All Status' })}
        </option>
        <option value="pending">{t('status.pending', {}, { defaultValue: 'Pending' })}</option>
        <option value="processing">
          {t('adminOrdersFiltersBar.statusProcessing', {}, { defaultValue: 'Processing' })}
        </option>
        <option value="shipped">
          {t('adminOrdersFiltersBar.statusShipped', {}, { defaultValue: 'Shipped' })}
        </option>
        <option value="delivered">
          {t('adminOrdersFiltersBar.statusDelivered', {}, { defaultValue: 'Delivered' })}
        </option>
        <option value="cancelled">
          {t('adminOrdersFiltersBar.statusCancelled', {}, { defaultValue: 'Cancelled' })}
        </option>
      </select>
      <select
        className={cm.cn(
          cm.textSize('sm'),
          'border-border rounded-lg focus:ring-green-500/20 focus:border-green-500 transition-all min-w-[140px]',
        )}
        data-mol-id="date-filter"
        aria-label={t(
          'adminOrdersFiltersBar.dateAriaLabel',
          {},
          { defaultValue: 'Filter by date' },
        )}
        value={date}
        onChange={(e) => list.setFilters({ date: e.target.value })}
      >
        <option value="all">
          {t('adminOrdersFiltersBar.dateAll', {}, { defaultValue: 'All Time' })}
        </option>
        <option value="today">{t('status.today', {}, { defaultValue: 'Today' })}</option>
        <option value="7d">
          {t(
            'adminOrdersFiltersBar.dateLastNDays',
            { days: 7 },
            { defaultValue: 'Last {{days}} Days' },
          )}
        </option>
        <option value="30d">
          {t(
            'adminOrdersFiltersBar.dateLastNDays',
            { days: 30 },
            { defaultValue: 'Last {{days}} Days' },
          )}
        </option>
      </select>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'ml-auto')}>
        <button
          className={cm.cn(
            cm.sp('p', 2),
            'text-foreground-tertiary hover:text-foreground-secondary hover:bg-surface-secondary rounded-lg transition-colors',
          )}
          aria-label={t(
            'adminOrdersFiltersBar.advancedFiltersLabel',
            {},
            { defaultValue: 'Advanced filters' },
          )}
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((o) => !o)}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="filter_list">
            filter_list
          </span>
        </button>
      </div>
    </div>
  )
}
export default AdminOrdersFiltersBar
export { AdminOrdersFiltersBar }
