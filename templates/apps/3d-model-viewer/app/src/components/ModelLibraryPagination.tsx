import { useTranslation } from '@molecule/app-react'
import { useListRoute } from '@molecule/app-routing-react-router'
import { getClassMap } from '@molecule/app-ui'

const TOTAL_PAGES = 12

function ModelLibraryPagination() {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Page number reads from (and writes to) the URL's ?page= key, so links,
  // Back/Forward and reloads keep the page — no mirrored useState.
  const listRoute = useListRoute()
  const page = listRoute.page
  const goToPage = (next: number): void => {
    if (next !== page) listRoute.setPage(next)
  }
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
          disabled={page === 1}
          onClick={() => goToPage(Math.max(1, page - 1))}
        >
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </button>
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            onClick={() => goToPage(n)}
            className={
              page === n
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
            {n}
          </button>
        ))}
        <span className={cm.cn(cm.sp('px', 1), 'text-on-surface-variant')}>
          {t('modelLibraryPagination.ellipsis', {}, { defaultValue: '...' })}
        </span>
        <button
          onClick={() => goToPage(TOTAL_PAGES)}
          className={
            page === TOTAL_PAGES
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
          {TOTAL_PAGES}
        </button>
        <button
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50',
          )}
          disabled={page === TOTAL_PAGES}
          onClick={() => goToPage(Math.min(TOTAL_PAGES, page + 1))}
        >
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </nav>
    </div>
  )
}

export default ModelLibraryPagination
export { ModelLibraryPagination }
