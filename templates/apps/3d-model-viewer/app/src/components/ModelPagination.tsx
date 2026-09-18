import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface PaginationProps {
  page: number
  totalPages: number
  onPage: (p: number) => void
}
function ModelPagination({ page, totalPages, onPage }: PaginationProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visiblePages = Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1)
  return (
    <div className={cm.cn(cm.sp('mt', 12), cm.flex({ justify: 'center' }), cm.sp('pb', 8))}>
      <nav className={cm.flex({ align: 'center', gap: 2 })}>
        <button
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50',
          )}
          aria-label={t('modelPagination.previousPage', {}, { defaultValue: 'Previous page' })}
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
        >
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </button>
        {visiblePages.map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={
              p === page
                ? cm.cn(
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    cm.flex({ align: 'center', justify: 'center' }),
                    'bg-primary text-on-primary shadow-md',
                  )
                : cm.cn(
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    cm.flex({ align: 'center', justify: 'center' }),
                    'hover:bg-surface-container text-on-surface-variant transition-colors',
                  )
            }
          >
            {p}
          </button>
        ))}
        {totalPages > 3 && (
          <span className={cm.cn(cm.sp('px', 1), 'text-on-surface-variant')}>
            {t('modelPagination.ellipsis', {}, { defaultValue: '...' })}
          </span>
        )}
        {totalPages > 3 && (
          <button
            onClick={() => onPage(totalPages)}
            className={
              totalPages === page
                ? cm.cn(
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    cm.flex({ align: 'center', justify: 'center' }),
                    'bg-primary text-on-primary shadow-md',
                  )
                : cm.cn(
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    cm.flex({ align: 'center', justify: 'center' }),
                    'hover:bg-surface-container text-on-surface-variant transition-colors',
                  )
            }
          >
            {totalPages}
          </button>
        )}
        <button
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50',
          )}
          aria-label={t('modelPagination.nextPage', {}, { defaultValue: 'Next page' })}
          disabled={page === totalPages}
          onClick={() => onPage(page + 1)}
        >
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </nav>
    </div>
  )
}

export default ModelPagination
export { ModelPagination }
