import { Link, Outlet, useLocation, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/projects', key: 'projects', defaultLabel: 'Projects', icon: 'folder_copy' },
  { to: '/glossary', key: 'glossary', defaultLabel: 'Glossary', icon: 'menu_book' },
  { to: '/memory', key: 'memory', defaultLabel: 'Translation memory', icon: 'storage' },
  { to: '/review', key: 'review', defaultLabel: 'Review queue', icon: 'rule' },
  { to: '/team', key: 'team', defaultLabel: 'Team', icon: 'group' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/billing', key: 'billing', defaultLabel: 'Billing', icon: 'credit_card' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

/**
 * Rendition app shell — the shared `ResponsiveAppShell` family.
 *
 * `.TopBar` carries the brand + theme toggle and renders the mobile menu
 * trigger itself; `.Sidebar` (≥768px) and `.Drawer` (<768px, full APG dialog
 * contract) receive the SAME nav element, so only the mounted breakpoint
 * instantiates it and nav `data-mol-id`s never duplicate in the DOM. The shell
 * owns the drawer open state, Escape/backdrop handling and nav auto-close.
 */
export function RenditionLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const navItems = NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`renditionLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
  const navAriaLabel = t(
    'renditionLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  // Single-active-item resolution: the nav item whose `to` is the longest
  // prefix-match of the current pathname (so /projects/:id marks Projects,
  // never also Dashboard).
  const activeKey = navItems.reduce<string | null>((best, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return best
    if (best === null) return item.key
    const bestItem = navItems.find((i) => i.key === best)
    return bestItem && item.to.length > bestItem.to.length ? item.key : best
  }, null)

  const nav = (
    <>
      {navItems.map((item) => {
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
            <span>{item.label}</span>
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
      <ResponsiveAppShell.TopBar
        brand={
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('extrabold'),
              'tracking-tight text-on-background truncate font-headline rounded',
              FOCUS_RING,
            )}
          >
            {APP_NAME}
          </Link>
        }
        actions={<ThemeToggle />}
      />
      <ResponsiveAppShell.Sidebar navLabel={navAriaLabel} footer={<UserMenu />}>
        {nav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        header={
          <span
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('extrabold'),
              'text-on-background font-headline',
            )}
          >
            {APP_NAME}
          </span>
        }
        footer={
          <>
            {/* The sidebar UserMenu card fits the drawer; it never fits a 390px
                top bar (long emails force page overflow). */}
            <UserMenu />
            <button
              type="button"
              data-mol-id="mobile-nav-signout"
              onClick={() => void handleSignOut()}
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.sp('px', 3),
                cm.w('full'),
                'min-h-[44px] gap-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-left text-on-surface-variant hover:text-error hover:bg-error-container/20',
                FOCUS_RING,
              )}
            >
              <span
                className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
                aria-hidden="true"
              >
                logout
              </span>
              {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
            </button>
          </>
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
