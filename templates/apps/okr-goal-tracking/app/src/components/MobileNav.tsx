import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { NAV_SECTIONS } from './navSections.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Mobile app chrome (rendered ONLY below the `md` breakpoint — 768px, via
 * `useIsMobile` in DashboardLayout). The desktop shell renders the fixed
 * AscentSideNav (260px rail), which would crush a phone's content column.
 * Below `md` this component takes over: a sticky top bar (hamburger +
 * wordmark + notifications + theme + user menu) and a slide-in nav drawer
 * carrying the same sections as the desktop rail. Fleet QA mobile-shell
 * pattern (blog/MobileTopBar.tsx): conditionally RENDERED via matchMedia,
 * not CSS-hidden, so nav landmarks are never duplicated in the DOM.
 */
export function MobileNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

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

  const focusRing =
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400'

  return (
    <>
      {/* Sticky top bar — in normal flow, so pages need no offset padding. */}
      <header
        data-mol-id="mobile-topbar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          cm.sp('px', 2),
          cm.sp('py', 2),
          'sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-outline-variant/40',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}>
          <button
            type="button"
            data-mol-id="nav-toggle"
            aria-label={t('mobileNav.openMenu', {}, { defaultValue: 'Open navigation menu' })}
            aria-expanded={drawerOpen}
            aria-controls="ascent-nav-drawer"
            onClick={() => setDrawerOpen(true)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'h-11 w-11 shrink-0 text-on-surface hover:bg-surface-container',
              focusRing,
            )}
          >
            <span className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')} aria-hidden>
              menu
            </span>
          </button>
          <Link
            to="/dashboard"
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0', focusRing, cm.roundedFull)}
          >
            <span
              aria-hidden
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'w-9 h-9 rounded-xl shrink-0 bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/30',
              )}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                arrow_upward
              </span>
            </span>
            <span
              className={cm.cn(
                cm.textSize('lg'),
                'font-extrabold tracking-tight text-on-surface truncate',
              )}
            >
              {APP_NAME}
            </span>
          </Link>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'shrink-0')}>
          <button
            type="button"
            aria-label={t('ascentSideNav.nav.notifications', {}, { defaultValue: 'Notifications' })}
            onClick={() => navigate('/notifications')}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'h-11 w-11 text-on-surface hover:bg-surface-container',
              focusRing,
            )}
          >
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')} aria-hidden>
              notifications
            </span>
          </button>
          <ThemeToggle />
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
            aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
            onClick={closeDrawer}
            className="absolute inset-0 h-full w-full cursor-default bg-black/40"
          />
          <div
            id="ascent-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t('mobileNav.mainNavigation', {}, { defaultValue: 'Main navigation' })}
            data-mol-id="mobile-nav-drawer"
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto text-primary-light p-4',
            )}
            style={{ backgroundColor: 'var(--color-nav-bg)' }}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('mb', 6),
              )}
            >
              <span className={cm.flex({ direction: 'col' })}>
                <span
                  className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-white')}
                >
                  {APP_NAME}
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-indigo-300/70 font-bold">
                  {APP_TAGLINE}
                </span>
              </span>
              <button
                type="button"
                aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
                onClick={closeDrawer}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'h-11 w-11 text-indigo-100 hover:bg-surface/10',
                  focusRing,
                )}
              >
                <span className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')} aria-hidden>
                  close
                </span>
              </button>
            </div>

            <nav aria-label={t('mobileNav.mainNavigation', {}, { defaultValue: 'Main navigation' })} className={cm.cn(cm.flex1, cm.stack(5), 'overflow-y-auto')}>
              {NAV_SECTIONS.map((section) => (
                <div key={section.key} className={cm.stack(1)}>
                  <p
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-[0.18em] text-indigo-400 px-3 mb-1',
                    )}
                  >
                    {t(
                      `ascentSideNav.section.${section.key}` as 'ascentSideNav.section.overview',
                      {},
                      { defaultValue: section.defaultLabel },
                    )}
                  </p>
                  {section.items.map((item) => {
                    const active = pathname === item.to || pathname.startsWith(item.to + '/')
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={closeDrawer}
                        aria-current={active ? 'page' : undefined}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'sm' }),
                          cm.sp('px', 3),
                          'min-h-[44px] py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                          active
                            ? 'bg-indigo-500/20 text-white shadow-inner'
                            : 'text-indigo-100/80 hover:bg-surface/10 hover:text-white',
                          focusRing,
                        )}
                      >
                        <span
                          className={cm.cn(
                            'material-symbols-outlined text-[20px]',
                            active && 'text-sky-300',
                          )}
                          style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                        >
                          {item.icon}
                        </span>
                        <span className="truncate">
                          {t(
                            `ascentSideNav.nav.${item.labelKey}` as 'ascentSideNav.nav.dashboard',
                            {},
                            { defaultValue: item.defaultLabel },
                          )}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              ))}
            </nav>

            <div className={cm.sp('pt', 4)}>
              <Link
                to="/objectives/new"
                onClick={closeDrawer}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  'min-h-[44px] w-full font-bold text-sm rounded-xl text-white bg-gradient-to-br from-indigo-500 to-sky-500 shadow-lg shadow-indigo-500/30 active:scale-[0.99] transition-transform',
                  focusRing,
                )}
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                {t('ascentSideNav.newObjective', {}, { defaultValue: 'New objective' })}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
