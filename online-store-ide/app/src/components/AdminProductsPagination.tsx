import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Props {
  page: number
  totalPages: number
  totalProducts: number
  startItem: number
  endItem: number
  onPageChange: (p: number) => void
}
function AdminProductsPagination({
  page,
  totalPages,
  totalProducts,
  startItem,
  endItem,
  onPageChange,
}: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visiblePages: (number | null)[] =
    totalPages <= 5
      ? Array.from({ length: totalPages }, (_, i) => i + 1)
      : page <= 3
        ? [1, 2, 3, null, totalPages]
        : page >= totalPages - 2
          ? [1, null, totalPages - 2, totalPages - 1, totalPages]
          : [1, null, page - 1, page, page + 1, null, totalPages]
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 8),
        cm.sp('py', 4),
        'bg-surface border-t border-border',
      )}
    >
      <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
        {t(
          'adminProductsPagination.itemsRange',
          { start: startItem, end: endItem, total: totalProducts },
          { defaultValue: 'Showing {{start}}-{{end}} of {{total}} products' },
        )}
      </p>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
        <button
          className={cm.cn(
            cm.sp('p', 2),
            'text-foreground-tertiary hover:text-success disabled:opacity-50',
          )}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="chevron_left">
            chevron_left
          </span>
        </button>
        {visiblePages.map((p, i) =>
          p === null ? (
            <span key={`e${i}`} className={cm.cn(cm.sp('px', 2), 'text-foreground-tertiary')}>
              {t('common.pagination.ellipsis', {}, { defaultValue: '...' })}
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.flex({ align: 'center', justify: 'center' }),
                cm.textSize('sm'),
                'rounded-md',
                page === p
                  ? cm.cn('bg-primary text-on-primary', cm.fontWeight('bold'))
                  : cm.cn(
                      'text-foreground-secondary hover:bg-surface-secondary',
                      cm.fontWeight('medium'),
                    ),
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          className={cm.cn(
            cm.sp('p', 2),
            'text-foreground-tertiary hover:text-success disabled:opacity-50',
          )}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="chevron_right">
            chevron_right
          </span>
        </button>
      </div>
    </div>
  )
}

export default AdminProductsPagination
export { AdminProductsPagination }
