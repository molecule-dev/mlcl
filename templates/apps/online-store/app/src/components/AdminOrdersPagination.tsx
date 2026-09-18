import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AdminOrdersPagination() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [currentPage, setCurrentPage] = useState(1)
  const totalEntries = 1284
  const pageSize = 10
  const totalPages = Math.ceil(totalEntries / pageSize)
  const startEntry = (currentPage - 1) * pageSize + 1
  const endEntry = Math.min(currentPage * pageSize, totalEntries)
  return (
    <>
      {/* Pagination */}
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          'bg-surface border-t border-border',
        )}
        data-mol-id="pagination"
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
          {t(
            'adminOrdersPagination.showingResults',
            { start: startEntry, end: endEntry, total: totalEntries.toLocaleString() },
            { defaultValue: 'Showing {{start}} to {{end}} of {{total}} entries' },
          )}
        </p>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
          <button
            className={cm.cn(
              cm.sp('p', 2),
              'text-foreground-tertiary hover:text-foreground-secondary disabled:opacity-40',
            )}
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <span className={cm.cn('material-symbols-outlined')}>chevron_left</span>
          </button>
          <button
            className={
              currentPage === 1
                ? cm.cn(
                    cm.w(8),
                    cm.h(8),
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'rounded-lg bg-primary text-on-primary',
                  )
                : cm.cn(
                    cm.w(8),
                    cm.h(8),
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'rounded-lg text-foreground-secondary hover:bg-surface-secondary',
                  )
            }
            data-mol-id="page-1"
            onClick={() => setCurrentPage(1)}
          >
            1
          </button>
          <button
            className={
              currentPage === 2
                ? cm.cn(
                    cm.w(8),
                    cm.h(8),
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'rounded-lg bg-primary text-on-primary',
                  )
                : cm.cn(
                    cm.w(8),
                    cm.h(8),
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'rounded-lg text-foreground-secondary hover:bg-surface-secondary',
                  )
            }
            data-mol-id="page-2"
            onClick={() => setCurrentPage(2)}
          >
            2
          </button>
          <button
            className={
              currentPage === 3
                ? cm.cn(
                    cm.w(8),
                    cm.h(8),
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'rounded-lg bg-primary text-on-primary',
                  )
                : cm.cn(
                    cm.w(8),
                    cm.h(8),
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'rounded-lg text-foreground-secondary hover:bg-surface-secondary',
                  )
            }
            data-mol-id="page-3"
            onClick={() => setCurrentPage(3)}
          >
            3
          </button>
          <span className={cm.cn(cm.sp('px', 2), 'text-foreground-tertiary')}>
            {t('common.ellipsis', {}, { defaultValue: '...' })}
          </span>
          <button
            className={
              currentPage === totalPages
                ? cm.cn(
                    cm.w(8),
                    cm.h(8),
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'rounded-lg bg-primary text-on-primary',
                  )
                : cm.cn(
                    cm.w(8),
                    cm.h(8),
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'rounded-lg text-foreground-secondary hover:bg-surface-secondary',
                  )
            }
            data-mol-id="page-last"
            onClick={() => setCurrentPage(totalPages)}
          >
            {totalPages}
          </button>
          <button
            className={cm.cn(
              cm.sp('p', 2),
              'text-foreground-tertiary hover:text-foreground-secondary disabled:opacity-40',
            )}
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            <span className={cm.cn('material-symbols-outlined')}>chevron_right</span>
          </button>
        </div>
      </div>
    </>
  )
}

export default AdminOrdersPagination
export { AdminOrdersPagination }
