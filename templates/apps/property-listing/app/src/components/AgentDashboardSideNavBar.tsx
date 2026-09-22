import { Link, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export default function AgentDashboardSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { logout } = useAuth()
  const __navigate = useNavigate()
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      await logout()
    } finally {
      __navigate('/login')
    }
  }
  return (
    <>
      {/* SideNavBar */}
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('py', 8),
          cm.h('screen'),
          cm.w(64),
          cm.surface,
          'fixed left-0 top-0 overflow-y-auto z-50 border-r border-border/50 hidden md:flex',
        )}
        data-mol-id="sidenav_1"
      >
        <div className={cm.cn(cm.sp('mb', 12), cm.sp('px', 8))} data-mol-id="sidenav_header">
          <h1
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'tracking-tighter text-success',
            )}
            data-mol-id="brand_logo"
          >
            {t(
              'agentDashboardSideNavBar.brand',
              { appName: APP_NAME },
              { defaultValue: '{{appName}}' },
            )}
          </h1>
          <p
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.textMuted,
              'text-[10px] uppercase tracking-widest',
            )}
            data-mol-id="brand_subtext"
          >
            {t('agentDashboardSideNavBar.portalLabel', {}, { defaultValue: 'Agent Portal' })}
          </p>
        </div>
        <nav
          className={cm.cn(cm.flex1, cm.flex({ direction: 'col', gap: 'xs' }))}
          data-mol-id="nav_menu"
        >
          {/* Dashboard Active */}
          <Link
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              cm.sp('px', 6),
              cm.sp('py', 3),
              'bg-primary text-on-primary rounded-r-full transition-all duration-200 ease-in-out',
            )}
            data-mol-id="nav_item_1"
            to="/admin/dashboard"
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              dashboard
            </span>
            <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
              {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
            </span>
          </Link>
          <Link
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.textSubtle,
              'hover:text-success dark:hover:text-emerald-300 hover:bg-success-light dark:hover:bg-emerald-900/30 transition-all duration-200 ease-in-out',
            )}
            data-mol-id="nav_item_2"
            to="/admin/listings"
          >
            <span className={cm.cn('material-symbols-outlined')}>home_work</span>
            <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
              {t('agentDashboardSideNavBar.myListings', {}, { defaultValue: 'My Listings' })}
            </span>
          </Link>
          <Link
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.textSubtle,
              'hover:text-success dark:hover:text-emerald-300 hover:bg-success-light dark:hover:bg-emerald-900/30 transition-all duration-200 ease-in-out',
            )}
            data-mol-id="nav_item_3"
            to="/admin/leads"
          >
            <span className={cm.cn('material-symbols-outlined')}>person_search</span>
            <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
              {t('agentDashboardSideNavBar.leads', {}, { defaultValue: 'Leads' })}
            </span>
          </Link>
          <Link
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.textSubtle,
              'hover:text-success dark:hover:text-emerald-300 hover:bg-success-light dark:hover:bg-emerald-900/30 transition-all duration-200 ease-in-out',
            )}
            data-mol-id="nav_item_4"
            to="/admin/showings"
          >
            <span className={cm.cn('material-symbols-outlined')}>calendar_today</span>
            <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
              {t('agentDashboardSideNavBar.showings', {}, { defaultValue: 'Showings' })}
            </span>
          </Link>
          <Link
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.textSubtle,
              'hover:text-success dark:hover:text-emerald-300 hover:bg-success-light dark:hover:bg-emerald-900/30 transition-all duration-200 ease-in-out',
            )}
            data-mol-id="nav_item_5"
            to="/admin/analytics"
          >
            <span className={cm.cn('material-symbols-outlined')}>analytics</span>
            <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
              {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
            </span>
          </Link>
        </nav>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'xs' }),
            cm.sp('pt', 4),
            'mt-auto border-t border-border/50',
          )}
          data-mol-id="nav_footer"
        >
          <Link
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSubtle,
              'hover:text-success dark:hover:text-emerald-300 hover:bg-success-light dark:hover:bg-emerald-900/30 transition-all duration-200 ease-in-out',
            )}
            data-mol-id="nav_settings"
            to="/admin/settings"
          >
            <span className={cm.cn('material-symbols-outlined')}>settings</span>
            <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
              {t('nav.settings', {}, { defaultValue: 'Settings' })}
            </span>
          </Link>
          <button
            type="button"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSubtle,
              'hover:text-success dark:hover:text-emerald-300 hover:bg-success-light dark:hover:bg-emerald-900/30 rounded-lg transition-all duration-200 ease-in-out',
            )}
            data-mol-id="nav_logout"
            onClick={handleLogout}
          >
            <span className={cm.cn('material-symbols-outlined')}>logout</span>
            <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
              {t('common.logout', {}, { defaultValue: 'Logout' })}
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}
export { AgentDashboardSideNavBar }
