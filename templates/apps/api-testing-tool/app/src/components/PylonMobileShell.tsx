import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SURFACE_PANEL } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { NAV_KEYS } from './PylonShell.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const PANEL_BORDER = 'var(--color-border)'

/**
 * Mobile app shell (fleet QA pattern) — below 768px the desktop SidebarLayout's
 * fixed 240px rail would crush a phone's content column, so this takes over:
 * a sticky top bar (hamburger + wordmark + user menu) and a slide-in nav
 * drawer. Conditionally RENDERED via matchMedia (see `useIsMobile`), never
 * CSS-hidden, so nav `data-mol-id`s are never duplicated in the DOM.
 */

export function PylonMobileShell() {
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

  const isActive = (to: string): boolean => pathname === to || pathname.startsWith(`${to}/`)

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'))}>
      {/* Sticky top bar — in normal flow, so pages need no offset padding. */}
      <header
        data-mol-id="mobile-top-bar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          'h-[52px] shrink-0 sticky top-0 z-40 px-2 border-b backdrop-blur-xl',
        )}
        style={{
          borderColor: PANEL_BORDER,
          backgroundColor: 'color-mix(in srgb, var(--color-surface) 92%, transparent)',
        }}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }), 'min-w-0')}>
          <button
            type="button"
            data-mol-id="mobile-nav-toggle"
            aria-label={t('mobileNav.openMenu', {}, { defaultValue: 'Open navigation menu' })}
            aria-expanded={drawerOpen}
            aria-controls="pylon-nav-drawer"
            onClick={() => setDrawerOpen(true)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'h-11 w-11 shrink-0 transition-colors',
            )}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
              menu
            </span>
          </button>
          <Link to="/workspace" data-mol-id="mobile-top-bar-brand">
            <BrandWordmark as="span" size="sm" />
          </Link>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }), 'shrink-0')}>
          <UserMenu />
        </div>
      </header>

      <main className={cm.cn(cm.flex1, 'min-w-0')}>
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
            id="pylon-nav-drawer"
            aria-label={t('pylonShell.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })}
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'absolute left-0 top-0 h-full w-[280px] max-w-[85vw] shadow-xl border-r overflow-hidden',
            )}
            style={{
              backgroundColor: SURFACE_PANEL,
              borderColor: PANEL_BORDER,
            }}
            data-mol-id="mobile-nav-drawer"
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
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'h-11 w-11 transition-colors',
                )}
                style={{ color: 'var(--color-text-secondary)' }}
                data-mol-id="mobile-nav-close"
                onClick={closeDrawer}
              >
                <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            <ul
              className={cm.cn(
                cm.flex1,
                cm.sp('p', 3),
                'space-y-1 overflow-y-auto font-mono text-sm',
              )}
            >
              {NAV_KEYS.map((item) => {
                const active = isActive(item.to)
                return (
                  <li key={item.key}>
                    <Link
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        'rounded-lg px-4 py-3',
                      )}
                      style={{
                        backgroundColor: active
                          ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)'
                          : 'transparent',
                        color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        borderLeft: `2px solid ${active ? 'var(--color-primary)' : 'transparent'}`,
                      }}
                      data-mol-id="mobile-nav-item"
                      onClick={closeDrawer}
                      to={item.to}
                      aria-current={active ? 'page' : undefined}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-base')}
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                      {t(`pylonShell.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
                    </Link>
                  </li>
                )
              })}
            </ul>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('px', 5),
                cm.sp('py', 4),
                'border-t',
              )}
              style={{ borderColor: PANEL_BORDER }}
            >
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}
