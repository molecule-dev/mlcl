import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

// Fleet QA mobile-shell pattern (ai-agent-playground MobileNavShell /
// clipboard-manager MobileNavShell): the shared SidebarLayout renders a fixed
// 240px rail at every width, which crushes a 390px phone's content column to
// ~150px. Below `md` (768px) EngramLayout renders THIS shell instead — a
// sticky top bar (hamburger + wordmark + user menu) and a slide-in nav
// drawer. Conditionally RENDERED via matchMedia, never CSS-hidden, so nav
// `data-mol-id`s are never duplicated in the DOM.

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export interface MobileNavItem {
  to: string
  key: string
  icon?: string
  label: string
}

interface MobileNavShellProps {
  navItems: ReadonlyArray<MobileNavItem>
  navAriaLabel: string
}

export function MobileNavShell({ navItems, navAriaLabel }: MobileNavShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
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

  // Longest-prefix active match — same resolution SidebarLayout uses on desktop.
  const activeKey = navItems.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = navItems.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-h-screen')}>
      <header
        data-mol-id="mobile-top-bar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          'h-[56px] shrink-0 sticky top-0 z-40 px-2 border-b border-outline-variant/40 bg-surface-container-lowest/95 backdrop-blur-xl',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}>
          <button
            type="button"
            data-mol-id="mobile-nav-toggle"
            aria-label={t('mobileNav.openMenu', {}, { defaultValue: 'Open navigation menu' })}
            aria-expanded={drawerOpen}
            aria-controls="engram-nav-drawer"
            onClick={() => setDrawerOpen(true)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'h-11 w-11 shrink-0 text-on-surface-variant hover:bg-surface-container',
              FOCUS_RING,
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              style={{ fontSize: 24 }}
              aria-hidden
            >
              menu
            </span>
          </button>
          <Link to="/ask" data-mol-id="mobile-brand" className={cm.cn('truncate', FOCUS_RING)}>
            <BrandWordmark as="span" size="sm" />
          </Link>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'shrink-0')}>
          <UserMenu />
        </div>
      </header>

      <main style={{ minWidth: 0 }}>
        <Outlet />
      </main>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50" data-mol-id="mobile-nav-drawer-root">
          <button
            type="button"
            aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
            className="absolute inset-0 h-full w-full cursor-default bg-black/50 backdrop-blur-sm"
            onClick={closeDrawer}
          />
          <nav
            id="engram-nav-drawer"
            aria-label={navAriaLabel}
            data-mol-id="mobile-nav-drawer"
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-surface-container-lowest border-r border-outline-variant/40 shadow-xl',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('px', 5),
                'pt-5 pb-2',
              )}
            >
              <BrandWordmark as="span" size="sm" />
              <button
                type="button"
                aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
                data-mol-id="mobile-nav-close"
                onClick={closeDrawer}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'h-11 w-11 text-on-surface-variant hover:bg-surface-container',
                  FOCUS_RING,
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined')}
                  style={{ fontSize: 24 }}
                  aria-hidden
                >
                  close
                </span>
              </button>
            </div>
            <ul className={cm.cn(cm.flex1, cm.sp('p', 3), 'space-y-1 overflow-y-auto')}>
              {navItems.map((item) => {
                const isActive = item.key === activeKey
                return (
                  <li key={item.key}>
                    <Link
                      to={item.to}
                      data-mol-id={`nav-${item.key}`}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={closeDrawer}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        cm.sp('px', 4),
                        'py-3 rounded-xl text-sm font-medium',
                        isActive
                          ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                          : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                      )}
                    >
                      {item.icon ? (
                        <span className="material-symbols-outlined" aria-hidden="true">
                          {item.icon}
                        </span>
                      ) : null}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      ) : null}
    </div>
  )
}

export default MobileNavShell
