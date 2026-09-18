import { Link, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { avatarUrl } from '../utils/avatar.js'

function AdminDashboardSideNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user, logout } = useAuth() as {
    user?: { name?: string; email?: string }
    logout: () => Promise<void>
  }
  const displayName = user?.name?.trim() || user?.email || ''
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
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('py', 6),
        'fixed left-0 top-0 h-screen w-64 bg-foreground border-r border-slate-800 shadow-xl z-50',
      )}
    >
      <div className={cm.cn(cm.sp('px', 6), cm.sp('mb', 10))}>
        <h1 className={cm.cn(cm.textSize('2xl'), 'font-black text-white tracking-tight')}>
          {t('adminSideNav.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            cm.sp('mt', 1),
            'text-foreground-tertiary uppercase tracking-widest',
          )}
        >
          {t('adminSideNav.title', {}, { defaultValue: 'Admin Panel' })}
        </p>
      </div>
      <nav className={cm.cn(cm.flex1, cm.stack(1))}>
        {/* Active State Logic: Dashboard is active */}
        <Link
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 bg-primary text-on-primary rounded-lg mx-2 transition-transform active:opacity-90 active:scale-95',
          )}
          to="/admin"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="dashboard">
            dashboard
          </span>
          <span className={cm.cn(cm.textSize('sm'), 'font-sans antialiased')}>
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 text-foreground-tertiary hover:text-white transition-colors mx-2 hover:bg-foreground',
          )}
          to="/admin/products"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="inventory_2">
            inventory_2
          </span>
          <span className={cm.cn(cm.textSize('sm'), 'font-sans antialiased')}>
            {t('adminSideNav.products', {}, { defaultValue: 'Products' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 text-foreground-tertiary hover:text-white transition-colors mx-2 hover:bg-foreground',
          )}
          to="/admin/orders"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="shopping_cart">
            shopping_cart
          </span>
          <span className={cm.cn(cm.textSize('sm'), 'font-sans antialiased')}>
            {t('adminSideNav.orders', {}, { defaultValue: 'Orders' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            'flex items-center gap-3 px-4 py-3 text-foreground-tertiary hover:text-white transition-colors mx-2 hover:bg-foreground',
          )}
          to="/admin/settings"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="settings">
            settings
          </span>
          <span className={cm.cn(cm.textSize('sm'), 'font-sans antialiased')}>
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </span>
        </Link>
      </nav>
      <div className={cm.cn(cm.sp('px', 4), cm.sp('pt', 6), 'mt-auto border-t border-slate-800')}>
        <div
          className={cm.cn(cm.flex({ align: 'center' }), cm.sp('px', 2), cm.sp('mb', 6), 'gap-3')}
        >
          <img
            alt={displayName || t('adminSideNav.avatarAlt', {}, { defaultValue: 'Admin avatar' })}
            className={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, 'object-cover')}
            src={avatarUrl(displayName || 'Admin')}
          />
          <div className={cm.cn('overflow-hidden')}>
            <p
              data-mol-id="admin-dashboard-sidenav-user"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-white truncate')}
            >
              {displayName ||
                t('adminSideNav.unknownUser', {}, { defaultValue: 'Signed in admin' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-foreground-tertiary truncate')}>
              {t('adminSideNav.adminRole', {}, { defaultValue: 'Head Admin' })}
            </p>
          </div>
        </div>
        <button
          type="button"
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.sp('mx', 2),
            'gap-3 text-foreground-tertiary hover:text-white transition-colors hover:bg-foreground rounded-lg',
          )}
          onClick={handleLogout}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="logout">
            logout
          </span>
          <span className={cm.cn(cm.textSize('sm'), 'font-sans antialiased')}>
            {t('common.logout', {}, { defaultValue: 'Logout' })}
          </span>
        </button>
      </div>
    </aside>
  )
}

export default AdminDashboardSideNav
export { AdminDashboardSideNav }
