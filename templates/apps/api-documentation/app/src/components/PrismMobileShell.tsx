// Fleet QA mobile-shell pattern: the shared SidebarLayout renders a fixed
// 240px rail at every width, which crushes a 390px phone's content column
// to ~150px. Below `md` (768px) the sidebar is not rendered at all and THIS
// shell takes over — a sticky top bar (hamburger + wordmark + user menu) and
// a slide-in nav drawer. Conditionally RENDERED via matchMedia (see
// PrismLayout), never CSS-hidden, so nav `data-mol-id`s are never duplicated
// in the DOM.
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/** Same shape the shared SidebarLayout's navItems prop carries. */
export interface PrismNavItem {
  to: string
  key: string
  icon: string
  label: string
}

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

interface PrismMobileShellProps {
  navItems: PrismNavItem[]
  userMenu?: ReactNode
}

export function PrismMobileShell({ navItems, userMenu }: PrismMobileShellProps) {
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

  // Single-active-item resolution: longest prefix match, same rule the
  // desktop sidebar uses so both shells agree on the highlighted item.
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
          cm.flex({ align: 'center', justify: 'between', gap: 2 }),
          'h-[56px] shrink-0 sticky top-0 z-40 px-2 border-b border-outline-variant/40 bg-surface-container-lowest/95 backdrop-blur-xl',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }), 'min-w-0')}>
          <button
            type="button"
            data-mol-id="mobile-nav-toggle"
            aria-label={t('mobileNav.openMenu', {}, { defaultValue: 'Open navigation menu' })}
            aria-expanded={drawerOpen}
            aria-controls="prism-nav-drawer"
            onClick={() => setDrawerOpen(true)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'h-11 w-11 shrink-0 text-on-surface-variant hover:bg-surface-container',
              FOCUS_RING,
            )}
          >
            <span className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')} aria-hidden>
              menu
            </span>
          </button>
          <Link
            to="/docs"
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'font-headline tracking-tight text-on-surface truncate',
              FOCUS_RING,
            )}
          >
            {APP_NAME}
          </Link>
        </div>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 1 }), 'shrink-0 min-w-0 max-w-[55%]')}
        >
          {userMenu}
        </div>
      </header>

      <main className={cm.cn(cm.flex1, 'overflow-y-auto bg-surface-container')}>
        <Outlet />
      </main>

      {/* Slide-in drawer + scrim */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50" data-mol-id="mobile-nav-drawer-root">
          <button
            type="button"
            aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
            className="absolute inset-0 h-full w-full cursor-default bg-black/60"
            onClick={closeDrawer}
          />
          <nav
            id="prism-nav-drawer"
            aria-label={t(
              'prismLayout.primaryNavLabel',
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
              <span
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  'font-headline tracking-tight text-on-surface',
                )}
              >
                {APP_NAME}
              </span>
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
                  className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}
                  aria-hidden
                >
                  close
                </span>
              </button>
            </div>
            <ul
              className={cm.cn(
                cm.flex1,
                cm.sp('p', 3),
                'space-y-1 overflow-y-auto list-none p-0 m-0',
              )}
            >
              {navItems.map((item) => {
                const isActive = item.key === activeKey
                return (
                  <li key={item.key}>
                    <Link
                      to={item.to}
                      data-mol-id="mobile-nav-item"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={closeDrawer}
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
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      )}
    </div>
  )
}

export default PrismMobileShell
