import { Link, Outlet, useLocation, useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

interface NavItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
  filledIcon?: boolean
}

const PRIMARY_ITEMS: NavItem[] = [
  {
    to: '/home',
    icon: 'self_improvement',
    labelKey: 'stillpoint.nav.home',
    defaultLabel: 'Today',
    filledIcon: true,
  },
  { to: '/library', icon: 'spa', labelKey: 'stillpoint.nav.library', defaultLabel: 'Library' },
  { to: '/courses', icon: 'school', labelKey: 'stillpoint.nav.courses', defaultLabel: 'Courses' },
  {
    to: '/journal',
    icon: 'edit_note',
    labelKey: 'stillpoint.nav.journal',
    defaultLabel: 'Journal',
  },
  { to: '/stats', icon: 'insights', labelKey: 'stillpoint.nav.stats', defaultLabel: 'Stats' },
  { to: '/search', icon: 'search', labelKey: 'stillpoint.nav.search', defaultLabel: 'Search' },
]

const SECONDARY_ITEMS: NavItem[] = [
  {
    to: '/notifications',
    icon: 'notifications',
    labelKey: 'stillpoint.nav.notifications',
    defaultLabel: 'Notifications',
  },
  {
    to: '/profile',
    icon: 'account_circle',
    labelKey: 'stillpoint.nav.profile',
    defaultLabel: 'Profile',
  },
  {
    to: '/settings',
    icon: 'settings',
    labelKey: 'stillpoint.nav.settings',
    defaultLabel: 'Settings',
  },
]

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

/**
 * Layout wrapper for Stillpoint's signed-in routes — the shared
 * `ResponsiveAppShell` composed to Stillpoint's shape: a mobile-only top bar
 * (brand wordmark; the desktop brand row lives in the sidebar), a ≥md brand
 * sidebar, a <md dialog drawer, and one `<Outlet />` so pages mount exactly
 * once at any width. The shell owns the breakpoint, the drawer open state,
 * the menu trigger, focus/Escape/backdrop handling, and the
 * auto-close-on-navigation; this component only supplies nav + brand.
 *
 * Pages render their own StillpointTopBar inside the canvas so each screen
 * controls its own title/actions.
 */
export function StillpointAppShell() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth<UserProfile>()

  const isActive = (to: string): boolean => pathname === to || pathname.startsWith(`${to}/`)

  const navLabel = t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })

  const handleSignOut = async (): Promise<void> => {
    await logout()
    navigate('/login')
  }

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.to)
    return (
      <li key={item.to}>
        <Link
          to={item.to}
          data-mol-id={`nav-${item.to.replace(/\//g, '')}`}
          aria-current={active ? 'page' : undefined}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'min-h-[44px] rounded-xl text-sm font-medium transition-colors duration-200 active:scale-95',
            active
              ? 'bg-primary text-white font-semibold shadow-sm'
              : 'text-on-surface hover:bg-primary-container/60',
            FOCUS_RING,
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-2xl leading-none')}
            style={item.filledIcon || active ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {item.icon}
          </span>
          <span>{t(item.labelKey, {}, { defaultValue: item.defaultLabel })}</span>
        </Link>
      </li>
    )
  }

  // Brand block — leads the desktop sidebar's nav column and the drawer's
  // header row (the shell's brand slot in the mobile-only top bar gets the
  // wordmark alone).
  const brand = (
    <Link to="/home" className={cm.cn(cm.sp('px', 2), 'block')}>
      <span className={cm.cn(cm.fontWeight('bold'), 'text-2xl text-primary tracking-tight block')}>
        {APP_NAME}
      </span>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          'block text-primary font-medium tracking-wide uppercase mt-1',
        )}
      >
        {t('stillpoint.nav.tagline', {}, { defaultValue: APP_TAGLINE })}
      </span>
    </Link>
  )

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same fragment, and only the mounted breakpoint instantiates it. The
  // drawer closes itself on navigation (shell-owned), so links carry no
  // onClick close.
  const nav = (
    <>
      <ul
        aria-label={navLabel}
        className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'list-none')}
      >
        {PRIMARY_ITEMS.map(renderNavItem)}
      </ul>
      <ul
        aria-label={t('nav.secondaryNavigation', {}, { defaultValue: 'Account navigation' })}
        className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'list-none mt-auto')}
      >
        {SECONDARY_ITEMS.map(renderNavItem)}
      </ul>
    </>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/*
        Mobile top bar (< md). Pages render their own StillpointTopBar (title
        + ThemeToggle + UserMenu) inside the canvas, so the shell bar carries
        the brand wordmark; the shell renders the menu trigger itself.
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={
          <Link
            to="/home"
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'tracking-tight text-primary truncate rounded',
              FOCUS_RING,
            )}
          >
            {APP_NAME}
          </Link>
        }
      />

      {/*
        Desktop sidebar (>= md): soft lavender wash, wordmark + tagline, the
        primary nav and — pushed to the bottom — the account nav.
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        className={cm.cn('bg-surface-secondary border-primary-container', cm.sp('p', 4))}
      >
        <div className={cm.cn(cm.sp('px', 2), cm.sp('mb', 6))}>{brand}</div>
        {nav}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (< md): a full dialog panel (focus trap, Escape,
        backdrop click, body-scroll lock) over the same nav, brand header and
        sign-out footer.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        header={brand}
        // The shared panel ships no height token (its content would size it);
        // `h-full` restores the documented full-height left-panel geometry.
        className={cm.cn('h-full bg-surface-secondary shadow-xl', cm.sp('p', 4))}
        footer={
          <button
            type="button"
            data-mol-id="mobile-nav-signout"
            onClick={() => void handleSignOut()}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.w('full'),
              'min-h-[44px] py-2.5 rounded-lg text-sm font-medium text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors text-left',
              FOCUS_RING,
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-2xl leading-none')}
            >
              logout
            </span>
            {t('common.logout', {}, { defaultValue: 'Log out' })}
          </button>
        }
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.sp('p', 4),
          'md:p-8 tabular-nums',
        )}
      >
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
