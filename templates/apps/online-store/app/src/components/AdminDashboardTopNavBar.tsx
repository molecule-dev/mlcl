import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { avatarUrl } from '../utils/avatar.js'

function AdminDashboardTopNavBar() {
  const cm = getClassMap()
  const navigate = useNavigate()
  const { user, logout } = useAuth() as {
    user?: { name?: string; email?: string }
    logout: () => Promise<void>
  }
  const { t } = useTranslation()
  const displayName = user?.name?.trim() || user?.email || 'Admin'
  const [search, setSearch] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    if (profileOpen) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [profileOpen])

  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 6),
        cm.w('full'),
        cm.h(16),
        'fixed top-0 right-0 left-64 bg-surface border-b border-border shadow-sm z-50',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.flex1, 'gap-8')}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
          {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
        </h2>
        <div className={cm.cn(cm.w('full'), cm.maxW('md'), 'relative group')}>
          <span
            className={cm.cn(
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary',
            )}
          >
            search
          </span>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('sm'),
              'bg-surface-secondary border-none focus:ring-2 focus:ring-green-500 transition-all',
            )}
            placeholder={t(
              'adminTopNav.searchPlaceholder',
              {},
              { defaultValue: 'Search analytics, orders...' },
            )}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
        <button
          type="button"
          data-mol-id="admin-topnav-notifications"
          className={cm.cn(
            cm.sp('p', 2),
            'relative text-foreground-secondary hover:text-success transition-colors',
          )}
          onClick={() => navigate('/notifications')}
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="notifications">
            notifications
          </span>
        </button>
        <div className={cm.cn(cm.h(8), 'w-px', cm.sp('mx', 2), 'bg-border')}></div>
        <div ref={profileRef} className={cm.cn('relative')}>
          <button
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('p', 1),
              cm.roundedFull,
              'gap-2 hover:bg-surface-secondary transition-colors',
            )}
            onClick={() => setProfileOpen((o) => !o)}
            aria-expanded={profileOpen}
            aria-label={t('adminTopNav.userMenuLabel', {}, { defaultValue: 'User menu' })}
          >
            <img
              alt={displayName}
              className={cm.cn(cm.w(8), cm.h(8), cm.roundedFull, 'object-cover')}
              src={avatarUrl(displayName)}
            />
            <span
              className={cm.cn('material-symbols-outlined text-foreground-secondary')}
              data-icon="account_circle"
            >
              account_circle
            </span>
          </button>
          {profileOpen && (
            <div
              className={cm.cn(
                cm.sp('mt', 1),
                cm.w(48),
                'absolute right-0 top-full bg-surface rounded-lg shadow-lg border border-border z-50',
              )}
            >
              <Link
                to="/settings"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'text-left text-foreground hover:bg-surface-secondary rounded-t-lg',
                )}
                onClick={() => setProfileOpen(false)}
              >
                {t('nav.profile', {}, { defaultValue: 'Profile' })}
              </Link>
              <Link
                to="/admin/settings"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'text-left text-foreground hover:bg-surface-secondary',
                )}
                onClick={() => setProfileOpen(false)}
              >
                {t('nav.settings', {}, { defaultValue: 'Settings' })}
              </Link>
              <button
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'text-left text-error hover:bg-surface-secondary rounded-b-lg',
                )}
                onClick={() => {
                  logout()
                    .catch(() => {}) // logout failure still clears local session state
                    .finally(() => navigate('/login'))
                }}
              >
                {t('common.logout', {}, { defaultValue: 'Logout' })}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default AdminDashboardTopNavBar
export { AdminDashboardTopNavBar }
