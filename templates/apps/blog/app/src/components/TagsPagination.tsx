import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
export default function TagsPagination() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8
  const totalItems = 18
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const start = (currentPage - 1) * itemsPerPage + 1
  const end = Math.min(currentPage * itemsPerPage, totalItems)
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
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setCurrentPage(1)}
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
              onClick={() => setCurrentPage(2)}
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
              onClick={() => setCurrentPage(3)}
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
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
