import type { JSX } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'pets' },
  { to: '/pets', key: 'pets', defaultLabel: 'Pets', icon: 'cruelty_free' },
  { to: '/sitters', key: 'sitters', defaultLabel: 'Sitters', icon: 'volunteer_activism' },
  { to: '/bookings', key: 'bookings', defaultLabel: 'Bookings', icon: 'event_available' },
  {
    to: '/vet-records',
    key: 'vetRecords',
    defaultLabel: 'Vet Records',
    icon: 'medical_information',
  },
  { to: '/medications', key: 'medications', defaultLabel: 'Medications', icon: 'medication' },
  { to: '/messages', key: 'messages', defaultLabel: 'Messages', icon: 'chat' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Signed-in shell, built on the shared `ResponsiveAppShell` (fleet-canonical
 * composition): the TopBar is mobile-only (the desktop brand row leads the
 * sidebar), the Sidebar mounts only ≥768px and the mobile Drawer — the SAME
 * nav element, full APG dialog contract — only below it. The shell owns the
 * breakpoint split, the menu trigger, the drawer open state,
 * Escape/backdrop handling, and auto-close-on-navigation; this component
 * only supplies nav + brand.
 *
 * `UserMenu` keeps its pre-migration slots: the Sidebar footer (where
 * `SidebarLayout` rendered it) on desktop and the Drawer footer on mobile —
 * not the TopBar actions slot, which is squeezed at 390px.
 */
export function NuzzleLayout(): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const navLabel = t('nuzzleLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  const brand = (
    <Link to="/dashboard">
      <BrandWordmark as="span" />
    </Link>
  )

  // ONE nav element for both surfaces — the Sidebar and the Drawer receive
  // the same array, and only the mounted breakpoint instantiates it, so the
  // nav `data-mol-id`s are never duplicated in the DOM. The drawer closes
  // itself on navigation (shell-owned), so links carry no onClick close.
  const nav = NAV_KEYS.map((item) => {
    const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`)
    return (
      <Link
        key={item.key}
        to={item.to}
        data-mol-id={`nav-${item.key}`}
        aria-current={isActive ? 'page' : undefined}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'min-h-[44px] rounded-md transition-colors',
          isActive
            ? // Container pair, not a primary tint under brand-colored text
              // (contrast — see the shared SidebarLayout's rationale).
              'bg-primary-container text-on-primary-container'
            : cm.cn('text-on-surface-variant', 'hover:bg-surface-container hover:text-on-surface'),
        )}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          {item.icon}
        </span>
        <span>{t(`nuzzleLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}</span>
      </Link>
    )
  })

  return (
    <ResponsiveAppShell sidebarWidth="lg" className="antialiased">
      {/*
        Mobile top bar (<768px): brand + the shell-rendered menu trigger.
        The sidebar is unmounted below the breakpoint, so the brand needs
        this home at phone widths.
      */}
      <ResponsiveAppShell.TopBar mobileOnly brand={brand} />

      {/*
        Desktop sidebar (≥768px): brand row, nav, and the UserMenu footer
        (the slot SidebarLayout used).
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        className={cm.sp('p', 4)}
        footer={<UserMenu />}
      >
        <div className={cm.cn(cm.sp('mb', 6))}>{brand}</div>
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>{nav}</ul>
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): full dialog panel over the same nav, with the
        brand in the header row and the UserMenu in the footer.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        header={brand}
        // The shared panel ships no height token (its content would size it);
        // `h-full` restores the documented full-height left-panel geometry.
        className="h-full"
        footer={<UserMenu />}
      >
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>{nav}</ul>
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
