// Fleet QA mobile-shell pattern (ai-agent-playground MobileNavShell): the
// shared SidebarLayout renders a fixed-width rail at every viewport, which
// crushes a 390px phone's content column to ~130px. Below `md` (768px) the
// sidebar is not rendered at all and THIS component takes over — a sticky
// top bar (hamburger + wordmark + user menu) and a slide-in nav drawer.
// Conditionally RENDERED via matchMedia, never CSS-hidden, so nav
// data-mol-ids are never duplicated in the DOM.
import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'
import { buildNavItems, type NavItem } from './nav-items.js'
import { UserMenu } from './UserMenu.js'

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export function MobileNavShell() {
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

  const items = buildNavItems(t)
  const isActive = (item: NavItem): boolean =>
    item.matcher
      ? item.matcher(pathname)
      : pathname === item.to || pathname.startsWith(`${item.to}/`)

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.h('screen'), 'overflow-hidden')}>
      {/* Sticky top bar — in normal flow, so pages need no offset padding. */}
      <div
        data-mol-id="mobile-top-bar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          'h-[56px] shrink-0 sticky top-0 z-40 px-2 border-b border-outline-variant/20 bg-surface-container-lowest/95 backdrop-blur-xl',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}>
          <button
            type="button"
            data-mol-id="mobile-nav-toggle"
            aria-label={t('mobileNav.openMenu', {}, { defaultValue: 'Open navigation menu' })}
            aria-expanded={drawerOpen}
            aria-controls="voting-polling-nav-drawer"
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
            to="/dashboard"
            className={cm.cn('inline-flex min-h-[44px] items-center truncate', FOCUS_RING)}
          >
            <BrandWordmark as="span" size="md" />
          </Link>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      <main className={cm.cn(cm.flex1, 'overflow-y-auto bg-background')}>
        <Outlet />
      </main>

      {/* Slide-in drawer + scrim */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50" data-mol-id="mobile-nav-drawer-root">
          <button
            type="button"
            aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
            className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm"
            onClick={closeDrawer}
          />
          <nav
            id="voting-polling-nav-drawer"
            aria-label={t(
              'votingPollingLayout.primaryNavLabel',
              {},
              { defaultValue: 'Primary navigation' },
            )}
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-surface-container-lowest border-r border-outline-variant/20 shadow-xl',
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
              <BrandWordmark as="span" size="md" />
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
            <ul className={cm.cn(cm.flex1, cm.sp('p', 3), 'space-y-1 overflow-y-auto text-sm')}>
              {items.map((item) => (
                <li key={item.key}>
                  <Link
                    className={
                      isActive(item)
                        ? cm.cn(
                            cm.flex({ align: 'center', gap: 'md' }),
                            cm.sp('px', 4),
                            cm.sp('py', 3),
                            cm.fontWeight('bold'),
                            'rounded-xl border-l-4 border-primary bg-primary/5 text-primary min-h-[44px]',
                          )
                        : cm.cn(
                            cm.flex({ align: 'center', gap: 'md' }),
                            cm.sp('px', 4),
                            cm.sp('py', 3),
                            cm.fontWeight('semibold'),
                            'rounded-xl border-l-4 border-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface min-h-[44px]',
                            FOCUS_RING,
                          )
                    }
                    data-mol-id="mobile-nav-item"
                    onClick={closeDrawer}
                    to={item.to}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </div>
  )
}
