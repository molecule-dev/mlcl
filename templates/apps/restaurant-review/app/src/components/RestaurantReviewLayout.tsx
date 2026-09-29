/**
 * Authenticated app shell for Morsel — the shared `ResponsiveAppShell`.
 *
 * Fleet-canonical composition for a desktop app: the brand leads the
 * `.Sidebar` column (≥768px) with the UserMenu in its bordered footer row,
 * and the `.TopBar` is `mobileOnly` (<768px) so it carries the brand + the
 * UserMenu beside the menu trigger the shell renders itself. `.Sidebar` and
 * `.Drawer` receive the SAME nav element — only the mounted breakpoint
 * instantiates it, so there are never two nav landmarks in the DOM. The
 * shell owns the breakpoint split, the drawer open state, the APG dialog
 * contract (focus trap, Escape/backdrop close, scroll lock) and nav
 * auto-close; the app owns none of it.
 */

import type { JSX } from 'react'
import { Link, NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/discover', key: 'discover', defaultLabel: 'Discover', icon: 'explore' },
  { to: '/favorites', key: 'favorites', defaultLabel: 'Favorites', icon: 'favorite' },
  { to: '/lists', key: 'lists', defaultLabel: 'Lists', icon: 'bookmarks' },
  { to: '/notifications', key: 'notifications', defaultLabel: 'Activity', icon: 'notifications' },
] as const

export function RestaurantReviewLayout(): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`restaurantReviewLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  const navAriaLabel = t(
    'restaurantReviewLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'xs' }),
      cm.sp('px', 3),
      cm.sp('py', 2),
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      'rounded-md transition-colors',
      isActive
        ? cm.cn('bg-primary-container', cm.textPrimary)
        : cm.cn(cm.textMuted, 'hover:bg-surface-container hover:text-on-surface'),
    )

  // The SAME nav element for `.Sidebar` and `.Drawer` — only the mounted
  // breakpoint instantiates it. NavLink carries `aria-current="page"` on the
  // active destination.
  const nav = (
    <>
      {navItems.map((item) => (
        <NavLink key={item.key} to={item.to} className={linkClass}>
          {item.icon ? (
            <span className="material-symbols-outlined" aria-hidden="true">
              {item.icon}
            </span>
          ) : null}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </>
  )

  const brand = (
    <Link to="/discover" className="shrink-0">
      <BrandWordmark as="span" size="md" />
    </Link>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md" className="bg-background text-on-surface antialiased">
      {/* Mobile top bar (<768px): the shell renders the menu trigger next to
          the brand; the desktop shell carries no top bar. */}
      <ResponsiveAppShell.TopBar mobileOnly brand={brand} actions={<UserMenu />} />
      {/* Desktop sidebar (≥768px): brand leads the nav column; the UserMenu
          sits in the bordered footer row, outside the nav landmark. */}
      <ResponsiveAppShell.Sidebar navLabel={navAriaLabel} footer={<UserMenu />}>
        <div className={cm.cn(cm.sp('px', 3), cm.sp('py', 3))}>{brand}</div>
        {nav}
      </ResponsiveAppShell.Sidebar>
      {/* Mobile drawer (<768px): the same nav element behind the full dialog
          contract; it auto-closes on navigation and on desktop-crossing. */}
      <ResponsiveAppShell.Drawer navLabel={navAriaLabel} header={brand}>
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
