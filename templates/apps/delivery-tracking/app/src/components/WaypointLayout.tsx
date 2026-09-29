import { type ReactElement, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * App shell for every authenticated route.
 *
 * ≥768px mirrors the shared `SidebarLayout` look (brand + vertical nav +
 * user card at the bottom of a fixed sidebar). Below 768px the sidebar is
 * replaced by a template-local mobile shell — a sticky top bar (menu button,
 * brand, user card) plus a slide-in drawer — because the shared component has
 * no mobile collapse and a permanent 210px sidebar crushes 390px content.
 * Both chrome variants render one `<Outlet />`; CSS `hidden`/`md:flex` keeps
 * exactly one in the accessibility tree per viewport.
 */

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/shipments', key: 'shipments', defaultLabel: 'Shipments', icon: 'local_shipping' },
  { to: '/alerts', key: 'alerts', defaultLabel: 'Alerts', icon: 'warning' },
  { to: '/carriers', key: 'carriers', defaultLabel: 'Carriers', icon: 'business' },
  { to: '/analytics', key: 'analytics', defaultLabel: 'Analytics', icon: 'insights' },
  { to: '/webhooks', key: 'webhooks', defaultLabel: 'Webhooks', icon: 'webhook' },
  { to: '/team', key: 'team', defaultLabel: 'Team', icon: 'group' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function WaypointLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Route changes always collapse the drawer — navigation must never leave a
  // full-screen panel open over the page the user just navigated to.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Escape closes the drawer (keyboard users must not be trapped behind it).
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`waypointLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  const navAriaLabel = t(
    'waypointLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )
  const openMenuLabel = t('waypointLayout.openMenu', {}, { defaultValue: 'Open navigation menu' })
  const closeMenuLabel = t(
    'waypointLayout.closeMenu',
    {},
    { defaultValue: 'Close navigation menu' },
  )

  const navLinks = (onNavigate?: () => void): ReactElement => (
    <nav className={cm.cn(cm.flex1, cm.stack(1))} aria-label={navAriaLabel}>
      {navItems.map((item) => (
        <NavLink
          key={item.key}
          to={item.to}
          data-mol-id={`nav-${item.key}`}
          onClick={onNavigate}
          className={({ isActive }) =>
            cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.roundedFull,
              isActive
                ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                : cm.cn(cm.textMuted, cm.link),
            )
          }
        >
          {item.icon ? (
            <span className="material-symbols-outlined" aria-hidden="true">
              {item.icon}
            </span>
          ) : null}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div
      className={cm.cn(cm.pageShell, cm.page, 'flex-col md:flex-row')}
      data-mol-id="waypoint-layout"
    >
      {/* Desktop sidebar — hidden (and out of the a11y tree) below 768px. */}
      <aside
        className={cm.cn(
          cm.sp('p', 4),
          cm.shrink0,
          cm.flex({ direction: 'col' }),
          cm.surface,
          cm.borderR,
          'hidden md:flex',
        )}
        style={{ width: 240 }}
      >
        <Link
          to="/dashboard"
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 6),
            cm.displayBlock,
          )}
        >
          {APP_NAME}
        </Link>
        {navLinks()}
        <div className={cm.cn(cm.sp('pt', 4), cm.borderT)}>
          <UserMenu />
        </div>
      </aside>

      {/* Mobile top bar + drawer — the only chrome below 768px. */}
      <header
        className={cm.cn(
          cm.surface,
          cm.borderB,
          'md:hidden sticky top-0 z-30 flex h-14 items-center gap-2 px-3',
        )}
      >
        <button
          type="button"
          data-mol-id="button-mobile-nav"
          aria-label={drawerOpen ? closeMenuLabel : openMenuLabel}
          aria-expanded={drawerOpen}
          aria-controls="waypoint-mobile-drawer"
          onClick={() => setDrawerOpen((open) => !open)}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-10 w-10 shrink-0 rounded-md hover:bg-surface-container',
          )}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {drawerOpen ? 'close' : 'menu'}
          </span>
        </button>
        <Link
          to="/dashboard"
          className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'min-w-0 truncate')}
        >
          {APP_NAME}
        </Link>
        {/* Cap the user card so a long email cannot squeeze the brand out. */}
        <div className={cm.cn('ml-auto max-w-[44vw] shrink')}>
          <UserMenu />
        </div>
      </header>

      {drawerOpen ? (
        <div
          role="presentation"
          data-mol-id="mobile-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          className={cm.cn('md:hidden fixed inset-0 z-40 bg-black/40')}
        />
      ) : null}
      {drawerOpen ? (
        <div
          id="waypoint-mobile-drawer"
          data-mol-id="mobile-drawer"
          className={cm.cn(
            cm.surface,
            'md:hidden fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] overflow-y-auto p-4 shadow-xl',
          )}
          style={{ animation: 'waypoint-drawer-in 160ms ease-out' }}
        >
          <div className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
            {APP_NAME}
          </div>
          {navLinks(() => setDrawerOpen(false))}
        </div>
      ) : null}

      {/* `minWidth: 0` lets the scroll area shrink below its content width in the
          flex row (no min-w-0 token exists) — the documented ClassMap can't-express case. */}
      <main className={cm.cn(cm.pageShellContent)} style={{ minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  )
}
