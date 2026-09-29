import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'monitor_heart' },
  { to: '/records', key: 'records', defaultLabel: 'Records', icon: 'folder_shared' },
  { to: '/medications', key: 'medications', defaultLabel: 'Medications', icon: 'medication' },
  { to: '/labs', key: 'labs', defaultLabel: 'Lab Results', icon: 'science' },
  { to: '/immunizations', key: 'immunizations', defaultLabel: 'Immunizations', icon: 'vaccines' },
  { to: '/visits', key: 'visits', defaultLabel: 'Visits', icon: 'event_available' },
  { to: '/documents', key: 'documents', defaultLabel: 'Documents', icon: 'description' },
  { to: '/sharing', key: 'sharing', defaultLabel: 'Sharing', icon: 'shield_person' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'account_circle' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

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

  const navLabel = t('meridianLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same array, and only the mounted breakpoint instantiates it. The
  // drawer closes itself on navigation (shell-owned), so links carry no
  // onClick close.
  const navItems = NAV_KEYS.map((item) => {
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
          cm.sp('py', 3),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          cm.roundedFull,
          isActive
            ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
            : cm.cn(cm.textMuted, cm.link),
        )}
        style={{ minHeight: '44px' }}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          {item.icon}
        </span>
        <span>{t(`meridianLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}</span>
      </Link>
    )
  })

  return (
    <ResponsiveAppShell sidebarWidth="md" dataMolId="meridian-shell">
      {/*
        Mobile top bar (< md). The desktop sidebar is hidden below md, so the
        brand + user menu need a home that does not eat the viewport; the
        shell renders the menu trigger itself.
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <Link
            to="/dashboard"
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'truncate')}
          >
            <BrandWordmark as="span" size="sm" />
          </Link>
        }
        actions={<UserMenu />}
      />

      {/*
        Desktop sidebar (>= md). The brand row leads the nav column — the
        shared Sidebar has no header slot, so it rides inside `children`.
      */}
      <ResponsiveAppShell.Sidebar navLabel={navLabel} className={cm.sp('p', 4)}>
        <Link
          to="/dashboard"
          className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 6), 'block')}
        >
          <BrandWordmark as="span" />
        </Link>
        {navItems}
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
