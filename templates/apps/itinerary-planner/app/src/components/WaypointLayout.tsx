/**
 * Waypoint sidebar shell — the shared `ResponsiveAppShell` family from
 * `@molecule/app-ui-react` wraps every authed route (Dashboard, Trips,
 * Bookings, Calendar, Notifications, Settings).
 *
 * Fleet-canonical composition for a desktop-sidebar app: the brand wordmark
 * lives in the `.Sidebar` (and the `.Drawer` header), and the `.TopBar` is
 * `mobileOnly` — it renders only below 768px, carrying the menu trigger
 * (the shell draws it), the wordmark and the user menu. `.Sidebar` (≥768px)
 * and `.Drawer` (<768px, full APG dialog contract) receive the SAME nav
 * element, so only the mounted breakpoint instantiates it and nav
 * `data-mol-ids` never duplicate in the DOM. The shell owns the drawer open
 * state, the hamburger trigger, Escape/backdrop handling, focus trapping and
 * auto-close-on-navigation — the former template-local `MobileTopBar` /
 * `useIsMobile` chrome was deleted in favor of it.
 *
 * The nav inventory below is the single source shared by both surfaces
 * (curated to Waypoint's travel-journal information architecture: Dashboard →
 * Trips → Calendar → Destinations → Bookings → Expenses → Notifications →
 * Settings).
 */

import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/trips', key: 'trips', defaultLabel: 'Trips', icon: 'luggage' },
  { to: '/calendar', key: 'calendar', defaultLabel: 'Calendar', icon: 'calendar_month' },
  { to: '/destinations', key: 'destinations', defaultLabel: 'Destinations', icon: 'explore' },
  { to: '/bookings', key: 'bookings', defaultLabel: 'Bookings', icon: 'confirmation_number' },
  { to: '/expenses', key: 'expenses', defaultLabel: 'Expenses', icon: 'payments' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export function WaypointLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
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

  // The SAME nav element for both surfaces — only the mounted breakpoint
  // instantiates it. Longest-prefix active match: /trips/new marks Trips.
  const nav = (
    <>
      {navItems.map((item) => {
        const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`)
        return (
          <Link
            key={item.key}
            to={item.to}
            data-mol-id={`nav-${item.key}`}
            aria-current={isActive ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center' }),
              'min-h-[44px] px-3 py-2.5 rounded-lg gap-3 text-sm font-medium',
              isActive
                ? 'border-l-4 border-primary bg-surface-container-lowest font-bold text-primary shadow-sm'
                : 'border-l-4 border-transparent text-on-surface-variant hover:bg-surface-container',
              FOCUS_RING,
            )}
          >
            <span
              className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            {item.label}
          </Link>
        )
      })}
    </>
  )

  // Wordmark → /dashboard, styled like the app's small uppercase brand lockup.
  const brand = (
    <Link
      to="/dashboard"
      className={cm.cn(
        'rounded text-[0.65rem] font-bold uppercase tracking-[0.25em] text-primary truncate',
        FOCUS_RING,
      )}
    >
      {APP_NAME}
    </Link>
  )
  // Drawer header wordmark — bigger lockup, as the old drawer header had.
  const drawerBrand = (
    <span className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight')}>{APP_NAME}</span>
  )

  return (
    <ResponsiveAppShell sidebarWidth="lg">
      <ResponsiveAppShell.TopBar mobileOnly brand={brand} actions={<UserMenu />} />
      <ResponsiveAppShell.Sidebar navLabel={navAriaLabel} footer={<UserMenu />}>
        <div className={cm.cn(cm.sp('px', 3), cm.sp('py', 2))}>{brand}</div>
        {nav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer navLabel={navAriaLabel} header={drawerBrand}>
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
