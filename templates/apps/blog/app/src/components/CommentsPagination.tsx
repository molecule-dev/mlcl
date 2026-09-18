import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function CommentsPagination() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [currentPage, setCurrentPage] = useState(1)
  const totalItems = 47
  const itemsPerPage = 6
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)
  const goToPage = (page: number) => setCurrentPage(page)
  const handlePrev = () => setCurrentPage((p) => Math.max(1, p - 1))
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1))
  return (
    <>
      {/* Pagination (Asymmetric Editorial Style) */}
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('mt', 12),
          cm.sp('pt', 8),
          'border-t border-outline-variant/10',
        )}
      >
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}>
          {t('commentsPagination.showing', {}, { defaultValue: 'Showing' })}
          <span className={cm.cn('text-on-surface')}>
            {t(
              'commentsPagination.range',
              { start: startItem, end: endItem },
              { defaultValue: '{{start}}-{{end}}' },
            )}
          </span>
          {t(
            'commentsPagination.totalComments',
            { count: totalItems },
            { defaultValue: 'of {{count}} comments' },
          )}
        </p>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <button
            onClick={handlePrev}
            disabled={currentPage === 1}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              'rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <span className={cm.fv5b245ffa}>chevron_left</span>
          </button>
          <div className={cm.flex({ align: 'center', gap: 'xs' })}>
            <button
              onClick={() => goToPage(1)}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                `rounded-lg ${currentPage === 1 ? 'bg-primary text-on-primary ' + cm.fontWeight('bold') : 'text-on-surface-variant hover:bg-surface-container-low'}`,
              )}
            >
              1
            </button>
            <button
              onClick={() => goToPage(2)}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                `rounded-lg ${currentPage === 2 ? 'bg-primary text-on-primary ' + cm.fontWeight('bold') : 'text-on-surface-variant hover:bg-surface-container-low'}`,
              )}
            >
              2
            </button>
            <button
              onClick={() => goToPage(3)}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                `rounded-lg ${currentPage === 3 ? 'bg-primary text-on-primary ' + cm.fontWeight('bold') : 'text-on-surface-variant hover:bg-surface-container-low'}`,
              )}
            >
              3
            </button>
            <span className={cm.cn(cm.sp('px', 2), 'text-on-surface-variant/40')}>
              {t('common.ellipsis', {}, { defaultValue: '...' })}
            </span>
            <button
              onClick={() => goToPage(8)}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                `rounded-lg ${currentPage === 8 ? 'bg-primary text-on-primary ' + cm.fontWeight('bold') : 'text-on-surface-variant hover:bg-surface-container-low'}`,
              )}
            >
              8
            </button>
          </div>
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              'rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <span className={cm.fv5b245ffa}>chevron_right</span>
          </button>
        </div>
      </div>
    </>
  )
}

export default CommentsPagination
export { CommentsPagination }
