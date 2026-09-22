import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DendriteBrand, DendriteNavLinks, DendriteSideNav } from './DendriteSideNav.js'
import { UserMenu } from './UserMenu.js'

/**
 * Shell for all authenticated Dendrite screens — DendriteSideNav on the left,
 * sticky brand strip with search + UserMenu on top, scrollable canvas main.
 *
 * MOBILE (< md / 768px): the fixed sidebar is hidden and a template-local
 * mobile shell takes over — a sticky top bar (hamburger + brand + alerts +
 * UserMenu) and a slide-in drawer that reuses the exact same nav links
 * ({@link DendriteNavLinks}), so the two navigations cannot drift. The drawer
 * closes on link click, backdrop tap and Escape, and locks body scroll while
 * open.
 *
 * Translated from project-management's Dashboard top-level shell layout.
 */
export interface MindMappingLayoutProps {
  children?: ReactNode
}

export function MindMappingLayout({ children }: MindMappingLayoutProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Any route change closes the drawer (link taps, back/forward).
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, location.search])

  // While the drawer is open: lock body scroll and close on Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [menuOpen])

  const notificationsLabel = t('settings.notifications', {}, { defaultValue: 'Notifications' })

  return (
    <div
      className={cm.cn(cm.flex({}), cm.minH('screen'), 'bg-surface text-on-surface antialiased')}
    >
      <DendriteSideNav />
      <main className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }), 'min-w-0 overflow-y-auto')}>
        {/* Desktop header: search + alerts + account (hidden below md) */}
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            'hidden md:flex px-8 py-4',
            "sticky top-0 z-40 bg-surface/85 backdrop-blur-xl border-b border-outline-variant/30 font-['Inter']",
          )}
        >
          <div className={cm.cn(cm.flex1, 'max-w-2xl')}>
            <div className={cm.cn(cm.w('full'), 'relative')}>
              <span
                className={cm.cn(
                  'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60',
                )}
                aria-hidden="true"
              >
                search
              </span>
              <input
                type="search"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('pl', 10),
                  cm.sp('pr', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/30 outline-none transition-all',
                )}
                placeholder={t(
                  'layout.searchPlaceholder',
                  {},
                  { defaultValue: 'Search maps, templates, or nodes…' },
                )}
              />
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className={cm.cn(
                cm.sp('p', 2),
                'rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors',
              )}
              aria-label={notificationsLabel}
            >
              <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                notifications
              </span>
            </button>
            <UserMenu />
          </div>
        </header>

        {/* Mobile top bar: hamburger + brand + alerts + account (below md) */}
        <header
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            'flex md:hidden sticky top-0 z-40 px-3 py-2 bg-surface/95 backdrop-blur-xl border-b border-outline-variant/30',
          )}
        >
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t('layout.openMenu', {}, { defaultValue: 'Open navigation menu' })}
            aria-expanded={menuOpen}
            data-mol-id="layout-menu-button"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-11 h-11 rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            <span
              className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
              aria-hidden="true"
            >
              menu
            </span>
          </button>
          <div className="[&>a]:px-2 [&>a]:py-2 min-w-0">
            <DendriteBrand compact />
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'ml-auto')}>
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'w-11 h-11 rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-colors',
              )}
              aria-label={notificationsLabel}
            >
              <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                notifications
              </span>
            </button>
            <UserMenu />
          </div>
        </header>

        <div className={cm.cn(cm.flex1, cm.stack(8), 'p-4 md:p-8 max-w-[1440px] w-full mx-auto')}>
          {children ?? <Outlet />}
        </div>
      </main>

      {/* Mobile drawer — same nav links as the sidebar, slide-in below md */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={t('layout.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 w-full h-full bg-black/40 cursor-default"
          />
          <div
            data-mol-id="layout-drawer"
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-surface-container-lowest border-r border-outline-variant/30 shadow-xl overflow-y-auto',
            )}
          >
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <div className="[&>a]:px-3 [&>a]:py-3 min-w-0">
                <DendriteBrand compact />
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label={t('layout.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'w-11 h-11 mr-2 rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            <DendriteNavLinks onNavigate={() => setMenuOpen(false)} />
            <div className={cm.cn(cm.sp('p', 4), 'mt-auto')}>
              <button
                type="button"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                  cm.w('full'),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl shadow-lg active:scale-[0.98] transition-transform',
                )}
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/maps?new=1')
                }}
              >
                <span
                  className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                  aria-hidden="true"
                >
                  add
                </span>
                {t('nav.newMap', {}, { defaultValue: 'New map' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MindMappingLayout
