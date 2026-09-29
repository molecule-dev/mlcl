import { Link, NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/restaurants', key: 'browse', defaultLabel: 'Browse', icon: 'storefront' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/orders', key: 'orders', defaultLabel: 'Orders', icon: 'receipt_long' },
  { to: '/favorites', key: 'favorites', defaultLabel: 'Favorites', icon: 'favorite' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
] as const

/**
 * The nav links, shared by the desktop Sidebar and the mobile Drawer — the
 * shell mounts only the breakpoint's copy, so the links are never duplicated
 * in the DOM. NavLink carries `aria-current="page"` on the active route
 * itself. Active styling keeps the template's chip pair; theme.css re-pairs
 * `bg-primary-container` + `text-primary` to the AA contrast token.
 */
function FoodDeliveryNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <>
      {NAV_KEYS.map((item) => (
        <NavLink
          key={item.key}
          to={item.to}
          className={({ isActive }) =>
            cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.sp('mx', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'whitespace-nowrap rounded-full transition-colors',
              isActive
                ? cm.cn('bg-primary-container', cm.textPrimary)
                : cm.cn(cm.textMuted, 'hover:bg-surface-container hover:text-on-surface'),
            )
          }
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            {item.icon}
          </span>
          <span>
            {t(`foodDeliveryLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
          </span>
        </NavLink>
      ))}
    </>
  )
}

/**
 * Authenticated shell for every signed-in page — the shared
 * `ResponsiveAppShell`. It owns the breakpoint split: the Sidebar mounts only
 * ≥768px, the mobile Drawer (same nav element, full dialog contract — focus
 * trap, Escape/backdrop close, scroll lock, auto-close on navigation) only
 * below it, and the TopBar renders the menu trigger itself. Page padding
 * stays inside the pages; `.Content` is a bare `<main>`.
 */
export function FoodDeliveryLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navLabel = t(
    'foodDeliveryLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )
  const nav = <FoodDeliveryNav />

  return (
    <ResponsiveAppShell sidebarWidth="md">
      <ResponsiveAppShell.TopBar
        brand={
          <Link to="/restaurants" className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {APP_NAME}
          </Link>
        }
        actions={
          <>
            <ThemeToggle />
            <UserMenu />
          </>
        }
      />
      <ResponsiveAppShell.Sidebar navLabel={navLabel}>{nav}</ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        header={
          <span className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>{APP_NAME}</span>
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
