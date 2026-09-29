import { Link, Outlet, useLocation, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

/**
 * Verso's authenticated shell — the shared `ResponsiveAppShell` family.
 *
 * Desktop (≥768px): a 240px sidebar — serif wordmark, the six primary nav
 * items, and the user menu in the footer — beside the routed page. Mobile
 * (<768px): the shell mounts a sticky top bar (menu trigger + wordmark +
 * user menu) whose trigger opens the nav drawer; `.Sidebar` and `.Drawer`
 * receive the SAME nav element, so only the mounted breakpoint instantiates
 * it and nav `data-mol-id`s never duplicate in the DOM. The shell owns the
 * drawer open state, the Escape/backdrop/focus-trap contract and
 * auto-close-on-navigation. Holds Verso's quiet, structured nav — Home,
 * Notes, Search, Graph, Tags, Settings — over the brand indigo so the
 * inside of the app reads as the same sober editorial surface the marketing
 * hero promises.
 */
export function VersoLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const navItems = [
    {
      to: '/home',
      key: 'home',
      icon: 'home',
      label: t('versoLayout.nav.home', {}, { defaultValue: 'Home' }),
    },
    {
      to: '/notes',
      key: 'notes',
      icon: 'description',
      label: t('form.notes', {}, { defaultValue: 'Notes' }),
    },
    {
      to: '/search',
      key: 'search',
      icon: 'search',
      label: t('common.search', {}, { defaultValue: 'Search' }),
    },
    {
      to: '/graph',
      key: 'graph',
      icon: 'hub',
      label: t('versoLayout.nav.graph', {}, { defaultValue: 'Graph' }),
    },
    { to: '/tags', key: 'tags', icon: 'sell', label: t('form.tags', {}, { defaultValue: 'Tags' }) },
    {
      to: '/settings',
      key: 'settings',
      icon: 'settings',
      label: t('nav.settings', {}, { defaultValue: 'Settings' }),
    },
  ]

  // Single-active-item resolution: the nav item whose `to` is the longest
  // prefix-match of the current pathname (so /notes/:id marks Notes).
  const activeKey = navItems.reduce<string | null>((best, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return best
    if (best === null) return item.key
    const bestItem = navItems.find((i) => i.key === best)
    return bestItem && item.to.length > bestItem.to.length ? item.key : best
  }, null)

  const navAriaLabel = t('versoLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  // Wordmark — leads the desktop sidebar's nav children and the drawer's
  // header slot (the shared Sidebar has no header slot).
  const brandBlock = (
    <Link to="/home" className={cm.cn(cm.sp('mb', 6), cm.displayBlock, 'rounded', FOCUS_RING)}>
      <BrandWordmark as="span" />
    </Link>
  )

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same element and only the mounted breakpoint instantiates it; the
  // shell closes the drawer on navigation, so links carry no onClick close.
  const nav = (
    <>
      {navItems.map((item) => {
        const isActive = item.key === activeKey
        return (
          <Link
            key={item.to}
            to={item.to}
            data-mol-id={`nav-${item.key}`}
            aria-current={isActive ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              'min-h-[44px] py-2 rounded-full text-sm font-medium',
              isActive
                ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                : cm.cn(cm.textMuted, cm.link),
              FOCUS_RING,
            )}
          >
            <span
              className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
              aria-hidden="true"
            >
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

  // Drawer footer sign-out (the drawer's exit path; the user menu in the top
  // bar/sidebar footer is the account panel).
  const signOutButton = (
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
      <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')} aria-hidden="true">
        logout
      </span>
      {t('settings.account.logout', {}, { defaultValue: 'Log out' })}
    </button>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/* Mobile top bar (<768px) — the shell renders the menu trigger itself. */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <Link to="/home" className={cm.cn('truncate rounded', FOCUS_RING)}>
            <BrandWordmark as="span" size="sm" />
          </Link>
        }
        actions={<UserMenu />}
      />

      {/* Desktop sidebar (≥768px) — wordmark rides inside the nav children
          (the shared Sidebar has no header slot). */}
      <ResponsiveAppShell.Sidebar
        navLabel={navAriaLabel}
        className={cm.sp('p', 4)}
        footer={<UserMenu />}
      >
        {brandBlock}
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/* Mobile drawer (<768px) — same nav element, full dialog contract
          (focus trap, Escape/backdrop close, body-scroll lock). */}
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        className={cm.sp('p', 4)}
        header={brandBlock}
        footer={signOutButton}
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default VersoLayout
