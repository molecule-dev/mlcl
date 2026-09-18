import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useGet, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'

function SettingsTopNavBar() {
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
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.flex1)}>
        <div className={cm.cn(cm.w('full'), cm.maxW('md'), 'relative')}>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary',
            )}
            data-icon="search"
          >
            search
          </span>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.roundedFull,
              'bg-surface-container-low border-none focus:ring-1 focus:ring-primary placeholder:text-foreground-secondary',
            )}
            placeholder={t(
              'settingsTopNavBar.searchPlaceholder',
              {},
              { defaultValue: 'Search transactions...' },
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
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <Link
            to="/notifications"
            aria-label={t(
              'settingsTopNavBar.notificationsAria',
              { count: unreadCount },
              { defaultValue: 'Notifications ({{count}} unread)' },
            )}
            data-unread-count={unreadCount}
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              cm.textMuted,
              'hover:text-success transition-colors relative',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="notifications">
              notifications
            </span>
            {unreadCount > 0 && (
              <span
                className={cm.cn(
                  cm.w(2),
                  cm.h(2),
                  cm.roundedFull,
                  'absolute top-2 right-2 bg-primary',
                )}
              ></span>
            )}
          </Link>
          <Link
            to="/accounts"
            aria-label={t('nav.accounts', {}, { defaultValue: 'Accounts' })}
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              cm.textMuted,
              'hover:text-success transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="account_balance_wallet">
              account_balance_wallet
            </span>
          </Link>
        </div>
        <UserMenu />
      </div>
    </header>
  )
}

export default SettingsTopNavBar
export { SettingsTopNavBar }
