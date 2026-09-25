import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/locations', key: 'locations', defaultLabel: 'Locations', icon: 'location_on' },
  { to: '/radar', key: 'radar', defaultLabel: 'Radar', icon: 'radar' },
  { to: '/alerts', key: 'alerts', defaultLabel: 'Alerts', icon: 'warning' },
  { to: '/trends', key: 'trends', defaultLabel: 'Trends', icon: 'trending_up' },
  { to: '/compare', key: 'compare', defaultLabel: 'Compare', icon: 'compare_arrows' },
  { to: '/billing', key: 'billing', defaultLabel: 'Billing', icon: 'payments' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Tempest auth'd shell — the shared `ResponsiveAppShell` (from
 * `@molecule/app-ui-react`).
 *
 * The shell owns the breakpoint split (desktop Sidebar ≥768px, mobile Drawer
 * below it), the menu trigger, and the full drawer dialog contract (focus
 * trap, Escape/backdrop close, auto-close on navigation). Exactly ONE shell
 * is mounted per breakpoint, so the duplicate-`<main>`-landmark class of bug
 * the earlier two-shell layout guarded against is structurally impossible.
 *
 * Fleet-canonical composition: the brand lives in the Sidebar on desktop and
 * the TopBar is `mobileOnly` — below the breakpoint it carries the brand +
 * user menu exactly like the previous hand-rolled mobile header, plus the
 * shell's own menu trigger. The SAME nav element is passed to `.Sidebar` and
 * `.Drawer` — only the mounted breakpoint instantiates it.
 */
export function WeatherDashboardLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`weatherDashboardLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  // Single-active-item resolution: the nav item whose `to` is the longest
  // prefix of the current pathname (mirrors the shared SidebarLayout this
  // shell replaces).
  const activeKey = navItems.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = navItems.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  const navLinkClass = (isActive: boolean): string =>
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

  const navLabel = t(
    'weatherDashboardLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  // The SAME nav element for Sidebar and Drawer — only the mounted
  // breakpoint instantiates it. The current item carries aria-current="page".
  const nav = (
    <>
      {navItems.map((item) => {
        const isActive = item.key === activeKey
        return (
          <Link
            key={item.key}
            to={item.to}
            data-mol-id={`nav-${item.key}`}
            aria-current={isActive ? 'page' : undefined}
            className={navLinkClass(isActive)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </>
  )

  const brand = (
    <Link
      to="/dashboard"
      className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 6), cm.displayBlock)}
    >
      {APP_NAME}
    </Link>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <Link
            to="/dashboard"
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}
          >
            {APP_NAME}
          </Link>
        }
        actions={<UserMenu />}
      />
      <ResponsiveAppShell.Sidebar navLabel={navLabel} footer={<UserMenu />}>
        {brand}
        {nav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer navLabel={navLabel} header={brand}>
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
