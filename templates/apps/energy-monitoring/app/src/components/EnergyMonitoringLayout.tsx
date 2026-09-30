import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/devices', key: 'devices', defaultLabel: 'Devices', icon: 'sensors' },
  { to: '/reports', key: 'reports', defaultLabel: 'Reports', icon: 'analytics' },
  { to: '/alerts', key: 'alerts', defaultLabel: 'Alerts', icon: 'notifications_active' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/billing', key: 'billing', defaultLabel: 'Billing', icon: 'credit_card' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Voltrace app shell — the shared `ResponsiveAppShell`.
 *
 * The shell owns the breakpoint split (Sidebar ≥768px, mobile Drawer below
 * it), the menu trigger, and the full drawer dialog contract (focus trap,
 * Escape/backdrop close, auto-close on navigation). The brand lives in the
 * Sidebar on desktop; the TopBar is mobile-only and renders the trigger next
 * to the brand + ThemeToggle below the breakpoint. The SAME nav element is
 * passed to Sidebar and Drawer — only the mounted breakpoint instantiates it.
 */
export function EnergyMonitoringLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`energyMonitoringLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  // Single-active-item resolution: the nav item whose `to` is the longest
  // prefix of the current pathname (mirrors the shared SidebarLayout).
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
      'min-h-[44px]',
      isActive
        ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
        : cm.cn(cm.textMuted, cm.link),
    )

  const navLabel = t(
    'energyMonitoringLayout.primaryNavLabel',
    {},
    {
      defaultValue: 'Primary navigation',
    },
  )

  // The SAME nav element for Sidebar and Drawer — only the mounted
  // breakpoint instantiates it.
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
    <div className={cm.cn(cm.sp('mb', 6), cm.displayBlock)}>
      <BrandWordmark to="/dashboard" />
    </div>
  )

  // Nudge the shared UserMenu trigger to a 36px+ tap target. The menu lives
  // in the left sidebar/drawer footer, so its panel opens from the left too.
  const userMenu = (
    <span className="inline-flex [&_button]:min-h-[36px] [&_button]:min-w-[36px]">
      <UserMenu side="left" />
    </span>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={<BrandWordmark to="/dashboard" size="sm" />}
        actions={<ThemeToggle />}
      />
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        footer={
          /* Sidebar bottom bar — styled to match the sidebar. Without the
             separator + hover wrappers, UserMenu + ThemeToggle render as
             bare browser controls bolted onto a styled sidebar. */
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              'w-full border-t border-outline-variant/40 pt-3',
            )}
          >
            <div className="text-on-surface-variant hover:text-on-surface transition-colors">
              {userMenu}
            </div>
            <div className="text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container">
              <ThemeToggle />
            </div>
          </div>
        }
      >
        {brand}
        {nav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer navLabel={navLabel} header={brand} footer={userMenu}>
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
