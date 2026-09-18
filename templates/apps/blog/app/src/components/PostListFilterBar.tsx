import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface PostListFilterBarProps {
  activeFilter: string
  onFilterChange: (f: string) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  totalCount?: number
}
function PostListFilterBar({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  totalCount = 0,
}: PostListFilterBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        'border-b border-outline-variant/10 pb-0.5',
      )}
    >
      <div role="tablist" className={cm.cn(cm.flex({ gap: 'xl' }))}>
        <button
          role="tab"
          aria-selected={activeFilter === 'all'}
          onClick={() => onFilterChange('all')}
          className={
            activeFilter === 'all'
              ? cm.cn(
                  cm.sp('pb', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'relative text-primary-container',
                )
              : cm.cn(
                  cm.sp('pb', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant hover:text-on-surface transition-colors',
                )
          }
        >
          {totalCount > 0
            ? t('status.all', { count: totalCount }, { defaultValue: 'All' })
            : t('postListFilterBar.tabAll')}
          {activeFilter === 'all' && (
            <div
              className={cm.cn(
                cm.w('full'),
                cm.h(0.5),
                'absolute bottom-0 left-0 bg-primary-container',
              )}
            />
          )}
        </button>
        <button
          role="tab"
          aria-selected={activeFilter === 'published'}
          onClick={() => onFilterChange('published')}
          className={
            activeFilter === 'published'
              ? cm.cn(
                  cm.sp('pb', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'relative text-primary-container',
                )
              : cm.cn(
                  cm.sp('pb', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant hover:text-on-surface transition-colors',
                )
          }
        >
          {t('status.published', {}, { defaultValue: 'Published' })}
          {activeFilter === 'published' && (
            <div
              className={cm.cn(
                cm.w('full'),
                cm.h(0.5),
                'absolute bottom-0 left-0 bg-primary-container',
              )}
            />
          )}
        </button>
        <button
          role="tab"
          aria-selected={activeFilter === 'draft'}
          onClick={() => onFilterChange('draft')}
          className={
            activeFilter === 'draft'
              ? cm.cn(
                  cm.sp('pb', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'relative text-primary-container',
                )
              : cm.cn(
                  cm.sp('pb', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant hover:text-on-surface transition-colors',
                )
          }
        >
          {t('postListFilterBar.tabDrafts', {}, { defaultValue: 'Drafts' })}
          {activeFilter === 'draft' && (
            <div
              className={cm.cn(
                cm.w('full'),
                cm.h(0.5),
                'absolute bottom-0 left-0 bg-primary-container',
              )}
            />
          )}
        </button>
        <button
          role="tab"
          aria-selected={activeFilter === 'scheduled'}
          onClick={() => onFilterChange('scheduled')}
          className={
            activeFilter === 'scheduled'
              ? cm.cn(
                  cm.sp('pb', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'relative text-primary-container',
                )
              : cm.cn(
                  cm.sp('pb', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant hover:text-on-surface transition-colors',
                )
          }
        >
          {t('postListFilterBar.tabScheduled', {}, { defaultValue: 'Scheduled' })}
          {activeFilter === 'scheduled' && (
            <div
              className={cm.cn(
                cm.w('full'),
                cm.h(0.5),
                'absolute bottom-0 left-0 bg-primary-container',
              )}
            />
          )}
        </button>
      </div>
      <div className={cm.fvd683bc2b}>
        <span className={cm.fv634ea742}>search</span>
        <input
          className={cm.cn(
            cm.sp('pl', 10),
            cm.sp('pr', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.w(64),
            'bg-surface-container-low border-none rounded-xl focus:ring-1 focus:ring-primary/20 placeholder:text-on-surface-variant/40',
          )}
          aria-label={t('postListFilterBar.searchLabel', {}, { defaultValue: 'Search posts' })}
          placeholder={t(
            'postListFilterBar.searchPlaceholderStories',
            {},
            { defaultValue: 'Search stories...' },
          )}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  )
}

export default PostListFilterBar
export { PostListFilterBar }
