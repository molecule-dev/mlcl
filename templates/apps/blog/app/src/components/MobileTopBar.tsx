/**
 * Mobile app chrome (rendered ONLY below the `md` breakpoint — 768px).
 *
 * Desktop renders the fixed `SideNavBar` (240px rail) + per-page top bars,
 * which would crush a phone's content column. Below `md` those are
 * CSS-hidden and this component takes over: a sticky top bar (hamburger +
 * page title + notifications + user menu) and a slide-in nav drawer.
 * Follows the fleet QA mobile-shell pattern from shift-scheduling's
 * ShiftlyLayout — conditionally RENDERED via matchMedia, not CSS-hidden,
 * so nav `data-mol-id`s are never duplicated in the DOM.
 */
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SafeLink } from './SafeLink.js'
import { UserMenu } from './UserMenu.js'

const DESKTOP_QUERY = '(min-width: 768px)'

interface NavItem {
  to: string
  labelKey: string
  defaultLabel: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/posts', labelKey: 'sideNavBar.myPosts', defaultLabel: 'My Posts', icon: 'description' },
  { to: '/tags', labelKey: 'sideNavBar.categories', defaultLabel: 'Categories', icon: 'category' },
  { to: '/analytics', labelKey: 'nav.analytics', defaultLabel: 'Analytics', icon: 'monitoring' },
  { to: '/comments', labelKey: 'sideNavBar.comments', defaultLabel: 'Comments', icon: 'forum' },
  {
    to: '/notifications',
    labelKey: 'settings.notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', labelKey: 'nav.settings', defaultLabel: 'Settings', icon: 'settings' },
]

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && !window.matchMedia(DESKTOP_QUERY).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(!e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isMobile
}

function pageTitle(pathname: string, t: ReturnType<typeof useTranslation>['t']): string {
  if (pathname.startsWith('/analytics'))
    return t('nav.analytics', {}, { defaultValue: 'Analytics' })
  if (pathname.startsWith('/posts/new')) return t('nav.editor', {}, { defaultValue: 'Editor' })
  if (/^\/posts\/.+\/edit$/.test(pathname)) return t('nav.editor', {}, { defaultValue: 'Editor' })
  if (pathname.startsWith('/posts'))
    return t('topNavBar.articles', {}, { defaultValue: 'Articles' })
  if (pathname.startsWith('/comments'))
    return t('topNavBar.comments', {}, { defaultValue: 'Comments' })
  if (pathname.startsWith('/settings')) return t('nav.settings', {}, { defaultValue: 'Settings' })
  if (pathname.startsWith('/tags')) return t('form.tags', {}, { defaultValue: 'Tags' })
  if (pathname.startsWith('/notifications'))
    return t('settings.notifications', {}, { defaultValue: 'Notifications' })
  return t('nav.dashboard', {}, { defaultValue: 'Dashboard' })
}

export default function MobileTopBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isMobile = useIsMobile()

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  // Any navigation closes the drawer.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // While open: Escape closes, background scroll locks.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [drawerOpen])

  if (!isMobile) return null

  const displayName =
    (user as { name?: string; email?: string } | null)?.name?.trim() ||
    (user as { email?: string } | null)?.email?.trim() ||
    t('nav.editor', {}, { defaultValue: 'Editor' })
  const navAriaLabel = t('sideNavBar.mainNavigation', {}, { defaultValue: 'Main Navigation' })

  const handleSignOut = async () => {
    closeDrawer()
    await logout()
    navigate('/login')
  }

  const focusRing =
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

  return (
    <>
      {/* Sticky top bar — in normal flow, so pages need no offset padding. */}
      <header
        data-mol-id="mobile-topbar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          cm.h(16),
          cm.sp('px', 2),
          'sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-outline-variant/40',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}>
          <button
            type="button"
            data-mol-id="nav-toggle"
            aria-label={t('mobileNav.openMenu', {}, { defaultValue: 'Open navigation menu' })}
            aria-expanded={drawerOpen}
            aria-controls="blog-nav-drawer"
            onClick={() => setDrawerOpen(true)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'h-11 w-11 shrink-0 text-on-surface-variant hover:bg-surface-container',
              focusRing,
            )}
          >
            <span
              className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}
              aria-hidden="true"
            >
              menu
            </span>
          </button>
          <h2
            className={cm.cn(
              cm.textSize('lg'),
              'font-serif italic tracking-tight text-on-background truncate',
            )}
          >
            {pageTitle(pathname, t)}
          </h2>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'shrink-0')}>
          <button
            type="button"
            data-mol-id="topnav-notifications"
            aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            onClick={() => navigate('/notifications')}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'h-11 w-11 text-on-surface-variant hover:bg-surface-container',
              focusRing,
            )}
          >
            <span
              className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
              aria-hidden="true"
            >
              notifications
            </span>
          </button>
          <UserMenu dataMolId="topnav-account" />
        </div>
      </header>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50">
          {/* Backdrop: click to dismiss (not tab-reachable — Escape and the
              × button are the keyboard paths). */}
          <button
            type="button"
            tabIndex={-1}
            aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
            onClick={closeDrawer}
            className="absolute inset-0 h-full w-full cursor-default bg-black/40"
          />
          <div
            id="blog-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={navAriaLabel}
            data-mol-id="mobile-nav-drawer"
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-surface-container-low shadow-xl p-4',
            )}
          >
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}
            >
              <span
                className={cm.cn(
                  cm.textSize('2xl'),
                  "font-['Newsreader'] font-black text-on-background",
                )}
              >
                {t(
                  'sideNavBar.writeflow',
                  { appName: 'WriteFlow' },
                  { defaultValue: '{{appName}}' },
                )}
              </span>
              <button
                type="button"
                aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
                onClick={closeDrawer}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'h-11 w-11 text-on-surface-variant hover:bg-surface-container',
                  focusRing,
                )}
              >
                <span
                  className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}
                  aria-hidden="true"
                >
                  close
                </span>
              </button>
            </div>
            <nav aria-label={navAriaLabel} className={cm.cn(cm.flex1, cm.stack(1))}>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.to ||
                  pathname.startsWith(`${item.to}/`) ||
                  (item.to === '/posts' && pathname.startsWith('/post/'))
                return (
                  <SafeLink
                    key={item.to}
                    to={item.to}
                    onClick={closeDrawer}
                    data-mol-id={`mobile-nav-${item.to.replace(/\//g, '')}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('px', 3),
                      'min-h-[44px] gap-3 py-2.5 rounded-lg text-sm font-medium uppercase tracking-wide',
                      isActive
                        ? 'border-l-4 border-primary text-[var(--color-status-published)] bg-surface-container-lowest shadow-sm'
                        : 'border-l-4 border-transparent text-on-surface-variant hover:bg-surface-container',
                    )}
                  >
                    <span
                      className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    {t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
                  </SafeLink>
                )
              })}
            </nav>
            <div
              className={cm.cn(
                cm.sp('pt', 4),
                cm.sp('mt', 4),
                'border-t border-outline-variant/10',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('mb', 2),
                  cm.sp('px', 2),
                )}
              >
                <div
                  className={cm.cn(
                    cm.w(8),
                    cm.h(8),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    'bg-primary text-on-primary font-bold',
                  )}
                  aria-hidden="true"
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'truncate')}>
                  {displayName}
                </span>
              </div>
              <button
                type="button"
                data-mol-id="mobile-nav-signout"
                onClick={() => void handleSignOut()}
                className={cm.cn(
                  cm.flex({ align: 'center' }),
                  cm.sp('px', 3),
                  cm.w('full'),
                  'min-h-[44px] gap-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-left text-on-surface-variant hover:text-error hover:bg-error-container/20',
                  focusRing,
                )}
              >
                <span
                  className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
                  aria-hidden="true"
                >
                  logout
                </span>
                {t('common.logout', {}, { defaultValue: 'Logout' })}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
