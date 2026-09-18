import { Link, useNavigate } from 'react-router'

import { useGet, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'

function AccountDetailTopNavBar({ account }: { account: { name: string } }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: notif } = useGet<{ data: unknown[]; count: number }>('/notifications', {
    immediate: true,
  })
  const unreadCount = notif?.count ?? 0
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.w('full'),
        cm.sp('px', 8),
        cm.sp('py', 4),
        'sticky top-0 z-50 bg-surface/80 backdrop-blur-xl transition-all',
      )}
    >
      <div className={cm.flex({ align: 'center', gap: 'md' })}>
        <button
          aria-label={t('common.back', {}, { defaultValue: 'Back' })}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            'hover:bg-surface-container transition-colors',
          )}
          onClick={() => navigate('/accounts')}
        >
          <span className={cm.cn('material-symbols-outlined text-on-surface')}>arrow_back</span>
        </button>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('sm'))}>
          <span className={cm.cn('text-foreground-secondary')}>
            {t('common.accounts', {}, { defaultValue: 'Accounts' })}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'material-symbols-outlined text-foreground-tertiary',
            )}
          >
            chevron_right
          </span>
          <span className={cm.cn(cm.fontWeight('bold'), 'text-success')}>{account.name}</span>
        </nav>
      </div>
      <div className={cm.flex({ align: 'center', gap: 'lg' })}>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <Link
            to="/notifications"
            aria-label={t(
              'accountDetailTopNavBar.notificationsAria',
              { count: unreadCount },
              { defaultValue: 'Notifications ({{count}} unread)' },
            )}
            data-mol-id="account-detail-notifications-link"
            data-unread-count={unreadCount}
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'relative text-foreground-secondary hover:text-success transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')}>notifications</span>
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
          <Link
            aria-label={t('nav.settings', {}, { defaultValue: 'Settings' })}
            className={cm.cn('text-foreground-secondary hover:text-success transition-colors')}
            to="/settings"
          >
            <span className={cm.cn('material-symbols-outlined')}>settings</span>
          </Link>
        </div>
        <UserMenu />
      </div>
    </header>
  )
}

export default AccountDetailTopNavBar
export { AccountDetailTopNavBar }
