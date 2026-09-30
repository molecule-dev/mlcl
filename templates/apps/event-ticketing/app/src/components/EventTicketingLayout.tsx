import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'space_dashboard' },
  { to: '/events', key: 'events', defaultLabel: 'Discover', icon: 'confirmation_number' },
  { to: '/events/new', key: 'create', defaultLabel: 'Host event', icon: 'add_circle' },
  { to: '/my-tickets', key: 'myTickets', defaultLabel: 'My tickets', icon: 'qr_code_2' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Authed app shell — the shared `ResponsiveAppShell`.
 *
 * One composition serves both breakpoints: the top bar (brand + user menu)
 * mounts everywhere and renders the mobile menu trigger itself; the sidebar
 * mounts ≥768px and the dialog drawer <768px. The same nav element is passed
 * to `Sidebar` and `Drawer`, so only the mounted breakpoint ever instantiates
 * it. The shell owns the drawer open state, Escape/backdrop handling, the
 * SPA-navigation close, and the root flex direction — no app-side shims.
 */

function BrandMark() {
  return (
    <Link to="/dashboard" data-mol-id="layout-brand" className="min-w-0">
      <BrandWordmark to="/dashboard" as="span" size="sm" />
    </Link>
  )
}

export function EventTicketingLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()

  const navAriaLabel = t(
    'eventTicketingLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  // One nav element for `Sidebar` (≥768px) and `Drawer` (<768px) — only the
  // mounted breakpoint instantiates it, so no duplicate nav landmarks.
  const nav = (
    <ul className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(1))}>
      {NAV_KEYS.map((item) => {
        const isActive =
          location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
        const label = t(
          `eventTicketingLayout.nav.${item.key}`,
          {},
          { defaultValue: item.defaultLabel },
        )
        return (
          <li key={item.key}>
            <Link
              to={item.to}
              data-mol-id={`nav-${item.key}`}
              aria-current={isActive ? 'page' : undefined}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 3),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'font-medium rounded-xl',
                isActive
                  ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                  : cm.cn(cm.textMuted, cm.link),
              )}
            >
              {item.icon ? (
                <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                  {item.icon}
                </span>
              ) : null}
              <span>{label}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md" className="antialiased">
      <ResponsiveAppShell.TopBar
        brand={<BrandMark />}
        actions={
          <div className="text-on-surface-variant hover:text-on-surface transition-colors">
            <UserMenu />
          </div>
        }
      />
      <ResponsiveAppShell.Sidebar navLabel={navAriaLabel}>{nav}</ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer navLabel={navAriaLabel} header={<BrandMark />}>
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
