import { Link, NavLink, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/shop', key: 'shop', defaultLabel: 'Shop', icon: 'storefront' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/lists', key: 'lists', defaultLabel: 'Lists', icon: 'list_alt' },
  { to: '/orders', key: 'orders', defaultLabel: 'Orders', icon: 'receipt_long' },
  { to: '/cart', key: 'cart', defaultLabel: 'Cart', icon: 'shopping_cart' },
] as const

function useNavItems(): Array<{ to: string; key: string; icon: string; label: string }> {
  const { t } = useTranslation()
  return NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`groceryDeliveryLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
}

/**
 * Bushel shell — the shared `ResponsiveAppShell` composed to this app's
 * shape: a mobile-only top bar (brand + user menu; the shell renders the
 * drawer menu trigger itself), a ≥md sidebar with the brand row, a <md
 * dialog drawer over the same nav, and one `<Outlet />` so pages mount
 * exactly once at any width. The shell owns the breakpoint, the root
 * direction, the drawer open state, focus/Escape/backdrop handling, and the
 * auto-close-on-navigation; this component only supplies nav + brand.
 */
export function GroceryDeliveryLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navItems = useNavItems()
  const navLabel = t(
    'groceryDeliveryLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same element, and only the mounted breakpoint instantiates it.
  // NavLink supplies aria-current="page" plus the active styles; the drawer
  // closes itself on navigation (shell-owned), so links carry no onClick
  // close.
  const nav = navItems.map((item) => (
    <NavLink
      key={item.key}
      to={item.to}
      className={({ isActive }) =>
        cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'min-h-[44px] rounded-full transition-colors',
          isActive
            ? cm.cn('bg-primary-container text-on-primary-container')
            : cm.cn(cm.textMuted, 'hover:bg-surface-container hover:text-on-surface'),
        )
      }
    >
      <span className="material-symbols-outlined text-base" aria-hidden="true">
        {item.icon}
      </span>
      <span>{item.label}</span>
    </NavLink>
  ))

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/*
        Mobile top bar (< md): brand + user menu, per the old mobile shell's
        sticky header. The drawer menu trigger is the shell's.
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <Link to="/shop" className={cm.cn('shrink-0')}>
            <BrandWordmark as="span" />
          </Link>
        }
        actions={<UserMenu />}
      />

      {/*
        Desktop sidebar (>= md): the brand row leads the nav column — the
        shared Sidebar has no header slot, so it rides inside children. The
        user menu rides in the footer slot (the old top bar carried it; with
        a mobileOnly TopBar the sidebar is its only desktop home).
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        className={cm.sp('p', 4)}
        // inline-flex keeps the menu button hugging its content instead of
        // stretching across the footer row (the footer is a flex-col).
        footer={
          <span className="inline-flex">
            <UserMenu />
          </span>
        }
      >
        <Link to="/shop" className={cm.cn('block')}>
          <BrandWordmark as="span" />
        </Link>
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (< md): a full dialog panel (focus trap, Escape,
        backdrop click, body-scroll lock) over the same nav.
      */}
      <ResponsiveAppShell.Drawer navLabel={navLabel} className="h-full">
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content className="w-full overflow-y-auto">
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
