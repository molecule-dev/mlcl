import { getClassMap } from '@molecule/app-ui'

/**
 * Loading placeholder shown while a page's first data fetch is in flight.
 *
 * Data pages previously rendered their curated FALLBACK rows immediately
 * and swapped in the live data a moment later. That swap re-created every
 * row's DOM mid-interaction: a click dispatched at the fallback button
 * landed on a node the re-render had already replaced (focus stuck on a
 * detached element, the row's onClick never fired). Rendering a skeleton
 * until the first fetch settles removes the phantom-DOM window entirely
 * and gives the page a proper loading state.
 */
export function ListSkeleton({ rows = 4, avatar = true }: { rows?: number; avatar?: boolean }) {
  const cm = getClassMap()
  return (
    <div
      data-mol-id="list-skeleton"
      role="status"
      aria-label="Loading"
      className={cm.cn('divide-y divide-outline-variant/40')}
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'px-5 py-4')}>
          {avatar ? (
            <div className={cm.cn('h-10 w-10 shrink-0 rounded-xl bg-surface-container-high')} />
          ) : null}
          <div className={cm.cn(cm.flex1, 'space-y-2')}>
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-surface-container-high" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-surface-container-high" />
          </div>
          <div className="h-3.5 w-16 shrink-0 animate-pulse rounded bg-surface-container-high" />
        </div>
      ))}
    </div>
  )
}

export default ListSkeleton
