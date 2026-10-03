import { Link, Outlet, useLocation, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
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
 * `.TopBar` is `mobileOnly` (brand + theme toggle + the shell's menu trigger,
 * below 768px only — the Sidebar owns desktop, so the shell suppresses any
 * non-mobile bar beside it); `.Sidebar` (≥768px) carries the brand above the
 * nav and the theme toggle + UserMenu in its footer; `.Drawer` (<768px, full
 * APG dialog contract) receives the SAME nav element, so only the mounted
 * breakpoint instantiates it and nav `data-mol-id`s never duplicate in the
 * DOM. The shell owns the drawer open state, Escape/backdrop handling and
 * nav auto-close.
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

  // Brand block — mounted by the mobile TopBar AND the desktop Sidebar (never
  // simultaneously: the Sidebar is unmounted below 768px and the mobileOnly
  // TopBar returns null above it).
  const brand = (
    <Link
      to="/dashboard"
      className={cm.cn(
        cm.textSize('lg'),
        cm.fontWeight('extrabold'),
        'tracking-tight text-on-background truncate font-headline rounded',
        FOCUS_RING,
      )}
    >
      <BrandWordmark as="span" size="sm" />
    </Link>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      <ResponsiveAppShell.TopBar mobileOnly brand={brand} actions={<ThemeToggle />} />
      {/* Sidebar bottom bar — theme toggle beside the UserMenu, styled to
          match the sidebar. Without the wrapper, the controls render as bare
          browser widgets bolted onto a styled sidebar. */}
      <ResponsiveAppShell.Sidebar
        navLabel={navAriaLabel}
        footer={
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              cm.w('full'),
              'text-on-surface-variant hover:text-on-surface transition-colors',
            )}
          >
            <ThemeToggle />
            <UserMenu />
          </div>
        }
      >
        <div className={cm.cn(cm.sp('px', 3), cm.sp('py', 2))}>{brand}</div>
        {nav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        header={<BrandWordmark as="span" />}
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
