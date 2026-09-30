import type { ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { UserMenu } from './UserMenu.js'
import { BrandWordmark } from './BrandWordmark.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/calendar', key: 'calendar', defaultLabel: 'Calendar', icon: 'calendar_month' },
  { to: '/bookings', key: 'bookings', defaultLabel: 'Bookings', icon: 'event_available' },
  { to: '/event-types', key: 'eventTypes', defaultLabel: 'Event types', icon: 'badge' },
  { to: '/availability', key: 'availability', defaultLabel: 'Availability', icon: 'schedule' },
  { to: '/integrations', key: 'integrations', defaultLabel: 'Integrations', icon: 'sync' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Meridian app shell — the shared `ResponsiveAppShell`.
 *
 * Desktop (≥768px): a sidebar carrying the brand, the primary nav (items
 * reflect the meeting-scheduler screen-map) and the user menu in its footer
 * slot. Mobile (<768px): a mobile-only top bar (brand + user menu) whose menu
 * trigger opens the drawer carrying the SAME nav element — only the mounted
 * breakpoint instantiates it. The shell owns the drawer's full dialog
 * contract (focus trap, Escape, backdrop, auto-close on navigation), so the
 * app keeps none of that wiring.
 */

function BrandMark({ cm }: { cm: ReturnType<typeof getClassMap> }) {
  return (
    <Link
      to="/dashboard"
      data-mol-id="layout-brand"
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.textSize('lg'),
        'font-extrabold tracking-tighter min-w-0',
      )}
    >
      <BrandWordmark as="span" size="sm" />
    </Link>
  )
}

export function MeridianLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()

  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`meridianLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  const navAriaLabel = t(
    'meridianLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  // ONE nav list for both surfaces — the shell mounts exactly one per
  // breakpoint, so this element instantiates once. The shell closes the
  // drawer on navigation, so rows need no close-on-navigate wiring.
  const nav: ReactNode = (
    <ul className={cm.cn(cm.flex({ direction: 'col' }), cm.sp('p', 3), cm.stack(1))}>
      {navItems.map((item) => {
        const isActive =
          location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
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
              <span>{item.label}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md" className="text-on-surface antialiased">
      {/* Mobile-only: the desktop sidebar carries the brand and the user menu. */}
      <ResponsiveAppShell.TopBar mobileOnly brand={<BrandMark cm={cm} />} actions={<UserMenu />} />
      <ResponsiveAppShell.Sidebar navLabel={navAriaLabel} footer={<UserMenu side="left" />}>
        <div className={cm.sp('p', 3)}>
          <BrandMark cm={cm} />
        </div>
        {nav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer header={<BrandMark cm={cm} />} navLabel={navAriaLabel}>
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content className={cm.pageShellContent}>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default MeridianLayout
