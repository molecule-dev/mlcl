// Fleet QA mobile-shell pattern (budget-planner CofferMobileShell /
// ai-writing-studio PlumeMobileShell): the shared SidebarLayout renders its
// fixed-width rail at every viewport, which crushes a 390px phone's content
// column to ~150px. Below `md` (768px) CadenceLayout does not render the
// sidebar at all and THIS component takes over — a sticky top bar (hamburger
// + user menu) and a slide-in nav drawer. Conditionally RENDERED via
// matchMedia, never CSS-hidden, so nav `data-mol-id`s are never duplicated
// in the DOM.
import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export interface CadenceNavItem {
  to: string
  key: string
  icon: string
  label: string
}

export function CadenceMobileShell({ navItems }: { navItems: ReadonlyArray<CadenceNavItem> }) {
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

  // Longest prefix-match, mirroring SidebarLayout's active resolution so a
  // detail route (/projects/<id>, /tasks/<id>) keeps its section lit.
  const activeKey = navItems.reduce<string | null>((best, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return best
    if (best === null) return item.key
    const bestItem = navItems.find((i) => i.key === best)
    return bestItem && item.to.length > bestItem.to.length ? item.key : best
  }, null)

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.h('screen'), 'overflow-hidden')}>
      {/* Sticky top bar — in normal flow, so pages need no offset padding. */}
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
            aria-controls="cadence-nav-drawer"
            onClick={() => setDrawerOpen(true)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'h-11 w-11 shrink-0 text-on-surface-variant hover:bg-surface-container',
              FOCUS_RING,
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24 }} aria-hidden="true">
              menu
            </span>
          </button>
          <Link
            to="/today"
            // Below ~420px the drawer title carries the brand instead.
            className={cm.cn('hidden min-[420px]:block', FOCUS_RING)}
          >
            <BrandWordmark as="span" size="sm" />
          </Link>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}>
          <UserMenu />
        </div>
      </header>

      <main className={cm.cn(cm.flex1, 'overflow-y-auto bg-background')}>
        <Outlet />
      </main>

      {/* Slide-in drawer + scrim */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50" data-mol-id="mobile-nav-drawer-root">
          <button
            type="button"
            aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
            className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm"
            onClick={closeDrawer}
          />
          <nav
            id="cadence-nav-drawer"
            aria-label={t(
              'cadenceLayout.primaryNavLabel',
              {},
              { defaultValue: 'Primary navigation' },
            )}
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-surface-container-lowest border-r border-outline-variant/40 shadow-xl',
            )}
            data-mol-id="mobile-nav-drawer"
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('px', 5),
                'pt-5 pb-2',
              )}
            >
              <BrandWordmark as="span" />
              <button
                type="button"
                aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'h-11 w-11 text-on-surface-variant hover:bg-surface-container',
                  FOCUS_RING,
                )}
                data-mol-id="mobile-nav-close"
                onClick={closeDrawer}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 24 }}
                  aria-hidden="true"
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
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        cm.roundedFull,
                        isActive
                          ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                          : cm.cn(cm.textMuted, cm.link),
                      )}
                      data-mol-id={`nav-${item.key}`}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={closeDrawer}
                      to={item.to}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 20 }}
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                      {item.label}
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

export default CadenceMobileShell
