import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface TagsFilterBarProps {
  search: string
  onSearchChange: (v: string) => void
  activeFilter: string
  onFilterChange: (v: string) => void
}
export default function TagsFilterBar({ search, onSearchChange }: TagsFilterBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [sortBy, setSortBy] = useState('most-used')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        cm.flex({ direction: 'col' }),
        'md:flex-row',
      )}
    >
      <div className={cm.cn(cm.w('full'), 'relative md:w-96 group')}>
        <span className={cm.fvca9358d4}>search</span>
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cm.cn(
            cm.w('full'),
            cm.sp('pr', 4),
            cm.textSize('sm'),
            'bg-surface-container-low border border-outline-variant/20 rounded-xl',
            cm.sp('py', 2),
            'pl-11 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none',
          )}
          placeholder={t('tagsFilterBar.searchTags', {}, { defaultValue: 'Search tags...' })}
          type="text"
        />
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.w('full'), 'md:w-auto')}>
        <div className={cm.cn(cm.flex1, 'relative md:flex-none')}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('pr', 10),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'appearance-none md:w-48 bg-surface-container-low border border-outline-variant/20 rounded-xl',
              cm.sp('py', 2),
              'text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20',
            )}
          >
            <option value="most-used">
              {t('tagsFilterBar.mostUsed', {}, { defaultValue: 'Sort by: Most Used' })}
            </option>
            <option value="alphabetical">
              {t('tagsFilterBar.alphabetical', {}, { defaultValue: 'Sort by: Alphabetical' })}
            </option>
            <option value="recently-added">
              {t('tagsFilterBar.recentlyAdded', {}, { defaultValue: 'Sort by: Recently Added' })}
            </option>
          </select>
          <span className={cm.fv3a12ceec}>expand_more</span>
        </div>
        <div ref={filterRef} className={cm.fvdef3facc}>
          <button
            aria-label={t('tagsFilterBar.filter', {}, { defaultValue: 'Filter' })}
            onClick={() => setIsFilterOpen((v) => !v)}
            aria-expanded={isFilterOpen}
            className={cm.fv05c31262}
          >
            <span className={cm.fv5b245ffa}>filter_list</span>
          </button>
          {isFilterOpen && (
            <div
              className={cm.cn(
                cm.sp('mt', 2),
                cm.sp('p', 4),
                cm.w(56),
                'absolute right-0 bg-surface-container-high rounded-xl shadow-lg border border-outline-variant/20 z-50',
              )}
            ></div>
          )}
        </div>
      </div>
    </div>
  )
}
export { TagsFilterBar }
