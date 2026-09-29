import { Link, NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'
import { TroveMobileNav } from './TroveMobileNav.js'
import { UserMenu } from './UserMenu.js'

/**
 * Authenticated creator dashboard shell.
 *
 * Desktop (lg+): 260px sidebar with creator destinations (Dashboard,
 * Products, Sales, Library, Orders, Settings) and the user menu in the
 * footer slot. Below lg the rail collapses into a top bar (brand +
 * theme toggle + user menu) and a fixed bottom tab bar
 * (`TroveMobileNav`) — the shared `@molecule/app-sidebar-layout-react`
 * `SidebarLayout` keeps its 260px rail at phone widths and squeezes the
 * content off-screen, so this shell is rendered inline per the fleet
 * mobile-shell pattern (crowdfunding/CreatorSidebarLayout).
 */
export function DigitalGoodsStoreLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navItems = [
    {
      to: '/dashboard',
      key: 'dashboard',
      icon: 'space_dashboard',
      label: t('nav.dashboard', {}, { defaultValue: 'Dashboard' }),
    },
    {
      to: '/products',
      key: 'products',
      icon: 'inventory_2',
      label: t('nav.products', {}, { defaultValue: 'Products' }),
    },
    {
      to: '/sales',
      key: 'sales',
      icon: 'point_of_sale',
      label: t('nav.sales', {}, { defaultValue: 'Sales' }),
    },
    {
      to: '/library',
      key: 'library',
      icon: 'folder_special',
      label: t('nav.library', {}, { defaultValue: 'Library' }),
    },
    {
      to: '/orders',
      key: 'orders',
      icon: 'receipt_long',
      label: t('nav.orders', {}, { defaultValue: 'Orders' }),
    },
    {
      to: '/settings',
      key: 'settings',
      icon: 'tune',
      label: t('nav.settings', {}, { defaultValue: 'Settings' }),
    },
  ]
  return (
    <div
      className={cm.cn('min-h-screen flex flex-col lg:flex-row bg-bg text-on-surface')}
      data-mol-id="dgs-layout"
    >
      {/* Desktop sidebar — replaces the shared SidebarLayout rail. */}
      <aside
        className={cm.cn(
          'hidden lg:flex flex-col w-[260px] fixed inset-y-0 left-0 z-40 border-r border-border bg-surface',
        )}
        aria-label={t('nav.creatorAria', {}, { defaultValue: 'Creator dashboard' })}
      >
        <Link
          to="/dashboard"
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('p', 6))}
          aria-label={APP_NAME}
        >
          <BrandWordmark to="/dashboard" size="sm" />
        </Link>

        <nav className={cm.cn(cm.flex1, cm.sp('px', 4), cm.stack(1), 'overflow-y-auto')}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  cm.roundedFull,
                  'transition-colors',
                  isActive
                    ? 'bg-primary-light text-primary-dark font-semibold'
                    : 'text-on-surface-variant hover:bg-bg-secondary hover:text-on-surface',
                )
              }
              data-mol-id={`dgs-nav-${item.key}`}
            >
              <span
                className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={cm.cn(cm.sp('p', 4), 'border-t border-border')}>
          <UserMenu />
        </div>
      </aside>

      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.flex1,
          'min-w-0 min-h-screen lg:ml-[260px]',
        )}
      >
        {/* Top bar — the only chrome on phones. */}
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-border',
          )}
        >
          <Link
            to="/dashboard"
            className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'lg:hidden')}
            aria-label={APP_NAME}
          >
            <BrandWordmark to="/dashboard" size="sm" />
          </Link>
          <div className={cm.cn(cm.flex1, 'hidden lg:block')} aria-hidden="true" />
          <div className={cm.flex({ align: 'center', gap: 'xs' })}>
            <ThemeToggle />
            <span className="lg:hidden">
              <UserMenu />
            </span>
          </div>
        </header>

        <main className={cm.flex1}>
          <Outlet />
        </main>
        {/* Clear the fixed mobile bottom nav (hidden at lg where the
            sidebar takes over). */}
        <div className={cm.cn('h-16 lg:hidden')} aria-hidden="true" />
      </div>
      <TroveMobileNav />
    </div>
  )
}

export default DigitalGoodsStoreLayout
