import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const TOTAL_PAGES = 12

function ModelLibraryPagination() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
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
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </button>
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            onClick={() => setPage(n)}
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
          onClick={() => setPage(TOTAL_PAGES)}
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
          onClick={() => setPage((p) => Math.min(TOTAL_PAGES, p + 1))}
        >
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </nav>
    </div>
  )
}

export default ModelLibraryPagination
export { ModelLibraryPagination }
