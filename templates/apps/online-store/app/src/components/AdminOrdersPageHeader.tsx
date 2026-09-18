import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
export default function AdminOrdersPageHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(cm.flex({ justify: 'between', align: 'end' }), cm.sp('mb', 8))}
      data-mol-id="page-header"
    >
      <div>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold text-foreground tracking-tight')}>
          {t('adminOrdersPageHeader.title', {}, { defaultValue: 'Orders' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), 'text-foreground-secondary')}>
          {t(
            'adminOrdersPageHeader.subtitle',
            {},
            { defaultValue: 'Manage and track all customer orders' },
          )}
        </p>
      </div>
      <Link
        className={cm.cn(
          'flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-lg text-sm font-semibold text-foreground hover:bg-surface-secondary transition-colors shadow-sm',
        )}
        data-mol-id="export-btn"
        to="/orders"
      >
        <span
          className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
          data-icon="download"
        >
          download
        </span>

        {t('adminOrdersPageHeader.export', {}, { defaultValue: 'Export Orders' })}
      </Link>
    </div>
  )
}
export { AdminOrdersPageHeader }
