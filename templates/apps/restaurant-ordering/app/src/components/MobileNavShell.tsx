import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

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
  /** Accessible name for the drawer <nav>. */
  navAriaLabel?: string
}

/**
 * Hearth mobile chrome (rendered ONLY below the `md` breakpoint — 768px).
 *
 * The shared `SidebarLayout` renders a fixed rail at every width, which
 * crushes a 390px phone's content column to ~150px — the manager can't read
 * tonight's tickets or tap a table. Below `md` the rail is not rendered at
 * all and this component takes over: a sticky top bar (hamburger + wordmark +
 * theme toggle + user menu) and a slide-in nav drawer.
 * Fleet QA mobile-shell pattern (ai-translation-hub / ai-agent-playground
 * MobileNavShell): conditionally RENDERED via matchMedia, not CSS-hidden, so
 * nav `data-mol-id`s are never duplicated in the DOM.
 */
export function MobileNavShell({
  logoTo = '/dashboard',
  navItems,
  navAriaLabel,
}: MobileNavShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const closeDrawer = useCallback((): void => setDrawerOpen(false), [])
  const drawerLabel =
    navAriaLabel ??
    t('restaurantOrderingLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

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
            aria-controls="hearth-nav-drawer"
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
          <Link to={logoTo} className={cm.cn('rounded', FOCUS_RING)}>
            <BrandWordmark as="span" size="sm" />
          </Link>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}>
          <ThemeToggle />
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
            id="hearth-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={drawerLabel}
            data-mol-id="mobile-nav-drawer"
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-surface-container-low shadow-xl p-4',
            )}
          >
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}
            >
              <BrandWordmark as="span" size="lg" />
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
            <nav aria-label={drawerLabel} className={cm.cn(cm.flex1, cm.stack(1))}>
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
              {/* The sidebar UserMenu card fits the 288px drawer; it never
                  fits a 390px top bar (long emails force page overflow). */}
              <div className="text-on-surface-variant hover:text-on-surface transition-colors">
                <UserMenu />
              </div>
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
