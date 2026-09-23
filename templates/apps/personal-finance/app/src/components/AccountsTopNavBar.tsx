import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useGet, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

function AccountsTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data: notif } = useGet<{ data: unknown[]; count: number }>('/notifications', {
    immediate: true,
  })
  const unreadCount = notif?.count ?? 0

  return (
    <header
      className={cm.cn(
        cm.w('full'),
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.sp('py', 4),
        'sticky top-0 z-50 bg-surface/80 backdrop-blur-xl',
      )}
      data-mol-id="top-nav"
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'min-w-0 flex-1')}>
        <Link
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'tracking-tighter text-success md:hidden shrink-0',
          )}
          data-mol-id="mobile-logo"
          to="/"
        >
          {t('accountsTopNavBar.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </Link>
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.roundedFull,
            'hidden md:flex items-center bg-surface-container-low w-full max-w-96 min-w-0',
          )}
          data-mol-id="search-container"
        >
          <span className={cm.cn(cm.textMuted, 'material-symbols-outlined')}>search</span>
          <input
            className={cm.cn(
              cm.textSize('sm'),
              cm.w('full'),
              'bg-transparent border-none focus:ring-0 font-body placeholder:text-foreground-tertiary',
            )}
            data-mol-id="top-search"
            placeholder={t(
              'accountsTopNavBar.searchPlaceholder',
              {},
              { defaultValue: 'Search accounts or transactions...' },
            )}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && search.trim()) {
                navigate(`/transactions?search=${encodeURIComponent(search.trim())}`)
              }
            }}
          />
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'shrink-0')}>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <Link
            to="/notifications"
            aria-label={t(
              'accountsTopNavBar.notificationsAria',
              { count: unreadCount },
              { defaultValue: 'Notifications ({{count}} unread)' },
            )}
            data-mol-id="icon-notif"
            data-unread-count={unreadCount}
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              cm.textMuted,
              'relative hover:text-success transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')}>notifications</span>
            {unreadCount > 0 && (
              <span
                data-mol-id="icon-notif-badge"
                className={cm.cn(
                  cm.roundedFull,
                  cm.w(2),
                  cm.h(2),
                  'absolute top-1 right-1 bg-tertiary',
                )}
              ></span>
            )}
          </Link>
          <Link
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              cm.textMuted,
              'hover:text-success transition-colors',
            )}
            data-mol-id="icon-settings"
            to="/settings"
          >
            <span className={cm.cn('material-symbols-outlined')}>settings</span>
          </Link>
        </div>
        <div data-mol-id="profile-avatar">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default AccountsTopNavBar
export { AccountsTopNavBar }
