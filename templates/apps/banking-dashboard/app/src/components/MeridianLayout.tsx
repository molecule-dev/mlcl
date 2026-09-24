import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/accounts', key: 'accounts', defaultLabel: 'Accounts', icon: 'account_balance_wallet' },
  { to: '/transfers', key: 'transfers', defaultLabel: 'Transfers', icon: 'swap_horiz' },
  { to: '/statements', key: 'statements', defaultLabel: 'Statements', icon: 'description' },
  { to: '/audit', key: 'audit', defaultLabel: 'Audit log', icon: 'shield' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * Append `#top` to a Link target when it matches the current pathname so
 * clicking a same-route link still produces an observable URL change.
 */
function safeTarget(to: string, pathname: string): string {
  const samePath = pathname === to || pathname + '/' === to
  return samePath ? `${to.replace(/\/$/, '')}#top` : to
}

/**
 * Meridian shell — the shared `ResponsiveAppShell` composed to this app's
 * shape: a mobile-only top bar (the desktop brand row lives in the sidebar),
 * a ≥md sidebar, a <md dialog drawer, and one `<Outlet />` so pages mount
 * exactly once at any width. The shell owns the breakpoint, the drawer open
 * state, the menu trigger, focus/Escape/backdrop handling, and the
 * auto-close-on-navigation; this component only supplies nav + brand.
 */
export function MeridianLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname.
  const activeKey = NAV_KEYS.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = NAV_KEYS.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  const navLabel = t('meridianLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same array, and only the mounted breakpoint instantiates it. The
  // drawer closes itself on navigation (shell-owned), so links carry no
  // onClick close.
  const navItems = NAV_KEYS.map((item) => {
    const isActive = item.key === activeKey
    const target = safeTarget(item.to, pathname)
    return (
      <Link
        key={item.key}
        to={target}
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
        <span>{t(`meridianLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}</span>
      </Link>
    )
  })

  return (
    // Root direction: the shell's flex-row base is overridden to the fleet's
    // `flex-col md:flex-row` stack via className (top bar above the content
    // column on mobile, sidebar beside it on desktop).
    <ResponsiveAppShell
      sidebarWidth="md"
      dataMolId="meridian-shell"
      className={cm.cn('flex-col md:flex-row')}
    >
      {/*
        Mobile top bar (< md). The desktop sidebar is hidden below md, so the
        brand + theme toggle need a home that does not eat the viewport; the
        shell renders the menu trigger itself.
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <Link
            to={safeTarget('/dashboard', pathname)}
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight')}
          >
            {APP_NAME}
          </Link>
        }
        actions={<ThemeToggle />}
      />

      {/*
        Desktop sidebar (>= md). The brand row leads the nav column — the
        shared Sidebar has no header slot, so it rides inside `children`.
      */}
      <ResponsiveAppShell.Sidebar navLabel={navLabel} className={cm.sp('p', 4)}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.sp('mb', 6),
          )}
        >
          <Link
            to={safeTarget('/dashboard', pathname)}
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'block')}
          >
            {APP_NAME}
          </Link>
          <ThemeToggle />
        </div>
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>{navItems}</ul>
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (< md): a full dialog panel (focus trap, Escape,
        backdrop click, body-scroll lock) over the same nav, with the user
        menu in the footer.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        // The shared panel ships no height token (its content would size it);
        // `h-full` restores the documented full-height left-panel geometry.
        className="h-full"
        footer={
          <span className={cm.cn('inline-flex [&_button]:min-h-[44px] [&_button]:min-w-[44px]')}>
            <UserMenu />
          </span>
        }
      >
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>{navItems}</ul>
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content className="w-full overflow-y-auto">
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
