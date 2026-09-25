import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/home', key: 'home', defaultLabel: 'Home', icon: 'home' },
  { to: '/spaces', key: 'spaces', defaultLabel: 'Spaces', icon: 'folder_special' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/drafts', key: 'drafts', defaultLabel: 'Drafts', icon: 'edit_note' },
  { to: '/bookmarks', key: 'bookmarks', defaultLabel: 'Bookmarks', icon: 'bookmark' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
  { to: '/pricing', key: 'pricing', defaultLabel: 'Plans', icon: 'workspace_premium' },
] as const

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

/**
 * Signed-in shell for Cairn — the shared `ResponsiveAppShell`. The desktop
 * sidebar (≥768px) carries the brand, the primary nav and the user/theme
 * row; below 768px the shell swaps it for a mobile-only top bar (menu
 * trigger + wordmark + theme/user) and a dialog drawer. Both breakpoints
 * render the SAME nav element — only the mounted one instantiates, so nav
 * `data-mol-id`s stay unique in the DOM. The shell owns the drawer's open
 * state, Escape/backdrop/focus handling and auto-close-on-navigate.
 */
export function CairnLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const navAriaLabel = t('cairnLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  const navLinks = NAV_KEYS.map((item) => {
    const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`)
    return (
      <Link
        key={item.to}
        to={item.to}
        data-mol-id={`nav-${item.key}`}
        aria-current={isActive ? 'page' : undefined}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          cm.roundedFull,
          isActive
            ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
            : cm.cn(cm.textMuted, cm.link),
          FOCUS_RING,
        )}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          {item.icon}
        </span>
        <span>{t(`cairnLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}</span>
      </Link>
    )
  })

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/* Mobile only — on desktop the sidebar carries the brand + user row. */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <Link
            to="/home"
            data-mol-id="mobile-brand"
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('extrabold'),
              'tracking-tight text-on-background truncate',
              FOCUS_RING,
            )}
          >
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
      <ResponsiveAppShell.Sidebar
        navLabel={navAriaLabel}
        className={cm.sp('p', 4)}
        footer={
          <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
            <UserMenu />
            <ThemeToggle />
          </div>
        }
      >
        <Link
          to="/home"
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 6),
            'text-on-background',
            FOCUS_RING,
          )}
        >
          {APP_NAME}
        </Link>
        {navLinks}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        className={cm.sp('p', 4)}
        header={
          <span
            className={cm.cn(cm.textSize('2xl'), cm.fontWeight('extrabold'), 'text-on-background')}
          >
            {APP_NAME}
          </span>
        }
      >
        {navLinks}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
