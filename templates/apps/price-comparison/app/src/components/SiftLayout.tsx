import type { ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/categories', key: 'categories', defaultLabel: 'Categories', icon: 'category' },
  { to: '/deals', key: 'deals', defaultLabel: 'Deals', icon: 'local_fire_department' },
  { to: '/watchlist', key: 'watchlist', defaultLabel: 'Watchlist', icon: 'visibility' },
  { to: '/alerts', key: 'alerts', defaultLabel: 'Alerts', icon: 'notifications' },
  { to: '/notifications', key: 'notifications', defaultLabel: 'Activity', icon: 'inbox' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'account_circle' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Signed-in shell for Bargain — the shared `ResponsiveAppShell` composed to
 * this app's shape: a mobile-only top bar (<768px; the desktop brand row
 * lives in the sidebar), a ≥md sidebar, a <md dialog drawer, and one
 * `<Outlet />` so pages mount exactly once at any width. The shell owns the
 * breakpoint, the drawer open state, the menu trigger (44px tap target),
 * focus/Escape/backdrop handling, and the auto-close-on-navigation; this
 * component only supplies nav + brand.
 */
export function SiftLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname (so /settings/billing keeps
  // Settings lit).
  const activeKey = NAV_KEYS.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = NAV_KEYS.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  const navAriaLabel = t('siftLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same array, and only the mounted breakpoint instantiates it. The
  // drawer closes itself on navigation (shell-owned), so links carry no
  // onClick close.
  const navItems = NAV_KEYS.map((item) => {
    const isActive = item.key === activeKey
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
          'min-h-[44px] gap-3 rounded-lg transition-colors',
          isActive
            ? 'bg-primary-container/40 text-primary'
            : 'text-on-surface-variant hover:bg-surface-container',
        )}
      >
        <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')} aria-hidden="true">
          {item.icon}
        </span>
        <span>{t(`siftLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}</span>
      </Link>
    )
  })

  const brandLink = (size: 'lg' | 'xl'): ReactNode => (
    <BrandWordmark as="span" size={size === 'xl' ? 'md' : 'sm'} />
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/*
        Mobile top bar (<768px): wordmark + compact user menu; the shell
        renders the menu trigger itself. Does not mount on desktop, where the
        sidebar carries the brand.
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={brandLink('lg')}
        actions={<UserMenu compact />}
      />

      {/*
        Desktop sidebar (≥768px): the brand row leads the nav column — the
        shared Sidebar has no header slot, so it rides inside `children`; the
        user menu sits in the bordered footer row.
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navAriaLabel}
        className={cm.sp('p', 4)}
        footer={<UserMenu />}
      >
        <div className={cm.cn(cm.sp('mb', 6))}>{brandLink('xl')}</div>
        {navItems}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): a full dialog panel (focus trap, Escape,
        backdrop click, body-scroll lock) over the same nav, with the brand
        next to the shell's close button and the user menu in the footer.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        // The shared panel ships no height token (its content would size it);
        // `h-full` restores the documented full-height left-panel geometry.
        className="h-full"
        header={<BrandWordmark as="span" size="md" />}
        footer={<UserMenu />}
      >
        {navItems}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content className="w-full overflow-y-auto">
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
