import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

/**
 * Authenticated shell — left sidebar nav + UserMenu in the chrome slot on
 * desktop (>= 768px); a template-local compact shell (sticky top bar +
 * drawer) below that, since the shared SidebarLayout has no mobile
 * collapse.
 *
 * Eight primary nav entries map to the visually-prominent screens in
 * screen-map.json; the remaining auth'd routes (PostDetail, Profile detail)
 * are deep-linked from inside their parent index pages.
 */

const NAV_KEYS = [
  { to: '/feed', key: 'feed', defaultLabel: 'Feed', icon: 'home' },
  { to: '/explore', key: 'explore', defaultLabel: 'Explore', icon: 'explore' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  { to: '/messages', key: 'messages', defaultLabel: 'Messages', icon: 'send' },
  { to: '/notifications', key: 'notifications', defaultLabel: 'Notifications', icon: 'favorite' },
  { to: '/profile/me', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

type NavItem = { to: string; key: string; icon: string; label: string }

function useNavItems(): NavItem[] {
  const { t } = useTranslation()
  return NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`socialMediaLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
}

/**
 * true at >= 768px (the shared SidebarLayout's comfortable width), false
 * below. Media-query driven so exactly ONE shell is mounted at a time —
 * the mobile shell must not duplicate the desktop <Outlet /> (double
 * fetches, duplicate DOM, double text matches for locators).
 */
function useIsDesktop(): boolean {
  const query = '(min-width: 768px)'
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

export function SocialMediaLayout() {
  const navItems = useNavItems()
  const isDesktop = useIsDesktop()
  const { t } = useTranslation()
  const navAriaLabel = t(
    'socialMediaLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )
  if (isDesktop) {
    return (
      <SidebarLayout
        appName={APP_NAME}
        logoTo="/feed"
        navItems={navItems}
        userMenu={<UserMenu />}
        navAriaLabel={navAriaLabel}
      />
    )
  }
  return <MobileShell navItems={navItems} navAriaLabel={navAriaLabel} />
}

/**
 * Template-local mobile shell (below 768px): sticky top bar with a
 * hamburger that opens a left drawer carrying the same nav items as the
 * desktop sidebar. Same brand, labels and active highlighting as the
 * shared sidebar, sized for a 390px viewport.
 */
function MobileShell({ navItems, navAriaLabel }: { navItems: NavItem[]; navAriaLabel: string }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Escape closes the drawer while it is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Same longest-prefix active resolution the shared sidebar applies.
  const activeKey =
    navItems.reduce<string | null>((best, item) => {
      const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
      if (!isMatch) return best
      if (best === null) return item.key
      const bestItem = navItems.find((i) => i.key === best)
      return bestItem && item.to.length > bestItem.to.length ? item.key : best
    }, null) ?? ''

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-background">
      <header
        className={cm.cn(
          'sticky top-0 z-40 flex h-14 shrink-0 items-center gap-1 border-b border-outline-variant bg-surface px-2',
        )}
      >
        <button
          type="button"
          data-mol-id="nav-mobile-toggle"
          aria-label={t('socialMediaLayout.openMenu', {}, { defaultValue: 'Open navigation menu' })}
          aria-expanded={open}
          aria-controls="mobile-nav-drawer"
          onClick={() => setOpen(true)}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-10 w-10 shrink-0 rounded-full text-on-surface hover:bg-surface-container',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
            menu
          </span>
        </button>
        <Link
          to="/feed"
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            cm.sp('px', 2),
            'shrink-0 self-center',
          )}
        >
          {APP_NAME}
        </Link>
        <div className={cm.cn(cm.sp('ml', 2), 'ml-auto flex min-w-0 max-w-[12rem] items-center')}>
          <UserMenu />
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={t(
              'socialMediaLayout.closeMenu',
              {},
              { defaultValue: 'Close navigation menu' },
            )}
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/40"
          />
          <nav
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={navAriaLabel}
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              cm.surface,
              'absolute left-0 top-0 h-full w-72 max-w-[85vw] overflow-y-auto p-4 shadow-xl',
            )}
          >
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
            >
              <Link
                to="/feed"
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
                onClick={() => setOpen(false)}
              >
                {APP_NAME}
              </Link>
              <button
                type="button"
                aria-label={t(
                  'socialMediaLayout.closeMenu',
                  {},
                  { defaultValue: 'Close navigation menu' },
                )}
                onClick={() => setOpen(false)}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-10 w-10 rounded-full text-on-surface hover:bg-surface-container',
                )}
              >
                <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            <div className={cm.cn(cm.stack(1))}>
              {navItems.map((item) => {
                const isActive = item.key === activeKey
                return (
                  <Link
                    key={item.key}
                    to={item.to}
                    data-mol-id={`nav-${item.key}`}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      cm.roundedFull,
                      'min-h-10',
                      isActive
                        ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                        : cm.cn(cm.textMuted, cm.link),
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>
      ) : null}

      <main className={cm.cn(cm.pageShellContent, 'min-h-0 min-w-0 flex-1')}>
        <Outlet />
      </main>
    </div>
  )
}
