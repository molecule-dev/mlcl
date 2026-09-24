import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/properties', key: 'properties', defaultLabel: 'Properties', icon: 'apartment' },
  { to: '/tenants', key: 'tenants', defaultLabel: 'Tenants', icon: 'group' },
  { to: '/maintenance', key: 'maintenance', defaultLabel: 'Maintenance', icon: 'handyman' },
  { to: '/leases', key: 'leases', defaultLabel: 'Leases', icon: 'description' },
  { to: '/finances', key: 'finances', defaultLabel: 'Finances', icon: 'payments' },
  { to: '/reports', key: 'reports', defaultLabel: 'Reports', icon: 'analytics' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Hearthstone authed shell — the shared `ResponsiveAppShell`: brand + nav in
 * a desktop sidebar (≥768px), a `mobileOnly` top bar whose menu trigger opens
 * the dialog drawer (<768px) with the SAME nav element, around one content
 * column (Dashboard → Properties → Tenants → Maintenance → Leases → Finances
 * → Reports → Notifications → Settings).
 *
 * The shell owns the breakpoint split, the 44px menu trigger, the drawer's
 * full APG dialog contract (focus trap, Escape/backdrop close, body scroll
 * lock) and auto-close on navigation — the former template-local hamburger
 * button, drawer open state and Escape handler are deleted with the
 * hand-rolled shell.
 */
export function PropertyManagementLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const navItems = NAV_KEYS.map((item) => ({
    ...item,
    label: t(`propertyManagementLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname.
  const activeKey =
    navItems.reduce<string | null>((bestKey, item) => {
      const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
      if (!isMatch) return bestKey
      if (bestKey === null) return item.key
      const best = navItems.find((i) => i.key === bestKey)
      return best && item.to.length > best.to.length ? item.key : bestKey
    }, null) ?? ''

  // safeTarget: when a Link's destination matches the current path, append
  // a `#top` fragment so clicking still produces an observable URL change.
  const safeTarget = (to: string): string => {
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  const navLinkClass = (isActive: boolean): string =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 3),
      cm.sp('py', 2),
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      'rounded-md transition-colors min-h-[40px]',
      isActive
        ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
        : cm.cn(cm.textMuted, 'hover:bg-surface-container hover:text-on-surface'),
    )

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same element, and only the mounted breakpoint instantiates it, so the
  // links are never duplicated in the DOM. `aria-current="page"` marks the
  // active link (the shell renders nav children pass-through).
  const nav = (
    <>
      {navItems.map((item) => {
        const isActive = item.key === activeKey
        return (
          <Link
            key={item.key}
            to={safeTarget(item.to)}
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

  const primaryNavLabel = t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })

  return (
    <ResponsiveAppShell
      sidebarWidth="md"
      className="bg-background text-on-surface antialiased"
      dataMolId="property-management-layout"
    >
      {/* Mobile top bar (<768px, shell-mounted): the trigger renders itself;
          on desktop this bar does not mount — the sidebar carries the brand. */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <Link
            to={safeTarget('/dashboard')}
            data-mol-id="nav-app-home-mobile"
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'inline-flex min-h-[40px] items-center',
            )}
          >
            {APP_NAME}
          </Link>
        }
      />

      {/* Desktop sidebar (≥768px): the brand row leads the nav column (the
          shared Sidebar has no header slot, so it rides inside `children`),
          with the theme toggle + user menu in the bordered footer row. */}
      <ResponsiveAppShell.Sidebar
        navLabel={primaryNavLabel}
        footer={
          <>
            <div className={cm.flex({ align: 'center', justify: 'end' })}>
              <ThemeToggle />
            </div>
            <UserMenu />
          </>
        }
      >
        <Link
          to={safeTarget('/dashboard')}
          data-mol-id="nav-app-home"
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 6),
            'inline-flex min-h-[40px] items-center',
          )}
        >
          {APP_NAME}
        </Link>
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/* Mobile drawer (<768px): the full dialog panel over the same nav. */}
      <ResponsiveAppShell.Drawer
        navLabel={primaryNavLabel}
        header={<span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>{APP_NAME}</span>}
        footer={
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <ThemeToggle />
            <UserMenu />
          </div>
        }
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
