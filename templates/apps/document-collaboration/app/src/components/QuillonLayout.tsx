import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Manuscripts', icon: 'description' },
  { to: '/shared', key: 'shared', defaultLabel: 'Shared with me', icon: 'group' },
  { to: '/templates', key: 'templates', defaultLabel: 'Templates', icon: 'article' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/trash', key: 'trash', defaultLabel: 'Trash', icon: 'delete' },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

/**
 * App shell — the shared `ResponsiveAppShell` composed to this app's shape:
 * a mobile-only top bar (the desktop brand row lives in the sidebar), a ≥md
 * sidebar, a <md dialog drawer, and one `<Outlet />` so pages mount exactly
 * once at any width. The shell owns the breakpoint, the drawer open state,
 * the menu trigger, focus/Escape/backdrop handling, and the auto-close on
 * navigation; this component only supplies nav + brand.
 */
export function QuillonLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  // Single-active-item resolution: the nav item whose `to` is the longest
  // prefix of the current pathname (mirrors the shared SidebarLayout).
  const activeKey = NAV_KEYS.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = NAV_KEYS.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  const navLabel = t('quillonLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  const navLinkClass = (isActive: boolean): string =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 3),
      cm.sp('py', 2),
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      cm.roundedFull,
      isActive
        ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
        : cm.cn(cm.textMuted, cm.link),
    )

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
        className={navLinkClass(isActive)}
      >
        {item.icon ? (
          <span className="material-symbols-outlined" aria-hidden="true">
            {item.icon}
          </span>
        ) : null}
        <span>{t(`quillonLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}</span>
      </Link>
    )
  })

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/*
        Mobile top bar (< md): the brand + the shell's own menu trigger. The
        desktop sidebar is unmounted below md, so the brand needs this home.
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <Link
            to="/dashboard"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'tracking-tight')}
          >
            {APP_NAME}
          </Link>
        }
      />

      {/*
        Desktop sidebar (>= md). The brand row leads the nav column — the
        shared Sidebar has no header slot, so it rides inside `children`; the
        user menu sits in the bordered footer row.
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        className={cm.sp('p', 4)}
        footer={<UserMenu />}
      >
        <Link
          to="/dashboard"
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 6),
            cm.displayBlock,
          )}
        >
          {APP_NAME}
        </Link>
        {navItems}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (< md): the same nav in a full APG dialog panel
        (focus trap, Escape, backdrop click, body-scroll lock), with the
        user menu in the footer.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        // The shared panel ships no height token (its content would size it);
        // `h-full` restores the documented full-height left-panel geometry.
        className="h-full"
        footer={<UserMenu />}
      >
        {navItems}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
