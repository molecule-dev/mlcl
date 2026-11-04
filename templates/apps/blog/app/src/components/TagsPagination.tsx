import { useTranslation } from '@molecule/app-react'
import { useListRoute } from '@molecule/app-routing-react-router'
import { getClassMap } from '@molecule/app-ui'
export default function TagsPagination() {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Page number reads from (and writes to) the URL's ?page= key, so links,
  // Back/Forward and reloads keep the page — no mirrored useState.
  const listRoute = useListRoute({ pageSize: 8 })
  const currentPage = listRoute.page
  const itemsPerPage = listRoute.pageSize
  const totalItems = 18
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const start = (currentPage - 1) * itemsPerPage + 1
  const end = Math.min(currentPage * itemsPerPage, totalItems)
  const goToPage = (page: number): void => {
    if (page !== currentPage) listRoute.setPage(page)
  }
  return (
    <>
      {/* Pagination */}
      <div
        className={cm.cn(
          cm.sp('pt', 8),
          cm.flex({ align: 'center', justify: 'between' }),
          'border-t border-slate-50',
        )}
      >
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}
        >
          {t(
            'tagsPagination.showingRange',
            { start, end, total: totalItems },
            { defaultValue: 'Showing {{start}}–{{end}} of {{total}} tags' },
          )}
        </span>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <button
            onClick={() => goToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'py-1.5 text-on-surface-variant disabled:opacity-50 rounded-lg cursor-not-allowed',
            )}
          >
            <span className={cm.fv5b245ffa}>chevron_left</span>
            {t('common.previous', {}, { defaultValue: 'Previous' })}
          </button>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <button
              onClick={() => goToPage(1)}
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.flex({ align: 'center', justify: 'center' }),
                cm.textSize('sm'),
                'rounded-lg',
                currentPage === 1
                  ? cm.cn(cm.fontWeight('bold'), 'bg-primary text-on-primary')
                  : cm.cn(
                      cm.fontWeight('medium'),
                      'text-on-surface-variant hover:bg-surface-container-low transition-colors',
                    ),
              )}
            >
              1
            </button>
            <button
              onClick={() => goToPage(2)}
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.flex({ align: 'center', justify: 'center' }),
                cm.textSize('sm'),
                'rounded-lg',
                currentPage === 2
                  ? cm.cn(cm.fontWeight('bold'), 'bg-primary text-on-primary')
                  : cm.cn(
                      cm.fontWeight('medium'),
                      'text-on-surface-variant hover:bg-surface-container-low transition-colors',
                    ),
              )}
            >
              2
            </button>
            <button
              onClick={() => goToPage(3)}
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.flex({ align: 'center', justify: 'center' }),
                cm.textSize('sm'),
                'rounded-lg',
                currentPage === 3
                  ? cm.cn(cm.fontWeight('bold'), 'bg-primary text-on-primary')
                  : cm.cn(
                      cm.fontWeight('medium'),
                      'text-on-surface-variant hover:bg-surface-container-low transition-colors',
                    ),
              )}
            >
              3
            </button>
          </div>
          <button
            onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'py-1.5 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors disabled:opacity-50',
            )}
          >
            {t('common.next', {}, { defaultValue: 'Next' })}
            <span className={cm.fv5b245ffa}>chevron_right</span>
          </button>
        </div>
      </div>
    </>
  )
}
export { TagsPagination }
