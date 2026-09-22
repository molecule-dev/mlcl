// Fleet QA mobile-shell pattern (clipboard-manager MobileNavShell / blog
// MobileTopBar): the desktop NeuronLayout renders a fixed 260px rail at every
// width, which crushes a 390px phone's content column to ~130px. Below `md`
// (768px) that chrome is not rendered at all and THIS component takes over —
// a sticky top bar (hamburger + wordmark + page CTA + user menu) and a
// slide-in nav drawer. Conditionally RENDERED via matchMedia, never
// CSS-hidden, so nav `data-mol-id`s are never duplicated in the DOM.
import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { buildNavItems } from './nav-items.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

interface MobileNavShellProps {
  title: string
  ctaLabel?: string
  ctaTo?: string
}

export function MobileNavShell({ title, ctaLabel, ctaTo }: MobileNavShellProps) {
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
  const isActive = (path: string, matcher?: (p: string) => boolean): boolean =>
    matcher ? matcher(pathname) : pathname === path

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.h('screen'), 'overflow-hidden')}>
      {/* Sticky top bar — in normal flow, so pages need no offset padding. */}
      <header
        data-mol-id="mobile-top-bar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 2 }),
          'h-[52px] shrink-0 sticky top-0 z-40 px-2 border-b border-surface/5 bg-surface-container-lowest/95 backdrop-blur-xl',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }), 'min-w-0')}>
          <button
            type="button"
            data-mol-id="mobile-nav-toggle"
            aria-label={t('mobileNav.openMenu', {}, { defaultValue: 'Open navigation menu' })}
            aria-expanded={drawerOpen}
            aria-controls="neuron-nav-drawer"
            onClick={() => setDrawerOpen(true)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'h-11 w-11 shrink-0 text-foreground-tertiary hover:bg-surface/10',
              FOCUS_RING,
            )}
          >
            <span className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')} aria-hidden>
              menu
            </span>
          </button>
          <div className="min-w-0">
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'block font-mono text-violet-400 uppercase tracking-wider truncate',
              )}
            >
              {title}
            </span>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'block font-mono text-tertiary-fixed tracking-widest',
              )}
            >
              {t(
                'sideNav.brandName',
                { appName: APP_NAME.toUpperCase() },
                { defaultValue: '{{appName}}' },
              )}
            </span>
          </div>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }), 'shrink-0')}>
          {ctaLabel && ctaTo && (
            <Link
              className={cm.cn(
                cm.sp('px', 3),
                cm.fontWeight('medium'),
                cm.textSize('xs'),
                'btn-primary-gradient h-9 inline-flex items-center rounded text-on-primary-fixed font-mono uppercase tracking-wider',
                FOCUS_RING,
              )}
              data-mol-id="mobile-top-bar-cta"
              to={ctaTo}
            >
              {ctaLabel}
            </Link>
          )}
          <UserMenu />
        </div>
      </header>

      <main className={cm.cn(cm.flex1, 'overflow-y-auto bg-surface-container p-4')}>
        <Outlet />
      </main>

      {/* Slide-in drawer + scrim */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50" data-mol-id="mobile-nav-drawer-root">
          <button
            type="button"
            aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
            className={cnScrim()}
            onClick={closeDrawer}
          />
          <nav
            id="neuron-nav-drawer"
            aria-label={t('mobileNav.primaryNav', {}, { defaultValue: 'Primary navigation' })}
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-on-tertiary-fixed dark:bg-surface-container-lowest surface contrast border-r border-outline-variant/15 shadow-xl',
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
                  cm.fontWeight('extrabold'),
                  'font-mono text-tertiary-fixed tracking-widest',
                )}
              >
                {t(
                  'sideNav.brandName',
                  { appName: APP_NAME.toUpperCase() },
                  { defaultValue: '{{appName}}' },
                )}
              </span>
              <button
                type="button"
                aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'h-11 w-11 text-foreground-tertiary hover:bg-surface/10',
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
                'space-y-1 overflow-y-auto font-mono text-sm',
              )}
            >
              {items.map((item) => (
                <li key={item.path}>
                  <Link
                    className={
                      isActive(item.path, item.matcher)
                        ? 'flex items-center rounded border-l-2 border-primary bg-surface/5 px-4 py-3 text-tertiary-fixed'
                        : 'flex items-center rounded border-l-2 border-transparent px-4 py-3 text-foreground-secondary hover:bg-surface/5 hover:text-foreground-tertiary'
                    }
                    data-mol-id="mobile-nav-item"
                    onClick={closeDrawer}
                    to={item.path}
                  >
                    <span
                      className={cm.cn(
                        cm.sp('mr', 3),
                        'material-symbols-outlined',
                        isActive(item.path, item.matcher) ? 'text-primary' : '',
                      )}
                      aria-hidden
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('px', 5),
                cm.sp('py', 4),
                'border-t border-outline-variant/15',
              )}
            >
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}

/** Full-viewport scrim button behind the drawer (closes on tap). */
function cnScrim(): string {
  return 'absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm'
}

export default MobileNavShell
