import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import TagsPagination from './TagsPagination.js'
import TagsTableHeader from './TagsTableHeader.js'

const TAG_COLORS = [
  'bg-indigo-500',
  'bg-pink-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-yellow-400',
  'bg-blue-500',
  'bg-purple-500',
  'bg-teal-500',
]

interface Category {
  id: string | number
  name: string
  slug?: string
  post_count?: number
  created_at?: string
}

interface TagsTableSectionProps {
  tags: Category[]
  loading: boolean
  onDeleteTag: (id: string | number) => void | Promise<void>
}

function TagsTableSection({ tags, loading, onDeleteTag }: TagsTableSectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  function formatRelative(value?: string): string {
    if (!value) return t('common.notAvailable', {}, { defaultValue: '—' })
    const then = new Date(value).getTime()
    if (Number.isNaN(then)) return t('common.notAvailable', {}, { defaultValue: '—' })
    const days = Math.floor((Date.now() - then) / 86400000)
    if (days < 1) return t('relative.today', {}, { defaultValue: 'today' })
    if (days < 7)
      return t(
        'common.loading',
        { count: days },
        { defaultValue: days === 1 ? '1 day ago' : '{{count}} days ago' },
      )
    const weeks = Math.floor(days / 7)
    if (weeks < 5)
      return t(
        'relative.weeksAgo',
        { count: weeks },
        { defaultValue: weeks === 1 ? '1 week ago' : '{{count}} weeks ago' },
      )
    const months = Math.floor(days / 30)
    if (months < 12)
      return t(
        'relative.monthsAgo',
        { count: months },
        { defaultValue: months === 1 ? '1 month ago' : '{{count}} months ago' },
      )
    const years = Math.floor(days / 365)
    return t(
      'relative.yearsAgo',
      { count: years },
      { defaultValue: years === 1 ? '1 year ago' : '{{count}} years ago' },
    )
  }
  const items = tags
  const maxCount = Math.max(...items.map((i: Category) => i.post_count ?? 0), 1)

  return (
    <div className={cm.fv0384732d}>
      <table className={cm.cn(cm.w('full'), 'text-left border-collapse')}>
        <TagsTableHeader />
        <tbody className={cm.fva2949428}>
          {loading ? (
            <tr>
              <td
                colSpan={5}
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 8),
                  cm.textCenter,
                  cm.textSize('sm'),
                  'text-foreground-tertiary',
                )}
              >
                {t('common.loading', {}, { defaultValue: 'Loading...' })}
              </td>
            </tr>
          ) : (
            items.map((item: Category, idx: number) => {
              const color = TAG_COLORS[idx % TAG_COLORS.length]
              const slug = item.slug ?? item.name?.toLowerCase().replace(/\s+/g, '-')
              const count = item.post_count ?? 0
              const barWidth = Math.round((count / maxCount) * 100)
              return (
                <tr key={item.id} className={cm.fv11e7bd55}>
                  <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 4))}>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                      <div className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, color)}></div>
                      <span className={cm.cn(cm.fontWeight('semibold'), 'text-foreground')}>
                        {item.name}
                      </span>
                    </div>
                  </td>
                  <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 4))}>
                    <code
                      className={cm.cn(cm.textSize('xs'), 'font-mono text-foreground-secondary')}
                    >
                      /tag/{slug}
                    </code>
                  </td>
                  <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 4))}>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('medium'),
                          cm.w(6),
                          'text-foreground',
                        )}
                      >
                        {count}
                      </span>
                      <div
                        className={cm.cn(
                          cm.w(24),
                          cm.h(1.5),
                          cm.roundedFull,
                          'bg-surface-secondary overflow-hidden',
                        )}
                      >
                        <div
                          className={cm.cn(cm.h('full'), cm.roundedFull, color)}
                          style={{ width: `${barWidth}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 6),
                      cm.sp('py', 4),
                      cm.textSize('sm'),
                      'text-foreground-secondary',
                    )}
                  >
                    {formatRelative(item.created_at)}
                  </td>
                  <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 4), cm.textRight)}>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'end', gap: 'sm' }),
                        'opacity-0 group-hover:opacity-100 transition-opacity',
                      )}
                    >
                      <Link
                        aria-label={t('common.edit', {}, { defaultValue: 'Edit' })}
                        className={cm.cn(
                          cm.sp('p', 2),
                          'text-foreground-tertiary hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all',
                        )}
                        to="/posts/new"
                      >
                        <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
                          edit
                        </span>
                      </Link>
                      <button
                        aria-label={t('common.delete', {}, { defaultValue: 'Delete' })}
                        className={cm.cn(
                          cm.sp('p', 2),
                          'text-foreground-tertiary hover:text-error hover:bg-error-light rounded-lg transition-all',
                        )}
                        onClick={() => onDeleteTag(item.id)}
                      >
                        <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
                          delete
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
      <TagsPagination />
    </div>
  )
}

export default TagsTableSection
export { TagsTableSection }
