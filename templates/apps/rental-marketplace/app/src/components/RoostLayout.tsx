/**
 * Roost app shell consumed by every authed route — Search / Wishlist /
 * Bookings / Messages / Notifications / Settings / Host (with /host
 * sub-routes nested underneath).
 *
 * The shared `ResponsiveAppShell` owns the responsive split this template
 * used to hand-roll: a mobile-only top bar (<768px — brand + user menu +
 * the shell-rendered 44px menu trigger), a ≥768px sidebar carrying the
 * brand row and the primary nav, and a <768px dialog drawer over the SAME
 * nav element (focus trap, Escape/backdrop close, scroll lock, auto-close
 * on navigation). Only the mounted breakpoint's nav instantiates, so the
 * landmarks never duplicate.
 */

import { Link, NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'travel_explore' },
  { to: '/bookings', key: 'bookings', defaultLabel: 'Bookings', icon: 'luggage' },
  { to: '/wishlist', key: 'wishlist', defaultLabel: 'Wishlist', icon: 'favorite' },
  { to: '/messages', key: 'messages', defaultLabel: 'Messages', icon: 'forum' },
  { to: '/host', key: 'host', defaultLabel: 'Host', icon: 'cottage' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
] as const

/**
 * The nav links, shared by the desktop Sidebar and the mobile Drawer — the
 * shell mounts only the breakpoint's copy. NavLink carries
 * `aria-current="page"` on the active route itself (prefix match, so
 * /host/listings keeps Host lit).
 */
function RoostNav() {
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
              // 44px row — the fleet's minimum tap target in the drawer.
              'min-h-[44px] whitespace-nowrap rounded-full transition-colors',
              isActive
                ? cm.cn('bg-primary-container', cm.textPrimary)
                : cm.cn(cm.textMuted, 'hover:bg-surface-container hover:text-on-surface'),
            )
          }
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            {item.icon}
          </span>
          <span>{t(`roostLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}</span>
        </NavLink>
      ))}
    </>
  )
}

export function RoostLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navLabel = t('roostLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })
  const nav = <RoostNav />

  return (
    <ResponsiveAppShell sidebarWidth="md" className="antialiased">
      {/*
        Mobile top bar (<768px): brand + user menu + the shell-rendered menu
        trigger. On desktop it does not mount — the sidebar carries the brand.
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <Link to="/" className={cm.cn('whitespace-nowrap')}>
            <BrandWordmark as="span" size="sm" />
          </Link>
        }
        actions={<UserMenu />}
      />

      {/*
        Desktop sidebar (>=768px): the brand row leads the nav column (the
        shared Sidebar has no header slot, so it rides inside `children`),
        and the user menu lives in the footer row below the nav.
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        className={cm.sp('p', 4)}
        footer={<UserMenu />}
      >
        <Link to="/" className={cm.cn('block whitespace-nowrap', cm.sp('px', 3), cm.sp('mb', 4))}>
          <BrandWordmark as="span" />
        </Link>
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): a full dialog panel over the same nav, with
        the brand in the header row next to the shell's close button.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        className="h-full"
        header={<BrandWordmark as="span" />}
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      {/* Bare <main> — page padding stays inside the pages. */}
      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
