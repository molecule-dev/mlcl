import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { CreatorMobileNav } from './CreatorMobileNav.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

interface NavItem {
  to: string
  key: string
  defaultLabel: string
  icon: string
}

const PRIMARY_NAV: ReadonlyArray<NavItem> = [
  { to: '/dashboard', key: 'dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/discover', key: 'discover', defaultLabel: 'Discover', icon: 'explore' },
  { to: '/campaign/new', key: 'newCampaign', defaultLabel: 'New campaign', icon: 'add_circle' },
  { to: '/backers', key: 'backers', defaultLabel: 'Backers', icon: 'group' },
  { to: '/my-pledges', key: 'myPledges', defaultLabel: 'My pledges', icon: 'favorite' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
]

/**
 * Dark navy creator-studio sidebar (260px) + main content shell.
 *
 * Per DESIGN.md "Dashboard Sidebar Navigation" — navy background, inverse
 * text, 4px primary left border on active item. Mobile collapses to a
 * top bar with user menu / theme toggle. Used by every signed-in route.
 *
 * Translated from banking-dashboard/MeridianLayout pattern, but rendered
 * inline (rather than via @molecule/app-sidebar-layout-react) so the navy
 * branding can be exact and the icons stay Material Symbols.
 */
export function CreatorSidebarLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()
  const userEmail = (user as { email?: string } | null)?.email ?? ''
  const userId = (user as { id?: string } | null)?.id
  const userInitial = userEmail.charAt(0).toUpperCase() || 'C'
  // Top-bar section label — the matching nav item's (translated) label, or
  // the first path segment (never raw ids like "campaign/<uuid>/manage").
  const firstSegment = location.pathname.split('/')[1] || 'dashboard'
  const activeNav =
    PRIMARY_NAV.find(
      (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
    ) ?? PRIMARY_NAV.find((item) => item.to === `/${firstSegment}`)

  return (
    <div
      className={cm.cn('min-h-screen flex bg-background text-on-surface')}
      data-mol-id="creator-shell"
    >
      {/* Desktop sidebar */}
      <aside
        className={cm.cn('hidden lg:flex flex-col w-[260px] fixed inset-y-0 left-0 z-40 shadow-xl')}
        style={{
          background:
            'linear-gradient(180deg, var(--color-secondary) 0%, var(--color-secondary-hover) 100%)',
        }}
        aria-label={t('creatorSidebar.label', {}, { defaultValue: 'Creator navigation' })}
      >
        <Link
          to="/dashboard"
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', gap: 'xs' }),
            'border-b border-surface/10',
          )}
        >
          <span className={cm.cn(cm.textSize('2xl'), 'font-black tracking-tighter text-white')}>
            {APP_NAME}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            {t('creatorSidebar.eyebrow', {}, { defaultValue: 'Creator Studio' })}
          </span>
        </Link>

        <nav className={cm.cn(cm.flex1, cm.sp('p', 4), cm.stack(1), 'overflow-y-auto')}>
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary/15 text-white border-l-4 border-primary -ml-1 pl-3'
                    : 'text-white/70 hover:text-white hover:bg-surface/5',
                )
              }
              data-mol-id={`creator-nav-${item.key}`}
            >
              <span
                className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span>
                {t(`creatorSidebar.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className={cm.cn(cm.sp('p', 4), 'border-t border-surface/10')}>
          <Link
            to={userId ? `/profile/${userId}` : '/settings'}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('p', 2),
              'rounded-lg bg-surface/5 hover:bg-surface/10 transition-colors',
            )}
            aria-label={t('creatorSidebar.viewProfile', {}, { defaultValue: 'View your profile' })}
            data-mol-id="sidebar-profile-link"
          >
            <div
              className={cm.cn(
                cm.w(9),
                cm.h(9),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                cm.fontWeight('bold'),
                'text-white',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
              }}
            >
              {userInitial}
            </div>
            <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-white truncate',
                )}
              >
                {userEmail || t('creatorSidebar.guest', {}, { defaultValue: 'Creator' })}
              </span>
              <span className="text-[11px] uppercase tracking-widest text-white/40">
                {t('creatorSidebar.role', {}, { defaultValue: 'Creator' })}
              </span>
            </div>
          </Link>
        </div>
      </aside>

      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.flex1,
          'lg:ml-[260px] min-h-screen min-w-0',
        )}
      >
        {/* Top bar (visible on all sizes; replaces sidebar on mobile) */}
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 6),
            cm.sp('py', 3),
            'sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-outline-variant',
          )}
        >
          <Link
            to="/dashboard"
            className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'lg:hidden')}
          >
            <span
              className={cm.cn(cm.textSize('lg'), 'font-black tracking-tighter text-on-surface')}
            >
              {APP_NAME}
            </span>
          </Link>
          <div className={cm.cn(cm.flex1, cm.sp('px', 4), 'hidden lg:block')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {activeNav
                ? t(
                    `creatorSidebar.nav.${activeNav.key}`,
                    {},
                    { defaultValue: activeNav.defaultLabel },
                  )
                : firstSegment}
            </p>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'xs' })}>
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main className={cm.flex1}>
          <Outlet />
        </main>
        {/* Clear the fixed mobile bottom nav (hidden at lg where the
            sidebar takes over). */}
        <div className={cm.cn('h-16 lg:hidden')} aria-hidden="true" />
      </div>
      <CreatorMobileNav />
    </div>
  )
}

export default CreatorSidebarLayout
