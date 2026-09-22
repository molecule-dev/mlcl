/**
 * ForumLayout — auth'd page shell.
 *
 * Desktop (≥768px): 240px left sidebar nav (Feed / Categories / Compose
 * / Notifications / Profile / Settings / Mod), centered content column
 * (max-width 780px feed / 1120px other), and an optional right rail rendered
 * by individual pages via the `<Outlet context>` pattern (we just give pages
 * a wide content area and they inject a CommunitySidebar themselves on
 * sidebar-eligible routes).
 *
 * Mobile (<768px): the sidebar is replaced by a sticky top bar (menu button
 * + brand + compose shortcut) that opens a slide-over drawer with the same
 * nav items. The drawer closes on navigation, on backdrop tap, and on
 * Escape, and locks body scroll while open.
 *
 * Translated from blog/SideNavBar.tsx + blog/AppLayout.tsx left-rail
 * pattern fused with personal-finance/PageShell content gutter.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

interface NavItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
  matchPrefix?: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/feed', icon: 'home', labelKey: 'forumLayout.feed', defaultLabel: 'Feed' },
  {
    to: '/categories',
    icon: 'workspaces',
    labelKey: 'forumLayout.categories',
    defaultLabel: 'Categories',
    matchPrefix: '/c/',
  },
  { to: '/search', icon: 'search', labelKey: 'forumLayout.search', defaultLabel: 'Search' },
  {
    to: '/notifications',
    icon: 'notifications',
    labelKey: 'forumLayout.notifications',
    defaultLabel: 'Notifications',
  },
  {
    to: '/compose',
    icon: 'edit_square',
    labelKey: 'forumLayout.compose',
    defaultLabel: 'New post',
  },
  { to: '/mod', icon: 'shield', labelKey: 'forumLayout.modQueue', defaultLabel: 'Mod queue' },
]

const SETTINGS_NAV_ITEM: NavItem = {
  to: '/settings',
  icon: 'settings',
  labelKey: 'forumLayout.settings',
  defaultLabel: 'Settings',
}

function isActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.to) return true
  if (item.matchPrefix && pathname.startsWith(item.matchPrefix)) return true
  return false
}

export function ForumLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { logout, user } = useAuth<{
    id?: string
    name?: string
    email?: string
    username?: string | null
  }>()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  // Profile nav item — resolve to the actual signed-in user. The API's
  // profiles endpoint accepts username, full UUID, or short id-prefix; we
  // pass the username when present (cleaner URLs) and fall back to the
  // 8-char id prefix that ThreadView/ThreadRow link with so the same row
  // is reachable from any reference.
  const profileHandle = (user?.username ?? user?.id?.slice(0, 8) ?? '') as string
  const profileItem: NavItem = {
    to: profileHandle ? `/u/${encodeURIComponent(profileHandle)}` : '/settings',
    icon: 'account_circle',
    labelKey: 'forumLayout.profile',
    defaultLabel: 'Profile',
    matchPrefix: '/u/',
  }

  const handleSignOut = async () => {
    await logout()
    navigate('/login')
  }

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Escape closes the drawer; body scroll locks while it is open.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [menuOpen])

  const renderItem = (item: NavItem) => {
    const active = isActive(pathname, item)
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={() => setMenuOpen(false)}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 3),
          'gap-3 py-2.5 rounded-lg transition-colors border-l-4',
          active
            ? 'border-primary bg-primary-container/20 text-primary font-semibold'
            : 'border-transparent text-on-surface-variant hover:bg-surface-container-low/50 hover:text-on-surface',
        )}
      >
        <span className={cm.cn('material-symbols-outlined', cm.textSize('xl'))} aria-hidden="true">
          {item.icon}
        </span>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight(active ? 'semibold' : 'medium'),
            'tracking-wide',
          )}
        >
          {t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
        </span>
      </Link>
    )
  }

  const navSection = (
    <>
      <nav className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.flex1)}>
        {NAV_ITEMS.map(renderItem)}
        <div
          className={cm.cn(
            cm.sp('mt', 4),
            cm.sp('pt', 4),
            cm.flex({ direction: 'col', gap: 'xs' }),
            'border-t border-outline-variant/30',
          )}
        >
          {[profileItem, SETTINGS_NAV_ITEM].map(renderItem)}
        </div>
      </nav>
      <div
        className={cm.cn(
          cm.sp('pt', 4),
          cm.flex({ direction: 'col', gap: 'sm' }),
          'border-t border-outline-variant/30',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('px', 2))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.textSize('sm'),
            )}
            style={{
              backgroundColor: 'var(--color-primary-light, var(--color-pinned-light))',
              color: 'var(--color-primary, var(--color-pinned))',
            }}
            aria-hidden="true"
          >
            {(user?.name ?? user?.email ?? APP_NAME).slice(0, 1).toUpperCase()}
          </span>
          <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0 flex-1')}>
            <span
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                'truncate text-on-surface',
              )}
            >
              {user?.name ?? t('status.member', {}, { defaultValue: 'Member' })}
            </span>
            <span className={cm.cn(cm.textSize('xs'), 'truncate text-on-surface-variant')}>
              {user?.email ?? ''}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.w('full'),
            cm.fontWeight('semibold'),
            'rounded-lg text-left text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined', cm.textSize('base'))}>logout</span>
          <span className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest')}>
            {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
          </span>
        </button>
      </div>
    </>
  )

  const closeDrawer = useCallback(() => setMenuOpen(false), [])

  return (
    <div className={cm.cn('bg-background', cm.minH('screen'))}>
      {/* Mobile top bar — the nav surface below md, where the sidebar is
          hidden. Sticky so navigation is reachable from anywhere in a long
          thread. */}
      <header
        data-mol-id="mobile-topbar"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 3),
          'md:hidden sticky top-0 z-30 h-14 items-center border-b border-outline-variant/30 bg-surface',
        )}
      >
        <button
          type="button"
          data-mol-id="mobile-menu-open"
          aria-label={t('forumLayout.openMenu', {}, { defaultValue: 'Open navigation menu' })}
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          onClick={() => setMenuOpen(true)}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(10),
            cm.h(10),
            'rounded-lg text-on-surface-variant hover:bg-surface-container-low/60 hover:text-on-surface transition-colors',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}
            aria-hidden="true"
          >
            menu
          </span>
        </button>
        <Link
          to="/feed"
          className={cm.cn(cm.fontWeight('bold'), 'text-xl tracking-tight text-on-surface')}
        >
          {APP_NAME}
        </Link>
        <Link
          to="/compose"
          data-mol-id="mobile-compose-shortcut"
          aria-label={t('forumLayout.compose', {}, { defaultValue: 'New post' })}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(10),
            cm.h(10),
            'ml-auto rounded-full bg-primary text-on-primary',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}
            aria-hidden="true"
          >
            edit_square
          </span>
        </Link>
      </header>

      <div className={cm.cn(cm.flex({ align: 'stretch' }))}>
        <aside
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            cm.sp('p', 5),
            'sticky top-0 hidden md:flex w-[240px] h-screen shrink-0 border-r border-outline-variant/30 bg-surface',
          )}
        >
          <Link to="/feed" className={cm.cn(cm.flex({ direction: 'col' }), cm.sp('mb', 8))}>
            <span
              className={cm.cn(cm.fontWeight('bold'), 'text-2xl tracking-tight')}
              style={{ color: 'var(--color-primary, var(--color-pinned))' }}
            >
              {APP_NAME}
            </span>
            <span
              className={cm.cn(
                cm.fontWeight('medium'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {APP_TAGLINE}
            </span>
          </Link>
          {navSection}
        </aside>
        <main className={cm.cn(cm.flex1, 'min-w-0')}>
          <div
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 5),
              'md:px-6 md:py-8 max-w-[1120px] mx-auto',
            )}
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile slide-over drawer — shares navSection with the desktop
          sidebar so the two surfaces can never diverge. */}
      {menuOpen && (
        <div className={cm.cn('md:hidden fixed inset-0 z-40')} data-mol-id="mobile-drawer-root">
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={closeDrawer} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('forumLayout.drawerLabel', {}, { defaultValue: 'Navigation' })}
            data-mol-id="mobile-drawer"
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              cm.sp('p', 5),
              'absolute left-0 top-0 h-full w-[280px] max-w-[85vw] overflow-y-auto bg-surface shadow-xl',
            )}
          >
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}
            >
              <Link to="/feed" className={cm.cn(cm.flex({ direction: 'col' }))}>
                <span
                  className={cm.cn(cm.fontWeight('bold'), 'text-2xl tracking-tight')}
                  style={{ color: 'var(--color-primary, var(--color-pinned))' }}
                >
                  {APP_NAME}
                </span>
                <span
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {APP_TAGLINE}
                </span>
              </Link>
              <button
                type="button"
                data-mol-id="mobile-menu-close"
                aria-label={t(
                  'forumLayout.closeMenu',
                  {},
                  { defaultValue: 'Close navigation menu' },
                )}
                onClick={closeDrawer}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(10),
                  cm.h(10),
                  'rounded-lg text-on-surface-variant hover:bg-surface-container-low/60 hover:text-on-surface transition-colors',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}
                  aria-hidden="true"
                >
                  close
                </span>
              </button>
            </div>
            {navSection}
          </div>
        </div>
      )}
    </div>
  )
}

export default ForumLayout
