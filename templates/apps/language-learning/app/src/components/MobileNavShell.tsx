import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export interface MobileNavItem {
  to: string
  label: string
  icon: string
}

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

interface MobileNavShellProps {
  /** Logo/wordmark target — defaults to `/dashboard`. */
  logoTo?: string
  navItems: MobileNavItem[]
}

/**
 * Mobile app chrome (rendered ONLY below the `md` breakpoint — 768px).
 *
 * The shared `SidebarLayout` renders a fixed ~240px rail at every width,
 * which crushes a 390px phone's content column to ~150px. Below `md` the
 * rail is not rendered at all and this component takes over: a sticky top
 * bar (hamburger + wordmark + initials avatar) and a slide-in nav drawer
 * with sign-out. Fleet QA mobile-shell pattern (flashcard-app
 * MobileNavShell): conditionally RENDERED via matchMedia, not CSS-hidden,
 * so nav `data-mol-id`s are never duplicated in the DOM.
 */
export function MobileNavShell({ logoTo = '/dashboard', navItems }: MobileNavShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth<{ name?: string | null; email?: string | null }>()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // The shared SidebarUserCard renders name + email lines — too wide for a
  // 390px top bar. The mobile top bar gets a compact initials avatar linking
  // to /profile instead; the full panel UserMenu stays on the desktop sidebar.
  const initials = (user?.name || user?.email || '?').slice(0, 2).toUpperCase()

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

  const navAriaLabel = t(
    'parlanceLayout.primaryNavLabel',
    {},
    { defaultValue: 'Primary navigation' },
  )

  const handleSignOut = async () => {
    closeDrawer()
    await logout()
    navigate('/login')
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.h('screen'))}>
      {/* Sticky top bar — in normal flow, so pages need no offset padding. */}
      <header
        data-mol-id="mobile-topbar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          cm.h(14),
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
            aria-controls="parlance-nav-drawer"
            onClick={() => setDrawerOpen(true)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'h-11 w-11 shrink-0 text-on-surface-variant hover:bg-surface-container',
              FOCUS_RING,
            )}
          >
            <span
              className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}
              aria-hidden="true"
            >
              menu
            </span>
          </button>
          <Link
            to={logoTo}
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('extrabold'),
              'tracking-tight text-on-background truncate focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded',
            )}
          >
            {APP_NAME}
          </Link>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'shrink-0')}>
          <Link
            to="/profile"
            aria-label={t('parlanceLayout.nav.profile', {}, { defaultValue: 'Profile' })}
            data-mol-id="mobile-account"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'h-11 w-11 shrink-0 text-xs font-bold',
              FOCUS_RING,
            )}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-on-primary, #ffffff)',
            }}
          >
            {initials}
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
            id="parlance-nav-drawer"
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
                  cm.fontWeight('extrabold'),
                  'text-on-background',
                )}
              >
                {APP_NAME}
              </span>
              <button
                type="button"
                aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
                onClick={closeDrawer}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'h-11 w-11 text-on-surface-variant hover:bg-surface-container',
                  FOCUS_RING,
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
              {navItems.map((item) => {
                const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`)
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={closeDrawer}
                    data-mol-id={`mobile-nav-${item.to.replace(/\//g, '')}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('px', 3),
                      'min-h-[44px] gap-3 py-2.5 rounded-lg text-sm font-medium',
                      isActive
                        ? 'bg-primary-container/40 text-primary'
                        : 'text-on-surface-variant hover:bg-surface-container',
                      FOCUS_RING,
                    )}
                  >
                    <span
                      className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
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
                {t('common.logout', {}, { defaultValue: 'Logout' })}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* The routed page (layout route children). */}
      <div className={cm.cn(cm.flex1, 'min-h-0 overflow-y-auto')}>
        <Outlet />
      </div>
    </div>
  )
}

export default MobileNavShell
