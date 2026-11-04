import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function TransactionPagination({
  currentPage,
  totalItems,
  itemsPerPage,
  shownItems,
  onPageChange,
}: {
  currentPage: number
  totalItems: number
  itemsPerPage: number
  shownItems: number
  onPageChange: (page: number) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
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
        cm.sp('p', 6),
        cm.flex({ align: 'center', justify: 'between' }),
        'border-t border-surface-container-high bg-surface',
      )}
    >
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'text-foreground-tertiary font-headline uppercase tracking-wider',
        )}
      >
        {t(
          'transactionPagination.showing',
          { shown: shownItems, total: totalItems },
          { defaultValue: 'Showing {{shown}} of {{total}} transactions' },
        )}
      </p>
      <div className={cm.flex({ align: 'center', gap: 'xs' })}>
        <button
          className={cm.button({ variant: 'ghost', size: 'sm' })}
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          {t('common.previous', {}, { defaultValue: 'Previous' })}
        </button>
        {pages.map((page, index) => (
          <span key={page}>
            {index > 0 && page > pages[index - 1]! + 1 && (
              <span className={cm.sp('px', 2)}>
                {t('transactionPagination.morePages', {}, { defaultValue: '...' })}
              </span>
            )}
            <button
              className={cm.button({
                variant: currentPage === page ? 'solid' : 'ghost',
                size: 'sm',
              })}
              aria-current={currentPage === page ? 'page' : undefined}
              onClick={() => goToPage(page)}
            >
              {t('transactionPagination.pageNumber', { page }, { defaultValue: '{{page}}' })}
            </button>
          </span>
        ))}
        <button
          className={cm.button({ variant: 'ghost', size: 'sm' })}
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          {t('common.next', {}, { defaultValue: 'Next' })}
          <span className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}>
            chevron_right
          </span>
        </button>
      </div>
    </div>
  )
}
export { TransactionPagination }
