import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface PostListPaginationProps {
  total?: number
  page?: number
  onPageChange?: (p: number) => void
}
function PostListPagination({ total = 0, page = 1, onPageChange }: PostListPaginationProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const limit = 8
  const pageCount = Math.max(1, Math.ceil(total / limit))
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)
  return (
    <footer
      className={cm.cn(
        cm.sp('pt', 8),
        cm.flex({ align: 'center', justify: 'between' }),
        'border-t border-surface-container',
      )}
    >
      <span
        className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}
      >
        {t(
          'postListPagination.showing',
          { start, end, count: total },
          { defaultValue: 'Showing {{start}}-{{end}} of {{count}} stories' },
        )}
      </span>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
        <button
          aria-label={t('common.previousPage', {}, { defaultValue: 'Previous page' })}
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-lg text-on-surface-variant hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent',
          )}
          disabled={page <= 1}
          onClick={() => onPageChange?.(page - 1)}
        >
          <span className={cm.fv5b245ffa}>chevron_left</span>
        </button>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          {Array.from({ length: pageCount }, (_, i) => i + 1)
            .filter((p) => p >= Math.max(1, page - 1) && p <= Math.min(pageCount, page + 1))
            .map((p) => (
              <button
                key={p}
                onClick={() => onPageChange?.(p)}
                className={
                  p === page
                    ? cm.cn(
                        cm.w(10),
                        cm.h(10),
                        cm.flex({ align: 'center', justify: 'center' }),
                        'rounded-lg',
                        cm.fontWeight('bold'),
                        cm.textSize('xs'),
                        'bg-primary text-on-primary',
                      )
                    : cm.cn(
                        cm.w(10),
                        cm.h(10),
                        cm.flex({ align: 'center', justify: 'center' }),
                        'rounded-lg',
                        cm.fontWeight('bold'),
                        cm.textSize('xs'),
                        'text-on-surface-variant hover:bg-surface-container-low',
                      )
                }
              >
                {p}
              </button>
            ))}
        </div>
        <button
          aria-label={t('common.nextPage', {}, { defaultValue: 'Next page' })}
          onClick={() => onPageChange?.(page + 1)}
          disabled={page >= pageCount}
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-lg text-on-surface-variant hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent',
          )}
        >
          <span className={cm.fv5b245ffa}>chevron_right</span>
        </button>
      </div>
    </footer>
  )
}

export default PostListPagination
export { PostListPagination }
