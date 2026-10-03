/**
 * Admin shell — the SHARED `ResponsiveAppShell` compound from
 * `@molecule/app-ui-react`, wrapping every /admin* route.
 *
 * The shell owns the breakpoint split (768px, one chrome mounted per
 * breakpoint): the desktop Sidebar + the mobile Drawer (full APG dialog —
 * focus trap, Escape/backdrop close, scroll lock, auto-close on navigation)
 * render the SAME nav element, and the mobile-only TopBar renders the 44px
 * menu trigger itself. The former pair of hand-rolled fixed rails
 * (`AdminSideNav` / `AdminDashboardSideNav`, 260px `position: fixed` at EVERY
 * width, overlapping the content on phones) are deleted with it.
 *
 * Nav targets/labels (i18n), longest-prefix active highlighting,
 * `aria-current="page"`, the brand lockup (`brand-logo`) and the user footer
 * (avatar, name, logout) are preserved from the previous side navs.
 */
import type { ReactElement } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { avatarUrl } from '../utils/avatar.js'

const NAV_KEYS = [
  { to: '/admin', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/admin/products', key: 'products', defaultLabel: 'Products', icon: 'inventory_2' },
  { to: '/admin/orders', key: 'orders', defaultLabel: 'Orders', icon: 'shopping_cart' },
  { to: '/admin/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

interface AdminLayoutProps {
  /** The routed admin page content, rendered inside the shell's <main>. */
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps): ReactElement {
  const { t } = useTranslation()
  const cm = getClassMap()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth() as {
    user?: { name?: string; email?: string }
    logout: () => Promise<void>
  }
  const displayName = user?.name?.trim() || user?.email || ''

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname (never highlight every
  // ancestor) — /admin/products is active on /admin/products, /admin is not.
  const activeKey = NAV_KEYS.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = NAV_KEYS.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  // Same-route clicks append `#top` so the URL still changes (no dead links).
  const safeTarget = (to: string): string => {
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  const renderNavLinks = (): ReactElement[] =>
    NAV_KEYS.map((item) => {
      const isActive = item.key === activeKey
      return (
        <Link
          key={item.key}
          to={safeTarget(item.to)}
          data-mol-id={`nav-${item.key}`}
          aria-current={isActive ? 'page' : undefined}
          className={cm.cn(
            'flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium min-h-[44px]',
            isActive
              ? // The container pair, NOT bgPrimarySubtle + textPrimary — brand
                // on a 10% tint of itself fails the 4.5:1 AA floor.
                cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
              : cm.cn('text-on-surface-variant hover:bg-surface-variant', cm.link),
          )}
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
            {item.icon}
          </span>
          <span>
            {t(
              item.key === 'dashboard' || item.key === 'settings'
                ? `nav.${item.key}`
                : `adminSideNav.${item.key}`,
              {},
              { defaultValue: item.defaultLabel },
            )}
          </span>
        </Link>
      )
    })

  const brand = (
    // Links to the storefront home, NOT /admin — the sidebar's Dashboard link
    // is the /admin target, and a second /admin href would double-match
    // `a[href="/admin"]` locators.
    <Link to={safeTarget('/')} data-mol-id="brand-logo" className={cm.cn('block min-w-0')}>
      <span className="flex items-center gap-2">
        <span className="material-symbols-outlined text-success text-[24px]" aria-hidden="true">
          shopping_bag
        </span>
        <span className="flex flex-col leading-tight">
          <span className={cm.cn(cm.textSize('lg'), 'font-black text-success')}>
            {t('adminSideNav.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-foreground-secondary uppercase tracking-wider',
            )}
          >
            {t('adminSideNav.adminPanel', {}, { defaultValue: 'Admin Panel' })}
          </span>
        </span>
      </span>
    </Link>
  )

  // User footer — avatar, name, admin role + sign-out, where both former
  // side navs kept it.
  const handleLogout = async (): Promise<void> => {
    try {
      await logout()
    } finally {
      navigate('/login')
    }
  }
  const userFooter = (
    <div className={cm.cn('w-full', cm.stack(2))}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'min-w-0')}>
        <img
          alt={t('adminSideNav.avatarAlt', {}, { defaultValue: 'Admin User Profile' })}
          className={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, 'object-cover shrink-0')}
          src={avatarUrl(displayName || undefined)}
        />
        <div className={cm.cn('overflow-hidden min-w-0')}>
          <p
            data-mol-id="admin-sidenav-user"
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'truncate')}
          >
            {displayName || t('adminSideNav.unknownUser', {}, { defaultValue: 'Signed in admin' })}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary truncate')}>
            {t('adminSideNav.storeAdmin', {}, { defaultValue: 'Store Admin' })}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 2 }),
          cm.sp('px', 3),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'w-full text-on-surface-variant hover:bg-surface-variant py-2 transition-colors rounded-md min-h-[44px]',
        )}
      >
        <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
          logout
        </span>
        {t('common.logout', {}, { defaultValue: 'Logout' })}
      </button>
    </div>
  )

  // One nav element for BOTH mounts — the shell instantiates only the
  // breakpoint's copy, so the links are never in the DOM twice.
  const nav = (
    <div className={cm.cn(cm.flex1, cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('p', 2))}>
      {renderNavLinks()}
    </div>
  )

  const navAriaLabel = t('adminSideNav.navAriaLabel', {}, { defaultValue: 'Admin navigation' })

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/*
        Mobile top bar (<768px): the shell's 44px menu trigger + brand.
        Desktop returns null (mobileOnly): the Sidebar carries the shell.
      */}
      <ResponsiveAppShell.TopBar mobileOnly brand={brand} />

      {/*
        Desktop sidebar (>=768px): brand + nav + the user footer row.
      */}
      <ResponsiveAppShell.Sidebar navLabel={navAriaLabel} footer={userFooter}>
        {brand}
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): the shell's APG dialog over the SAME nav
        element, user footer inside. `h-full` restores the full-height
        left-panel geometry (the shared panel ships no height token).
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        header={brand}
        footer={userFooter}
        className="h-full"
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>{children}</ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
