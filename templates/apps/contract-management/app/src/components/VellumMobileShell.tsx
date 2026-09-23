import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'
import { NAV_KEYS } from './VellumLayout.js'

/**
 * Mobile shell for Vellum's signed-in surfaces (<768px).
 *
 * The shared SidebarLayout renders a fixed 240px rail at every width, which
 * crushes a 390px phone's content column to ~150px. Below `md` this shell
 * takes over instead: a sticky top bar (hamburger + wordmark + user menu)
 * and a slide-in nav drawer carrying the SAME nav items as the desktop
 * sidebar. Conditionally RENDERED via matchMedia (see VellumLayout), never
 * CSS-hidden, so nav `data-mol-id`s are never duplicated in the DOM.
 */
export function VellumMobileShell({ children }: { children?: ReactNode }) {
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

  // Same longest-prefix active resolution as the desktop sidebar.
  const activeKey =
    NAV_KEYS.reduce<string | null>((best, item) => {
      const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
      if (!isMatch) return best
      if (best === null) return item.key
      const bestItem = NAV_KEYS.find((i) => i.key === best)
      return bestItem && item.to.length > bestItem.to.length ? item.key : best
    }, null) ?? null

  const navLabel = (key: string, defaultLabel: string): string =>
    t(`vellumLayout.nav.${key}`, {}, { defaultValue: defaultLabel })

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-surface')}>
      {/* Sticky top bar — in normal flow, so pages need no offset padding. */}
      <header
        data-mol-id="mobile-top-bar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          'sticky top-0 z-40 h-14 shrink-0 border-b border-outline-variant bg-surface/95 backdrop-blur px-2',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}>
          <button
            type="button"
            data-mol-id="mobile-nav-toggle"
            aria-label={t('vellumLayout.openMenu', {}, { defaultValue: 'Open navigation menu' })}
            aria-expanded={drawerOpen}
            aria-controls="vellum-nav-drawer"
            onClick={() => setDrawerOpen(true)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'h-11 w-11 shrink-0 text-on-surface-variant hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            )}
          >
            <span className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')} aria-hidden>
              menu
            </span>
          </button>
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'shrink-0 truncate px-1 text-[var(--mol-color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            )}
          >
            {APP_NAME}
          </Link>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'min-w-0 max-w-[45vw] shrink')}>
          <UserMenu />
        </div>
      </header>

      <main className={cm.flex1}>{children ?? <Outlet />}</main>

      {/* Slide-in drawer + scrim */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50" data-mol-id="mobile-nav-drawer-root">
          <button
            type="button"
            aria-label={t('vellumLayout.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
            className="absolute inset-0 h-full w-full cursor-default bg-black/50 backdrop-blur-sm"
            onClick={closeDrawer}
          />
          <nav
            id="vellum-nav-drawer"
            aria-label={t(
              'vellumLayout.primaryNavLabel',
              {},
              { defaultValue: 'Primary navigation' },
            )}
            data-mol-id="mobile-nav-drawer"
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'absolute left-0 top-0 h-full w-[280px] max-w-[85vw] border-r border-outline-variant bg-surface shadow-xl',
            )}
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
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'text-[var(--mol-color-primary)]',
                )}
              >
                {APP_NAME}
              </span>
              <button
                type="button"
                aria-label={t(
                  'vellumLayout.closeMenu',
                  {},
                  { defaultValue: 'Close navigation menu' },
                )}
                data-mol-id="mobile-nav-close"
                onClick={closeDrawer}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'h-11 w-11 text-on-surface-variant hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                )}
              >
                <span
                  className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}
                  aria-hidden
                >
                  close
                </span>
              </button>
            </div>
            <ul className={cm.cn(cm.flex1, cm.sp('p', 3), 'space-y-1 overflow-y-auto')}>
              {NAV_KEYS.map((item) => {
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
                        cm.sp('px', 3),
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
                      <span>{navLabel(item.key, item.defaultLabel)}</span>
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
