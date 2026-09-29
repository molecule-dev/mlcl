import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function WishlistPageHeader({
  itemCount = 0,
  loading = false,
  error = null,
}: {
  itemCount?: number
  loading?: boolean
  error?: string | null
}) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const [sortOpen, setSortOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'name'>('date')
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sortOpen) return
    function onMouseDown(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [sortOpen])

  const sortLabels: Record<string, string> = {
    date: t('wishlistPageHeader.sortDateAdded', {}, { defaultValue: 'Date Added' }),
    price: t('form.price', {}, { defaultValue: 'Price' }),
    name: t('form.name', {}, { defaultValue: 'Name' }),
  }
  const subtitle = loading
    ? t('wishlistPageHeader.loading', {}, { defaultValue: 'Loading your saved items...' })
    : error || itemCount === 0
      ? t(
          'wishlistPageHeader.emptySubtitle',
          {},
          { defaultValue: 'Save products you love for later.' },
        )
      : t(
          'wishlistPageHeader.itemCount',
          { count: itemCount },
          { defaultValue: '{{count}} items saved' },
        )
  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between', gap: 6 }),
        cm.sp('mb', 8),
        'md:flex-row md:items-end',
      )}
      data-mol-id="wishlist-header-01"
    >
      <div>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-black tracking-tight text-foreground')}>
          {t('wishlistPageHeader.title', {}, { defaultValue: 'My Wishlist' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), 'text-foreground-secondary')}>{subtitle}</p>
      </div>
      {!loading && !error && itemCount > 0 && (
        <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))} ref={sortRef}>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-foreground-secondary',
            )}
          >
            {t('wishlistPageHeader.sortBy', {}, { defaultValue: 'Sort by:' })}
          </span>
          <div className={cm.cn('relative')}>
            <button
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'bg-surface/50 rounded-lg hover:bg-surface transition-colors',
              )}
              onClick={() => setSortOpen((o) => !o)}
            >
              {sortLabels[sortBy]}
              <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                expand_more
              </span>
            </button>
            {sortOpen && (
              <div
                className={cm.cn(
                  cm.sp('mt', 1),
                  cm.sp('py', 1),
                  'absolute right-0 bg-surface rounded-lg shadow-lg z-10 min-w-full',
                )}
              >
                {Object.keys(sortLabels).map((key) => (
                  <button
                    key={key}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      'w-full text-left hover:bg-surface-secondary',
                      sortBy === key
                        ? cm.cn(cm.fontWeight('semibold'), 'text-[var(--mol-color-secondary)]')
                        : 'text-foreground-secondary',
                    )}
                    onClick={() => {
                      setSortBy(key as 'date' | 'price' | 'name')
                      setSortOpen(false)
                    }}
                  >
                    {sortLabels[key]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default WishlistPageHeader
export { WishlistPageHeader }
