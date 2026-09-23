import { useState } from 'react'
import { Link } from 'react-router'

import { useGet, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'

function CategoriesTopNavBar({
  search: controlledSearch,
  onSearchChange,
}: {
  /** Controlled search value — pass with `onSearchChange` to filter the page. */
  search?: string
  /** Called as the user types; the Categories page uses it to filter cards. */
  onSearchChange?: (value: string) => void
} = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [localSearch, setLocalSearch] = useState('')
  const search = controlledSearch ?? localSearch
  const setSearch = onSearchChange ?? setLocalSearch
  const { data: notif } = useGet<{ data: unknown[]; count: number }>('/notifications', {
    immediate: true,
  })
  const unreadCount = notif?.count ?? 0
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center', gap: 'sm' }),
        cm.sp('px', 4),
        'md:px-8',
        cm.w('full'),
        cm.sp('py', 4),
        'sticky top-0 z-50 bg-surface/80 backdrop-blur-xl',
      )}
    >
      <div className={cm.flex({ align: 'center', gap: 'md' })}>
        <span
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            'text-success font-manrope uppercase tracking-widest text-[10px] hidden sm:inline',
          )}
        >
          {t('categoriesTopNavBar.sectionTitle', {}, { defaultValue: 'Financial Architecture' })}
        </span>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          'md:gap-4 min-w-0 flex-1 sm:flex-none sm:min-w-0 justify-end',
        )}
      >
        <div className={cm.cn('relative min-w-0 flex-1 sm:flex-none')}>
          <span
            className={cm.cn(
              cm.textSize('xl'),
              'absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary material-symbols-outlined',
            )}
            data-icon="search"
          >
            search
          </span>
          <input
            className={cm.cn(
              cm.roundedFull,
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'w-full sm:w-64',
              'bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 transition-all',
            )}
            aria-label={t(
              'categoriesTopNavBar.searchPlaceholder',
              {},
              { defaultValue: 'Search categories...' },
            )}
            placeholder={t(
              'categoriesTopNavBar.searchPlaceholder',
              {},
              { defaultValue: 'Search categories...' },
            )}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={cm.cn(cm.flex({ gap: 'sm' }), 'shrink-0')}>
          <Link
            to="/notifications"
            aria-label={t(
              'categoriesTopNavBar.notificationsAria',
              { count: unreadCount },
              { defaultValue: 'Notifications ({{count}} unread)' },
            )}
            data-mol-id="categories-notifications-link"
            data-unread-count={unreadCount}
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              cm.textMuted,
              'relative hover:text-success hover:bg-border/50 transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="notifications">
              notifications
            </span>
            {unreadCount > 0 && (
              <span
                className={cm.cn(
                  cm.roundedFull,
                  cm.w(2),
                  cm.h(2),
                  'absolute top-1 right-1 bg-tertiary',
                )}
              ></span>
            )}
          </Link>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default CategoriesTopNavBar
export { CategoriesTopNavBar }
