import { useTranslation } from '@molecule/app-react'
import { useListRoute } from '@molecule/app-routing-react-router'
import { getClassMap } from '@molecule/app-ui'

function AdminOrdersPagination() {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Page number reads from (and writes to) the URL's ?page= key, so links,
  // Back/Forward and reloads keep the page — no mirrored useState.
  const listRoute = useListRoute({ pageSize: 10 })
  const currentPage = listRoute.page
  const totalEntries = 1284
  const pageSize = listRoute.pageSize
  const totalPages = Math.ceil(totalEntries / pageSize)
  const startEntry = (currentPage - 1) * pageSize + 1
  const endEntry = Math.min(currentPage * pageSize, totalEntries)
  const goToPage = (page: number): void => {
    if (page !== currentPage) listRoute.setPage(page)
  }
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
            onClick={() => goToPage(Math.max(1, currentPage - 1))}
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
            onClick={() => goToPage(1)}
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
            onClick={() => goToPage(2)}
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
            onClick={() => goToPage(3)}
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
            onClick={() => goToPage(totalPages)}
          >
            {totalPages}
          </button>
          <button
            className={cm.cn(
              cm.sp('p', 2),
              'text-foreground-tertiary hover:text-foreground-secondary disabled:opacity-40',
            )}
            disabled={currentPage === totalPages}
            onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
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
