/**
 * App shell — layout for the auth'd Arbor surface, on the shared
 * `ResponsiveAppShell` compound family (`@molecule/app-ui-react`): a mobile
 * top bar (<768px: trigger + brand + user menu) around a desktop sidebar
 * (≥768px, brand + nav + user menu) and a mobile nav drawer (<768px). Exactly
 * ONE nav mounts per breakpoint, so nav `data-mol-id`s are never duplicated
 * in the DOM. The shell owns the drawer trigger, open state, focus trap,
 * scroll lock, Escape/backdrop handling and closes on navigation.
 */
import type { ReactElement } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/employees', key: 'employees', defaultLabel: 'Employees', icon: 'group' },
  { to: '/org-chart', key: 'orgChart', defaultLabel: 'Org chart', icon: 'account_tree' },
  { to: '/pto', key: 'pto', defaultLabel: 'Time off', icon: 'calendar_month' },
  { to: '/onboarding', key: 'onboarding', defaultLabel: 'Onboarding', icon: 'task_alt' },
  { to: '/performance', key: 'performance', defaultLabel: 'Performance', icon: 'trending_up' },
  { to: '/documents', key: 'documents', defaultLabel: 'Documents', icon: 'folder_shared' },
  { to: '/reports', key: 'reports', defaultLabel: 'Reports', icon: 'bar_chart' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

export function ArborLayout(): ReactElement {
  const { t } = useTranslation()
  const cm = getClassMap()
  const { pathname } = useLocation()

  const navAriaLabel = t('arborLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname (never highlight every
  // ancestor).
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

  // One nav element definition, passed to BOTH the sidebar and the drawer —
  // only the mounted breakpoint's copy instantiates, so `nav-*` locators stay
  // unique. The shell closes the drawer on navigation itself.
  const navLinks: ReactElement[] = NAV_KEYS.map((item) => {
    const isActive = item.key === activeKey
    const label = t(`arborLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })
    return (
      <Link
        key={item.key}
        to={safeTarget(item.to)}
        data-mol-id={`nav-${item.key}`}
        aria-current={isActive ? 'page' : undefined}
        className={cm.cn(
          'flex min-h-[44px] items-center gap-2 rounded-full px-3 py-2 text-sm font-medium',
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
        <span>{label}</span>
      </Link>
    )
  })

  const brand: ReactElement = (
    <Link
      to={safeTarget('/dashboard')}
      data-mol-id="nav-brand"
      className={cm.cn('block text-on-surface')}
    >
      <BrandWordmark as="span" />
    </Link>
  )

  // Styled cell so the menu doesn't render as a bare browser control inside
  // the styled sidebar/drawer footer (fleet chrome pattern).
  const userMenuCell = (
    <div className="text-on-surface-variant hover:text-on-surface transition-colors">
      <UserMenu side="left" />
    </div>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/*
        Mobile top bar (<768px): the shell renders the menu trigger itself;
        brand + user menu need a home that does not eat the viewport. The
        desktop shell carries the brand + user menu in the sidebar instead
        (the TopBar is unmounted ≥768px via mobileOnly).
      */}
      <ResponsiveAppShell.TopBar mobileOnly brand={brand} actions={<UserMenu />} />

      {/*
        Desktop sidebar (≥768px). The brand row leads the nav column — the
        shared Sidebar has no header slot, so it rides inside `children` — and
        the user menu sits in the bordered footer row (where SidebarLayout's
        `userMenu` slot used to render).
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navAriaLabel}
        className={cm.sp('p', 4)}
        footer={userMenuCell}
      >
        <div className={cm.sp('mb', 4)}>{brand}</div>
        {navLinks}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): the shell provides the APG dialog contract
        (focus trap, Escape, backdrop click, body-scroll lock) over the same
        nav; the user menu rides in the footer like it did in the hand-rolled
        drawer. `h-full` restores the documented full-height left-panel
        geometry (the shared panel ships no height token).
      */}
      <ResponsiveAppShell.Drawer navLabel={navAriaLabel} className="h-full" footer={userMenuCell}>
        {navLinks}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
