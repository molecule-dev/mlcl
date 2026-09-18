import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CompaniesPaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

function CompaniesPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: CompaniesPaginationProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  const pageNums: (number | '...')[] = []
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pageNums.push(i)
  } else {
    pageNums.push(1)
    if (page > 3) pageNums.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++)
      pageNums.push(i)
    if (page < totalPages - 2) pageNums.push('...')
    if (totalPages > 1) pageNums.push(totalPages)
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('pt', 4),
        'border-t border-outline-variant/10',
      )}
    >
      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
        {t(
          'companiesPagination.showing',
          { start, end, total: total.toLocaleString() },
          { defaultValue: 'Showing {{start}} to {{end}} of {{total}} companies' },
        )}
      </p>
      <div className={cm.cn(cm.flex(), 'gap-1')}>
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface-container',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
            chevron_left
          </span>
        </button>
        {pageNums.map((p, i) =>
          p === '...' ? (
            <span
              key={`el-${i}`}
              className={cm.cn(cm.sp('px', 2), cm.textSize('xs'), 'self-center text-outline')}
            >
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={
                p === page
                  ? cm.cn(
                      cm.w(8),
                      cm.h(8),
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'rounded-lg primary-gradient text-white',
                    )
                  : cm.cn(
                      cm.w(8),
                      cm.h(8),
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'rounded-lg bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low',
                    )
              }
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface-container',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
            chevron_right
          </span>
        </button>
      </div>
    </div>
  )
}

export default CompaniesPagination
export { CompaniesPagination }
