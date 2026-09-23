import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { UserMenu } from './UserMenu.js'

export interface PylonNavItem {
  to: string
  key: string
  icon: string
  label: string
}

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mol-color-primary)]'

interface PylonMobileShellProps {
  navItems: ReadonlyArray<PylonNavItem>
  /** Accessible name for the drawer <nav>. */
  navAriaLabel?: string
}

/**
 * Pylon mobile chrome — rendered ONLY below the `md` breakpoint (768px).
 *
 * The shared `SidebarLayout` renders a fixed 240px rail at every width, which
 * crushes a 390px phone's content column to ~150px (every heading truncates
 * mid-word and the hero overflows). Below `md` the rail is not rendered at all
 * and this component takes over: a sticky top bar (hamburger + wordmark +
 * user menu) and a slide-in nav drawer. Fleet QA mobile-shell pattern
 * (ai-agent-playground / ai-translation-hub MobileNavShell): conditionally
 * RENDERED via matchMedia, not CSS-hidden, so nav `data-mol-id`s are never
 * duplicated in the DOM.
 */
export function PylonMobileShell({ navItems, navAriaLabel }: PylonMobileShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const closeDrawer = useCallback((): void => setDrawerOpen(false), [])
  const drawerLabel =
    navAriaLabel ?? t('pylonShell.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

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

  // Longest-prefix active match — same resolution SidebarLayout uses.
  const activeKey = navItems.reduce<string | null>((best, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return best
    if (best === null) return item.key
    const bestItem = navItems.find((i) => i.key === best)
    return bestItem && item.to.length > bestItem.to.length ? item.key : best
  }, null)

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.h('screen'))}>
      {/* Sticky top bar — in normal flow, so pages need no offset padding. */}
      <header
        data-mol-id="mobile-topbar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          'sticky top-0 z-40 h-14 shrink-0 px-2 backdrop-blur-md',
        )}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--mol-color-surface) 95%, transparent)',
          borderBottom: '1px solid var(--mol-color-border)',
        }}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}>
          <button
            type="button"
            data-mol-id="nav-toggle"
            aria-label={t('pylonShell.openMenu', {}, { defaultValue: 'Open navigation menu' })}
            aria-expanded={drawerOpen}
            aria-controls="pylon-nav-drawer"
            onClick={() => setDrawerOpen(true)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'h-11 w-11 shrink-0',
              FOCUS_RING,
            )}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
              menu
            </span>
          </button>
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('extrabold'),
              'tracking-tight truncate rounded',
              FOCUS_RING,
            )}
            style={{ color: 'var(--mol-color-text)' }}
          >
            {APP_NAME}
            <span style={{ color: BRAND_COLOR }}>.</span>
          </Link>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}>
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
            aria-label={t('pylonShell.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
            onClick={closeDrawer}
            className="absolute inset-0 h-full w-full cursor-default"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          />
          <div
            id="pylon-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={drawerLabel}
            data-mol-id="mobile-nav-drawer"
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto p-4 shadow-xl',
            )}
            style={{ backgroundColor: 'var(--mol-color-surface)' }}
          >
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}
            >
              <span
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('extrabold'), 'tracking-tight')}
                style={{ color: 'var(--mol-color-text)' }}
              >
                {APP_NAME}
                <span style={{ color: BRAND_COLOR }}>.</span>
              </span>
              <button
                type="button"
                aria-label={t(
                  'pylonShell.closeMenu',
                  {},
                  { defaultValue: 'Close navigation menu' },
                )}
                onClick={closeDrawer}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'h-11 w-11',
                  FOCUS_RING,
                )}
                style={{ color: 'var(--mol-color-text-secondary)' }}
              >
                <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            <nav aria-label={drawerLabel} className={cm.cn(cm.flex1, cm.stack(1))}>
              {navItems.map((item) => {
                const isActive = item.key === activeKey
                return (
                  <Link
                    key={item.key}
                    to={item.to}
                    onClick={closeDrawer}
                    data-mol-id={`mobile-nav-${item.key}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.sp('px', 3),
                      'min-h-[44px] rounded-lg py-2.5 text-sm font-medium',
                      FOCUS_RING,
                    )}
                    style={
                      isActive
                        ? {
                            backgroundColor:
                              'color-mix(in srgb, var(--mol-color-primary) 15%, transparent)',
                            color: 'var(--mol-color-primary)',
                            boxShadow:
                              'inset 0 0 0 1px color-mix(in srgb, var(--mol-color-primary) 35%, transparent)',
                          }
                        : { color: 'var(--mol-color-text-secondary)' }
                    }
                  >
                    <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      ) : null}

      {/* The routed page (layout-route children). */}
      <main className={cm.cn(cm.flex1, 'min-h-0 overflow-y-auto')}>
        <Outlet />
      </main>
    </div>
  )
}
