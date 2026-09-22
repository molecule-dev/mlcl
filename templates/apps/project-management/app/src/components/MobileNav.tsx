/**
 * Mobile app chrome (rendered ONLY below the `md` breakpoint — 768px).
 *
 * Desktop renders each page's fixed side rail (240-288px), which would crush
 * a phone's content column. Below `md` those rails are CSS-hidden and this
 * component takes over: a top bar (hamburger + page title + user menu) and a
 * slide-in nav drawer. Follows the fleet QA mobile-shell pattern (blog's
 * MobileTopBar / shift-scheduling's ShiftlyLayout): the bar itself is
 * CONDITIONALLY RENDERED via matchMedia — not CSS-hidden — so nav
 * `data-mol-id`s are never duplicated in the DOM, and it is deliberately
 * NOT sticky: several pages (Dashboard, Board, Timeline) already ship their
 * own sticky page headers, and a second sticky bar would stack on top of
 * them at `top-0`.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const DESKTOP_QUERY = '(min-width: 768px)'

interface NavItem {
  to: string
  labelKey: string
  defaultLabel: string
  icon: string
  /** Prefixes of the pathname this item is the active nav for. */
  matchPrefixes: string[]
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    labelKey: 'nav.dashboard',
    defaultLabel: 'Dashboard',
    icon: 'dashboard',
    matchPrefixes: ['/dashboard', '/projects'],
  },
  {
    to: '/my-tasks',
    labelKey: 'nav.myTasks',
    defaultLabel: 'My Tasks',
    icon: 'assignment_turned_in',
    matchPrefixes: ['/my-tasks', '/tasks', '/list'],
  },
  {
    to: '/calendar',
    labelKey: 'nav.calendar',
    defaultLabel: 'Calendar',
    icon: 'calendar_today',
    matchPrefixes: ['/calendar', '/timeline'],
  },
  {
    to: '/settings',
    labelKey: 'nav.settings',
    defaultLabel: 'Settings',
    icon: 'settings',
    matchPrefixes: ['/settings', '/plan-updated'],
  },
  {
    to: '/help',
    labelKey: 'common.help',
    defaultLabel: 'Help',
    icon: 'help',
    matchPrefixes: ['/help'],
  },
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
  for (const item of NAV_ITEMS) {
    if (item.matchPrefixes.some((p) => pathname.startsWith(p))) {
      return t(item.labelKey, {}, { defaultValue: item.defaultLabel })
    }
  }
  return t('brand.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })
}

export default function MobileNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
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

  const navAriaLabel = t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })
  const focusRing =
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

  return (
    <>
      {/* Top bar — in normal flow (not sticky), so page-level sticky headers
          never stack underneath it. */}
      <header
        data-mol-id="mobile-topbar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          cm.h(14),
          cm.sp('px', 2),
          'bg-surface/95 backdrop-blur-md border-b border-outline-variant/40 z-40',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}>
          <button
            type="button"
            data-mol-id="nav-toggle"
            aria-label={t('mobileNav.openMenu', {}, { defaultValue: 'Open navigation menu' })}
            aria-expanded={drawerOpen}
            aria-controls="pm-nav-drawer"
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
              'font-bold tracking-tight text-on-background truncate',
            )}
          >
            {pageTitle(pathname, t)}
          </h2>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'shrink-0')}>
          <UserMenu />
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
            id="pm-nav-drawer"
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
              <span className={cm.cn(cm.textSize('xl'), 'font-bold text-on-background')}>
                {t('brand.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
              </span>
              <button
                type="button"
                data-mol-id="nav-drawer-close"
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
                const active = item.matchPrefixes.some((p) => pathname.startsWith(p))
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    data-mol-id={`mobile-nav-${item.to.replace(/\//g, '') || 'root'}`}
                    aria-current={active ? 'page' : undefined}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      'px-4 py-3 rounded-lg text-sm transition-colors',
                      active
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                      focusRing,
                    )}
                  >
                    <span
                      className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <span>{t(item.labelKey, {}, { defaultValue: item.defaultLabel })}</span>
                  </Link>
                )
              })}
            </nav>
            <button
              type="button"
              data-mol-id="mobile-nav-new-project"
              onClick={() => {
                closeDrawer()
                navigate('/dashboard')
              }}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                cm.w('full'),
                'bg-primary text-on-primary rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95',
                focusRing,
              )}
            >
              <span
                className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                aria-hidden="true"
              >
                add
              </span>
              {t('common.newProject', {}, { defaultValue: 'New Project' })}
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
export { MobileNav }
