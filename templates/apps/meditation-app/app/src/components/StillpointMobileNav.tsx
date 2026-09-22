import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type NavItem, PRIMARY_ITEMS, SECONDARY_ITEMS } from './StillpointSidebar.js'

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

/**
 * Mobile chrome for Stillpoint's signed-in surfaces (rendered ONLY below the
 * `md` breakpoint — 768px).
 *
 * The desktop left rail (StillpointSidebar) is `hidden md:flex`, which left
 * phones with NO navigation at all. This sticky top bar (hamburger + brand
 * wordmark) and slide-in drawer take over below `md`: all nine routes are
 * reachable, tap targets are ≥44px, the active route is highlighted with
 * `aria-current`, and sign-out lives at the bottom of the drawer.
 *
 * Conditionally RENDERED via matchMedia (fleet QA mobile-shell pattern), not
 * CSS-hidden, so nav `data-mol-id`s are never duplicated in the DOM.
 */
export function StillpointMobileNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth<UserProfile>()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const closeDrawer = useCallback((): void => setDrawerOpen(false), [])

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

  const navAriaLabel = t('nav.primaryNavigation', {}, { defaultValue: 'Primary navigation' })

  const handleSignOut = async () => {
    closeDrawer()
    await logout()
    navigate('/login')
  }

  const renderDrawerItem = (item: NavItem) => {
    const active = pathname === item.to || pathname.startsWith(`${item.to}/`)
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={closeDrawer}
        data-mol-id={`mobile-nav-${item.to.replace(/\//g, '')}`}
        aria-current={active ? 'page' : undefined}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 3),
          'min-h-[44px] py-2.5 rounded-lg text-sm font-medium transition-colors',
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
        {t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
      </Link>
    )
  }

  return (
    <>
      {/* Sticky top bar — in normal flow before <main>, so pages need no offset. */}
      <header
        data-mol-id="mobile-topbar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          'sticky top-0 z-40 h-14 px-2 bg-surface-secondary/95 backdrop-blur-md border-b border-primary-container',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}>
          <button
            type="button"
            data-mol-id="nav-toggle"
            aria-label={t('mobileNav.openMenu', {}, { defaultValue: 'Open navigation menu' })}
            aria-expanded={drawerOpen}
            aria-controls="stillpoint-nav-drawer"
            onClick={() => setDrawerOpen(true)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'h-11 w-11 shrink-0 text-on-surface hover:bg-primary-container/60 transition-colors',
              FOCUS_RING,
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}
            >
              menu
            </span>
          </button>
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
            id="stillpoint-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={navAriaLabel}
            data-mol-id="mobile-nav-drawer"
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-surface-secondary shadow-xl p-4',
            )}
          >
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
            >
              <span className={cm.cn('block')}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('2xl'),
                    'text-primary tracking-tight block',
                  )}
                >
                  {APP_NAME}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'block text-primary font-medium tracking-wide uppercase mt-0.5',
                  )}
                >
                  {t('stillpoint.nav.tagline', {}, { defaultValue: 'Find your still center' })}
                </span>
              </span>
              <button
                type="button"
                aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
                onClick={closeDrawer}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'h-11 w-11 shrink-0 text-on-surface hover:bg-primary-container/60 transition-colors',
                  FOCUS_RING,
                )}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}
                >
                  close
                </span>
              </button>
            </div>
            <nav
              aria-label={navAriaLabel}
              className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'list-none')}
            >
              {PRIMARY_ITEMS.map(renderDrawerItem)}
            </nav>
            <nav
              aria-label={t('nav.secondaryNavigation', {}, { defaultValue: 'Account navigation' })}
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'xs' }),
                cm.sp('mt', 4),
                cm.sp('pt', 4),
                'border-t border-primary-container list-none',
              )}
            >
              {SECONDARY_ITEMS.map(renderDrawerItem)}
            </nav>
            <button
              type="button"
              data-mol-id="mobile-nav-signout"
              onClick={() => void handleSignOut()}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 3),
                cm.sp('mt', 4),
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
          </div>
        </div>
      ) : null}
    </>
  )
}
