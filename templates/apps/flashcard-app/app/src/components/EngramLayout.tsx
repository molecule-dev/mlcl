import { Link, Outlet, useLocation, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Today', icon: 'auto_stories' },
  { to: '/decks', key: 'decks', defaultLabel: 'Decks', icon: 'style' },
  { to: '/stats', key: 'stats', defaultLabel: 'Stats', icon: 'insights' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

/**
 * Signed-in shell, built on the shared `ResponsiveAppShell`.
 *
 * The shell owns the breakpoint split: the Sidebar mounts only ≥768px, the
 * mobile Drawer (same nav element, full APG dialog contract) only below it,
 * and the TopBar renders the menu trigger itself — the app's hamburger,
 * drawer state and escape/backdrop handlers are deleted with the former
 * template-local `MobileNavShell` + `useIsMobile`.
 *
 * The account affordances keep their pre-migration slots: `UserMenu` sits in
 * the Sidebar footer (as `SidebarLayout` rendered it) and the Drawer footer
 * carries a plain sign-out button. The TopBar is `mobileOnly` — brand +
 * menu trigger below 768px only, since the shell suppresses any bar rendered
 * beside the Sidebar on desktop. `UserMenu` must NOT go in the TopBar
 * actions slot — `SidebarUserCard`'s name+email trigger is wider than a 390px
 * top bar, and its `shrink-0` actions group then overlaps the menu trigger,
 * swallowing taps on phones (the exact squeeze `MobileNavShell` documented).
 */
export function EngramLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const brand = (
    <Link
      to="/dashboard"
      className={cm.cn('flex items-center truncate rounded', FOCUS_RING)}
      aria-label={APP_NAME}
    >
      <BrandWordmark as="span" />
    </Link>
  )

  // The SAME nav element for both surfaces — only the mounted breakpoint
  // instantiates it, so nav `data-mol-id`s are never duplicated in the DOM.
  const nav = (
    <>
      {NAV_KEYS.map((item) => {
        const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`)
        return (
          <Link
            key={item.to}
            to={item.to}
            data-mol-id={`nav-${item.key}`}
            aria-current={isActive ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 3),
              'min-h-[44px] gap-3 py-2.5 rounded-lg text-sm font-medium',
              isActive
                ? 'bg-primary-container/40 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container',
              FOCUS_RING,
            )}
          >
            <span
              className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            {t(`engramLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
          </Link>
        )
      })}
    </>
  )

  const handleSignOut = async (): Promise<void> => {
    await logout()
    navigate('/login')
  }

  return (
    <ResponsiveAppShell sidebarWidth="md">
      <ResponsiveAppShell.TopBar mobileOnly brand={brand} />
      <ResponsiveAppShell.Sidebar footer={<UserMenu />}>{nav}</ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer
        header={brand}
        footer={<DrawerSignOut onSignOut={handleSignOut} />}
      >
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

/** Drawer-footer sign out — the mobile path the old MobileNavShell carried. */
function DrawerSignOut({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <button
      type="button"
      data-mol-id="mobile-nav-signout"
      onClick={() => void onSignOut()}
      className={cm.cn(
        cm.flex({ align: 'center' }),
        cm.sp('px', 3),
        cm.w('full'),
        'min-h-[44px] gap-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-left text-on-surface-variant hover:text-error hover:bg-error-container/20',
        FOCUS_RING,
      )}
    >
      <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')} aria-hidden="true">
        logout
      </span>
      {t('common.logout', {}, { defaultValue: 'Logout' })}
    </button>
  )
}
