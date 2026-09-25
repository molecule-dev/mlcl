import type { ReactElement } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Faultline's authed shell — the shared `ResponsiveAppShell` from
 * `@molecule/app-ui-react`, composed the fleet-canonical way: the brand leads
 * the desktop Sidebar, the mobile-only TopBar carries the menu trigger
 * (rendered by the shell itself) plus the user menu, and the SAME nav element
 * is passed to `.Sidebar` (≥768px) and `.Drawer` (<768px, full APG dialog
 * contract) so only the mounted breakpoint's copy ever instantiates — nav
 * `data-mol-id`s never duplicate in the DOM. The shell owns the breakpoint,
 * the drawer open state, the focus trap, Escape/backdrop close and the
 * auto-close-on-navigation; Faultline-specific parts are the nav items and
 * the brand label, per DESIGN.md's screen list (Dashboard / Issues / Discover
 * / Performance / Alerts / Releases / Projects / Notifications / Team /
 * Settings) + a bottom UserMenu slot.
 */

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'monitor_heart' },
  { to: '/issues', key: 'issues', defaultLabel: 'Issues', icon: 'bug_report' },
  { to: '/discover', key: 'discover', defaultLabel: 'Discover', icon: 'travel_explore' },
  { to: '/performance', key: 'performance', defaultLabel: 'Performance', icon: 'speed' },
  { to: '/alerts', key: 'alerts', defaultLabel: 'Alerts', icon: 'notifications_active' },
  { to: '/releases', key: 'releases', defaultLabel: 'Releases', icon: 'rocket_launch' },
  { to: '/projects', key: 'projects', defaultLabel: 'Projects', icon: 'inventory_2' },
  { to: '/notifications', key: 'notifications', defaultLabel: 'Notifications', icon: 'inbox' },
  { to: '/team', key: 'team', defaultLabel: 'Team', icon: 'group' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/** Focus ring shared by the nav links (kept from the hand-rolled shell). */
const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export function FaultlineLayout(): ReactElement {
  const { t } = useTranslation()
  const cm = getClassMap()
  const { pathname } = useLocation()

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname (same rule the shared
  // sidebar uses — never highlight every ancestor).
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

  const label = (item: (typeof NAV_KEYS)[number]): string =>
    t(`faultlineLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })

  // ONE nav element for both breakpoints — the Sidebar (≥768px) and the
  // Drawer (<768px) receive the same element, and only the mounted
  // breakpoint's copy instantiates. The drawer closes itself on navigation
  // (shell-owned), so links carry no onClick close.
  const nav = (
    <>
      {NAV_KEYS.map((item) => {
        const isActive = item.key === activeKey
        return (
          <Link
            key={item.key}
            to={safeTarget(item.to)}
            data-mol-id={`nav-${item.key}`}
            aria-current={isActive ? 'page' : undefined}
            className={cm.cn(
              'flex min-h-[44px] items-center gap-2 rounded-full px-3 py-2 font-mono text-sm font-medium',
              isActive
                ? // The container pair, NOT bgPrimarySubtle + textPrimary — brand
                  // on a 10% tint of itself fails the 4.5:1 AA floor.
                  cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                : cm.cn('text-on-surface-variant hover:bg-surface-variant', cm.link),
              focusRing,
            )}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              {item.icon}
            </span>
            <span>{label(item)}</span>
          </Link>
        )
      })}
    </>
  )

  // Brand — leads the desktop sidebar, rides in the mobile-only TopBar and
  // the Drawer header. Breakpoint-exclusive mounts, so never duplicated.
  const brand = (
    <Link
      to={safeTarget('/dashboard')}
      data-mol-id="nav-brand"
      className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'block text-on-surface')}
    >
      {APP_NAME}
    </Link>
  )

  const navAriaLabel = t(
    'faultlineLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/*
        Mobile top bar (<768px): the drawer menu trigger (rendered by the
        shell when a Drawer is composed) + brand + user menu. Desktop returns
        null — the sidebar carries the chrome there.
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={brand}
        actions={
          // Cap the user card so the email truncates instead of squeezing
          // the brand off a phone-width top bar.
          <div className="max-w-[46vw] shrink-0">
            <UserMenu />
          </div>
        }
      />

      <ResponsiveAppShell.Sidebar navLabel={navAriaLabel} footer={<UserMenu />}>
        <div className={cm.cn(cm.sp('mb', 6))}>{brand}</div>
        {nav}
      </ResponsiveAppShell.Sidebar>

      <ResponsiveAppShell.Drawer navLabel={navAriaLabel} header={brand} footer={<UserMenu />}>
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
