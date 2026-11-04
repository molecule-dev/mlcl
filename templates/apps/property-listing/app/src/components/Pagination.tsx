import { useTranslation } from '@molecule/app-react'
import { useListRoute } from '@molecule/app-routing-react-router'
import { getClassMap } from '@molecule/app-ui'

export default function Pagination() {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Page number reads from (and writes to) the URL's ?page= key, so links,
  // Back/Forward and reloads keep the page — no mirrored useState.
  const listRoute = useListRoute({ pageSize: 4 })
  const currentPage = listRoute.page
  const totalPages = 12
  const totalItems = 124
  const itemsPerPage = listRoute.pageSize
  const goToPage = (page: number): void => {
    if (page !== currentPage) listRoute.setPage(page)
  }
  return (
    <section
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('mt', 12),
        cm.sp('pt', 8),
        'border-t border-transparent',
      )}
    >
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant font-body')}>
        {t(
          'pagination.showingRange',
          {
            start: (currentPage - 1) * itemsPerPage + 1,
            end: Math.min(currentPage * itemsPerPage, totalItems),
            total: totalItems,
          },
          { defaultValue: 'Showing {{start}}-{{end}} of {{total}} leads' },
        )}
      </p>
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <button
          onClick={() => goToPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.h(10),
            cm.w(10),
            'rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high transition-all disabled:opacity-50',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="chevron_left">
            chevron_left
          </span>
        </button>
        <button
          onClick={() => goToPage(1)}
          className={cm.cn(
            cm.h(10),
            cm.sp('px', 4),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.textSize('sm'),
            'rounded-lg',
            currentPage === 1
              ? 'bg-primary-container text-on-primary-container font-bold'
              : 'bg-surface-container-low text-on-surface-variant font-medium hover:bg-surface-container-high transition-all',
          )}
        >
          1
        </button>
        <button
          onClick={() => goToPage(2)}
          className={cm.cn(
            cm.h(10),
            cm.sp('px', 4),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.textSize('sm'),
            'rounded-lg',
            currentPage === 2
              ? 'bg-primary-container text-on-primary-container font-bold'
              : 'bg-surface-container-low text-on-surface-variant font-medium hover:bg-surface-container-high transition-all',
          )}
        >
          2
        </button>
        <button
          onClick={() => goToPage(3)}
          className={cm.cn(
            cm.h(10),
            cm.sp('px', 4),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.textSize('sm'),
            'rounded-lg',
            currentPage === 3
              ? 'bg-primary-container text-on-primary-container font-bold'
              : 'bg-surface-container-low text-on-surface-variant font-medium hover:bg-surface-container-high transition-all',
          )}
        >
          3
        </button>
        <span className={cm.cn(cm.sp('px', 2), 'text-on-surface-variant')}>
          {t('common.ellipsis', {}, { defaultValue: '...' })}
        </span>
        <button
          onClick={() => goToPage(12)}
          className={cm.cn(
            cm.h(10),
            cm.sp('px', 4),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.textSize('sm'),
            'rounded-lg',
            currentPage === 12
              ? 'bg-primary-container text-on-primary-container font-bold'
              : 'bg-surface-container-low text-on-surface-variant font-medium hover:bg-surface-container-high transition-all',
          )}
        >
          12
        </button>
        <button
          onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.h(10),
            cm.w(10),
            'rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high transition-all disabled:opacity-50',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="chevron_right">
            chevron_right
          </span>
        </button>
      </div>
    </section>
  )
}
export { Pagination }
