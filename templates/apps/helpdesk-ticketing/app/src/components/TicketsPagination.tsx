import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TicketsPaginationProps {
  page: number
  onPageChange: (page: number) => void
  totalItems: number
  itemsPerPage?: number
}

/** Page numbers to show: 1 … 4 5 6 … 25 */
function visiblePages(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 1) return [1]
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set<number>([1, total, current, current - 1, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: (number | 'ellipsis')[] = []
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i] as number
    if (i > 0) {
      const prev = sorted[i - 1] as number
      if (p - prev === 2) out.push(prev + 1)
      else if (p - prev > 2) out.push('ellipsis')
    }
    out.push(p)
  }
  return out
}

function TicketsPagination({
  page: currentPage,
  onPageChange,
  totalItems,
  itemsPerPage = 10,
}: TicketsPaginationProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)
  const activeClass = cm.cn(
    cm.w(10),
    cm.h(10),
    cm.flex({ align: 'center', justify: 'center' }),
    cm.fontWeight('bold'),
    'rounded-lg bg-primary text-on-primary shadow-md shadow-primary/20',
  )
  const inactiveClass = cm.cn(
    cm.w(10),
    cm.h(10),
    cm.flex({ align: 'center', justify: 'center' }),
    'rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high transition-colors',
  )

  const pages = visiblePages(currentPage, totalPages)

  return (
    <footer
      className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}
      data-mol-id="pagination"
    >
      <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t(
          'ticketsPagination.showingRange',
          { start: startItem, end: endItem, total: totalItems },
          { defaultValue: 'Showing {{start}} to {{end}} of {{total}} tickets' },
        )}
      </span>
      <div className={cm.cn(cm.flex({ gap: 1 }))}>
        <button
          type="button"
          className={inactiveClass}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          aria-label={t('ticketsPagination.prev', {}, { defaultValue: 'Previous page' })}
        >
          <span className={cm.cn('material-symbols-outlined')}>chevron_left</span>
        </button>
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span
              key={`e-${i}`}
              className={cm.cn(inactiveClass, 'cursor-default opacity-60')}
              aria-hidden
            >
              <span className={cm.cn('material-symbols-outlined')}>more_horiz</span>
            </span>
          ) : (
            <button
              type="button"
              key={p}
              className={currentPage === p ? activeClass : inactiveClass}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className={inactiveClass}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          aria-label={t('ticketsPagination.next', {}, { defaultValue: 'Next page' })}
        >
          <span className={cm.cn('material-symbols-outlined')}>chevron_right</span>
        </button>
      </div>
    </footer>
  )
}

export default TicketsPagination
export { TicketsPagination }
