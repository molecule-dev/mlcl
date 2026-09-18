import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function TransactionPagination() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [currentPage, setCurrentPage] = useState(1)
  const totalItems = 248
  const itemsPerPage = 12
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)
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
          { shown: endItem - startItem + 1, total: totalItems },
          { defaultValue: 'Showing {{shown}} of {{total}} transactions' },
        )}
      </p>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
        <button
          className={cm.cn(
            'w-9 h-9 flex items-center justify-center rounded-lg font-bold text-sm transition-colors',
            currentPage === 1
              ? 'bg-success-light text-success'
              : 'text-foreground-secondary hover:bg-surface-secondary',
          )}
          onClick={() => setCurrentPage(1)}
        >
          {t('transactionPagination.pageNumber', { page: 1 }, { defaultValue: '{{page}}' })}
        </button>
        <button
          className={cm.cn(
            'w-9 h-9 flex items-center justify-center rounded-lg font-bold text-sm transition-colors',
            currentPage === 2
              ? 'bg-success-light text-success'
              : 'text-foreground-secondary hover:bg-surface-secondary',
          )}
          onClick={() => setCurrentPage(2)}
        >
          {t('transactionPagination.pageNumber', { page: 2 }, { defaultValue: '{{page}}' })}
        </button>
        <button
          className={cm.cn(
            'w-9 h-9 flex items-center justify-center rounded-lg font-bold text-sm transition-colors',
            currentPage === 3
              ? 'bg-success-light text-success'
              : 'text-foreground-secondary hover:bg-surface-secondary',
          )}
          onClick={() => setCurrentPage(3)}
        >
          {t('transactionPagination.pageNumber', { page: 3 }, { defaultValue: '{{page}}' })}
        </button>
        <span className={cm.cn(cm.sp('px', 2), 'text-foreground-tertiary')}>
          {t('transactionPagination.morePages', {}, { defaultValue: '...' })}
        </span>
        <button
          className={cm.cn(
            cm.sp('px', 4),
            cm.h(9),
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-lg text-foreground-secondary hover:bg-surface-secondary transition-colors',
          )}
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
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
