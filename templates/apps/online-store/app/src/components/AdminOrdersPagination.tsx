import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AdminOrdersPagination({
  currentPage,
  totalEntries,
  pageSize,
  onPageChange,
}: {
  currentPage: number
  totalEntries: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize))
  const offset = (currentPage - 1) * pageSize
  const startEntry = totalEntries > offset ? offset + 1 : 0
  const endEntry = startEntry ? Math.min(currentPage * pageSize, totalEntries) : 0
  const pages = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages])]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b)
  const goToPage = (next: number): void => {
    const page = Math.max(1, Math.min(totalPages, next))
    if (page !== currentPage) onPageChange(page)
  }
  return (
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
      <div className={cm.flex({ align: 'center', gap: 1 })}>
        <button
          className={cm.button({ variant: 'ghost', size: 'sm' })}
          disabled={currentPage <= 1}
          onClick={() => goToPage(currentPage - 1)}
          aria-label={t('common.previous', {}, { defaultValue: 'Previous' })}
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        {pages.map((page, index) => (
          <span key={page}>
            {index > 0 && page > pages[index - 1]! + 1 && (
              <span className={cm.sp('px', 2)}>
                {t('common.ellipsis', {}, { defaultValue: '...' })}
              </span>
            )}
            <button
              className={cm.button({
                variant: currentPage === page ? 'solid' : 'ghost',
                size: 'sm',
              })}
              data-mol-id={page === totalPages && page > 3 ? 'page-last' : 'page-' + page}
              aria-current={currentPage === page ? 'page' : undefined}
              onClick={() => goToPage(page)}
            >
              {page}
            </button>
          </span>
        ))}
        <button
          className={cm.button({ variant: 'ghost', size: 'sm' })}
          disabled={currentPage >= totalPages}
          onClick={() => goToPage(currentPage + 1)}
          aria-label={t('common.next', {}, { defaultValue: 'Next' })}
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </div>
  )
}
export default AdminOrdersPagination
export { AdminOrdersPagination }
