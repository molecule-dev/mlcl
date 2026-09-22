import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'

function DashboardTopBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 8),
        cm.w('full'),
        'fixed top-0 right-0 left-0 md:left-[260px] h-[56px] z-40 bg-surface/80 dark:bg-surface-container-lowest/80 backdrop-blur-xl',
      )}
    >
      {/* Search Bar Area (on_left) */}
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 4),
          cm.sp('py', 2),
          'w-36 sm:w-52 md:w-64',
          'bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-colors min-w-0',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mr', 2),
            'material-symbols-outlined text-secondary',
          )}
        >
          search
        </span>
        <input
          className={cm.cn(
            cm.textSize('sm'),
            cm.w('full'),
            cm.sp('p', 0),
            'bg-transparent border-none focus:ring-0 placeholder-secondary text-on-surface',
          )}
          aria-label={t('dashboardTopBar.searchLabel', {}, { defaultValue: 'Search models' })}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            // Enter jumps to the library with the query applied — the
            // dashboard itself only shows a "recent" slice.
            if (e.key === 'Enter' && search.trim()) {
              navigate(`/models?q=${encodeURIComponent(search.trim())}`)
            }
          }}
        />
      </div>
      {/* Trailing Actions & Profile */}
      <div className={cm.flex({ align: 'center', gap: 4 })}>
        <Link
          to="/notifications"
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          className={cm.cn(
            'text-foreground-secondary hover:bg-surface-secondary dark:hover:bg-surface/5 rounded-full p-2 scale-95 active:transition-all',
          )}
        >
          <span className="material-symbols-outlined">notifications</span>
        </Link>
        <UserMenu />
      </div>
    </header>
  )
}

export default DashboardTopBar
export { DashboardTopBar }
