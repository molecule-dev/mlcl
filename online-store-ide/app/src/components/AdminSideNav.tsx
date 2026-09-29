import { Link, useLocation, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { avatarUrl } from '../utils/avatar.js'

export default function AdminSideNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user, logout } = useAuth() as {
    user?: { name?: string; email?: string }
    logout: () => Promise<void>
  }
  const __navigate = useNavigate()
  const { pathname } = useLocation()
  const displayName = user?.name?.trim() || user?.email || ''
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      await logout()
    } finally {
      __navigate('/login')
    }
  }
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'fixed left-0 top-0 h-screen w-[260px] border-r border-border bg-surface shadow-sm h-full z-50',
      )}
    >
      {/* Brand Header */}
      <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8))}>
        <div className={cm.flex({ align: 'center', gap: 3 })}>
          <div className={cm.cn('bg-primary p-1.5 rounded-lg')}>
            <span
              className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined text-on-primary')}
              data-icon="shopping_bag"
            >
              shopping_bag
            </span>
          </div>
          <div>
            <h1 className={cm.cn(cm.textSize('2xl'), 'font-black text-success leading-tight')}>
              {t('adminSideNav.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'text-foreground-secondary uppercase tracking-wider',
              )}
            >
              {t('adminSideNav.adminPanel', {}, { defaultValue: 'Admin Panel' })}
            </p>
          </div>
        </div>
      </div>
      {/* Navigation Links */}
      <nav className={cm.cn(cm.flex1, cm.sp('px', 4), cm.stack(1))}>
        <Link
          className={
            pathname === '/admin'
              ? 'bg-success-light text-success border-l-4 border-green-600 px-4 py-3 flex items-center gap-3 transition-colors font-sans text-sm font-medium'
              : 'text-foreground-secondary hover:bg-surface-secondary px-4 py-3 flex items-center gap-3 transition-colors rounded-md font-sans text-sm font-medium'
          }
          to="/admin"
          id="sidebar-nav-dashboard"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="dashboard">
            dashboard
          </span>
          {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
        </Link>
        {/* ACTIVE TAB: Products */}
        <Link
          className={
            pathname === '/admin/products'
              ? 'bg-success-light text-success border-l-4 border-green-600 px-4 py-3 flex items-center gap-3 transition-colors font-sans text-sm font-medium'
              : 'text-foreground-secondary hover:bg-surface-secondary px-4 py-3 flex items-center gap-3 transition-colors rounded-md font-sans text-sm font-medium'
          }
          to="/admin/products"
          id="sidebar-nav-products"
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            data-icon="inventory_2"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            inventory_2
          </span>
          {t('adminSideNav.products', {}, { defaultValue: 'Products' })}
        </Link>
        <Link
          className={
            pathname === '/admin/orders'
              ? 'bg-success-light text-success border-l-4 border-green-600 px-4 py-3 flex items-center gap-3 transition-colors font-sans text-sm font-medium'
              : 'text-foreground-secondary hover:bg-surface-secondary px-4 py-3 flex items-center gap-3 transition-colors rounded-md font-sans text-sm font-medium'
          }
          to="/admin/orders"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="shopping_cart">
            shopping_cart
          </span>
          {t('adminSideNav.orders', {}, { defaultValue: 'Orders' })}
        </Link>
        <Link
          className={
            pathname === '/admin/settings'
              ? 'bg-success-light text-success border-l-4 border-green-600 px-4 py-3 flex items-center gap-3 transition-colors font-sans text-sm font-medium'
              : 'text-foreground-secondary hover:bg-surface-secondary px-4 py-3 flex items-center gap-3 transition-colors rounded-md font-sans text-sm font-medium'
          }
          to="/admin/settings"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="settings">
            settings
          </span>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </Link>
      </nav>
      {/* Footer / User Info */}
      <div className={cm.cn(cm.sp('p', 4), 'border-t border-border')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('px', 2),
            cm.sp('py', 3),
            cm.sp('mb', 2),
          )}
        >
          <img
            alt={t('adminSideNav.avatarAlt', {}, { defaultValue: 'Admin User Profile' })}
            className={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, 'object-cover')}
            src={avatarUrl(displayName)}
          />
          <div className={cm.cn('overflow-hidden')}>
            <p
              data-mol-id="admin-sidenav-user"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'truncate')}
            >
              {displayName ||
                t('adminSideNav.unknownUser', {}, { defaultValue: 'Signed in admin' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary truncate')}>
              {t('adminSideNav.storeAdmin', {}, { defaultValue: 'Store Admin' })}
            </p>
          </div>
        </div>
        <button
          className={cm.cn(
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('px', 4),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'w-full text-foreground-secondary hover:bg-surface-secondary py-2.5 transition-colors rounded-md font-sans',
          )}
          onClick={handleLogout}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="logout">
            logout
          </span>
          {t('common.logout', {}, { defaultValue: 'Logout' })}
        </button>
      </div>
    </aside>
  )
}
export { AdminSideNav }
