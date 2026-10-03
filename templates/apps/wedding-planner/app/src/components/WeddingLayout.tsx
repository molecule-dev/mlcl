import type { ReactElement } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'space_dashboard' },
  { to: '/guests', key: 'guests', defaultLabel: 'Guests', icon: 'group' },
  { to: '/budget', key: 'budget', defaultLabel: 'Budget', icon: 'savings' },
  { to: '/vendors', key: 'vendors', defaultLabel: 'Vendors', icon: 'storefront' },
  { to: '/tasks', key: 'tasks', defaultLabel: 'Tasks', icon: 'checklist' },
  { to: '/seating', key: 'seating', defaultLabel: 'Seating', icon: 'table_restaurant' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Responsive app shell, composed from the shared `ResponsiveAppShell`
 * compound (`@molecule/app-ui-react`). The TopBar is mobile-only (the shell
 * root is a flex ROW on desktop, so the desktop chrome is the sidebar alone
 * — exactly the layout this app shipped before adopting the compound); the
 * shell owns the hamburger trigger, drawer focus trap, scroll lock and
 * route-close. The SAME nav element goes to Sidebar and Drawer — only the
 * mounted breakpoint instantiates it, so nav `data-mol-id`s are never
 * duplicated in the DOM.
 */
export function WeddingLayout(): ReactElement {
  const { t } = useTranslation()
  const cm = getClassMap()
  const { pathname } = useLocation()

  const navAriaLabel = t(
    'weddingLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

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
              'flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium min-h-[40px]',
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
              {t(`weddingLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
            </span>
          </Link>
        )
      })}
    </>
  )

  // Brand lockup — the ONE shared brand component. Rides the mobile top bar,
  // the desktop sidebar's nav column and the drawer header; only one mounts
  // per breakpoint, so it never duplicates in the DOM.
  const brand = (
    <Link to={safeTarget('/dashboard')} className="block">
      <BrandWordmark as="span" size="sm" />
    </Link>
  )

  // Sidebar/drawer bottom bar — user menu left, theme toggle right (the
  // shell's footer slot owns the row layout and top border).
  const chromeFooter = (
    <>
      <div className="text-on-surface-variant hover:text-on-surface transition-colors">
        <UserMenu />
      </div>
      <div className="text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-variant">
        <ThemeToggle />
      </div>
    </>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/* Mobile top bar (<768px) — the shell renders the menu trigger itself. */}
      <ResponsiveAppShell.TopBar mobileOnly brand={brand} actions={<UserMenu />} />

      {/* Desktop sidebar (≥768px): brand leads the nav column. */}
      <ResponsiveAppShell.Sidebar
        navLabel={navAriaLabel}
        className={cm.sp('p', 4)}
        footer={chromeFooter}
      >
        <div className={cm.sp('mb', 6)}>{brand}</div>
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/* Mobile drawer (<768px): full APG dialog contract over the same nav. */}
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        className="h-full"
        header={brand}
        footer={
          // The drawer's footer slot is a column — restore the original row.
          <div className="flex w-full items-center justify-between gap-2">{chromeFooter}</div>
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
