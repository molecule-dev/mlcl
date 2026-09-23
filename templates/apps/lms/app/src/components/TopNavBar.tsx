import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'

export type TopNavBarProps = {
  /** When set, replaces the default “Dashboard” crumb (e.g. course lesson breadcrumb). */
  contextCrumb?: string
}

function TopNavBar({ contextCrumb }: TopNavBarProps = {}) {
  const cm = getClassMap()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const handleThemeToggle = () => setTheme(theme?.mode === 'dark' ? 'light' : 'dark')
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.h(16),
        'fixed top-0 left-0 md:left-[260px] right-0 bg-surface/80 backdrop-blur-md border-b border-border z-40 hidden md:flex',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 2 }),
          cm.textSize('sm'),
          'text-foreground-secondary min-w-0 flex-1 pr-4',
        )}
      >
        <span
          className={cm.cn(cm.fontWeight('medium'), 'text-foreground truncate')}
          title={contextCrumb}
        >
          {contextCrumb ?? t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
        </span>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 6 }))}>
        <div className={cm.cn('relative group')}>
          <span
            className={cm.cn(
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary group-focus-within:text-primary-container transition-colors',
            )}
          >
            search
          </span>
          <input
            aria-label={t(
              'topNavBar.search',
              {},
              { defaultValue: 'Search courses, lessons, and more...' },
            )}
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 2),
              cm.w(64),
              cm.roundedFull,
              'bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 transition-all outline-none',
            )}
            placeholder={t(
              'topNavBar.search',
              {},
              { defaultValue: 'Search courses, lessons, and more...' },
            )}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && search.trim()) {
                navigate(`/courses?q=${encodeURIComponent(search.trim())}`)
              }
            }}
          />
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
          <button
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'text-foreground-secondary hover:bg-surface-secondary transition-colors relative',
            )}
            data-mol-id="btn-notifications"
            aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            onClick={() => navigate('/notifications')}
          >
            <span className={cm.cn('material-symbols-outlined')}>notifications</span>
            <span
              className={cm.cn(
                cm.w(2),
                cm.h(2),
                cm.roundedFull,
                'absolute top-2 right-2 bg-error border-2 border-surface',
              )}
            ></span>
          </button>
          <button
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'text-foreground-secondary hover:bg-surface-secondary transition-colors',
            )}
            data-mol-id="btn-theme-toggle"
            aria-label={t('theme.toggle', {}, { defaultValue: 'Toggle theme' })}
            onClick={handleThemeToggle}
          >
            <span className={cm.cn('material-symbols-outlined')}>
              {theme?.mode === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
export default TopNavBar
export { TopNavBar }
