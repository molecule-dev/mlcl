/**
 * Discussion Boards layout — sidebar + content shell used by every
 * authenticated route. Sidebar holds primary navigation (Categories,
 * Compose, Bookmarks, Notifications, Search, Settings) plus the
 * Moderation Queue link for moderators. Top of the shell uses the
 * shared @molecule/app-header-react chrome and the shared Footer.
 *
 * Mobile shell (below 768px): the sidebar is hidden and replaced by a
 * hamburger button in the shared header (via its `extraActions` slot)
 * that opens a slide-in drawer with the same links — the permanent
 * 260px column would crush 390px content. Route changes, Escape, and
 * backdrop taps all collapse the drawer; CSS `hidden`/`md:block` keeps
 * exactly one nav in the accessibility tree per viewport.
 *
 * Translated from blog's BlogLayout (sidebar + main + chrome) but
 * routed through getClassMap helpers + brand tokens (no inline styles).
 */
import { type ReactElement, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { AppShellLayout } from '@molecule/app-shell-layout-react'
import { getClassMap } from '@molecule/app-ui'

import { Footer } from './Footer.js'
import { Header } from './Header.js'

interface NavItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
  end?: boolean
}

const PRIMARY_NAV: NavItem[] = [
  {
    to: '/c',
    icon: 'dashboard',
    labelKey: 'nav.categories',
    defaultLabel: 'Categories',
    end: true,
  },
  { to: '/compose', icon: 'edit_note', labelKey: 'nav.compose', defaultLabel: 'New thread' },
  { to: '/search', icon: 'search', labelKey: 'nav.search', defaultLabel: 'Search' },
  { to: '/bookmarks', icon: 'bookmark', labelKey: 'nav.bookmarks', defaultLabel: 'Bookmarks' },
  {
    to: '/notifications',
    icon: 'notifications',
    labelKey: 'nav.notifications',
    defaultLabel: 'Notifications',
  },
]

const SECONDARY_NAV: NavItem[] = [
  {
    to: '/moderation',
    icon: 'gavel',
    labelKey: 'nav.moderation',
    defaultLabel: 'Moderation queue',
  },
  { to: '/settings', icon: 'settings', labelKey: 'nav.settings', defaultLabel: 'Settings' },
]

export function DiscussionBoardsLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Route changes always collapse the drawer — navigation must never leave a
  // full-screen panel open over the page the user just navigated to.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Escape closes the drawer (keyboard users must not be trapped behind it).
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const navAriaLabel = t('nav.primaryNavLabel', {}, { defaultValue: 'Forum navigation' })
  const openMenuLabel = t('nav.openMenu', {}, { defaultValue: 'Open navigation menu' })
  const closeMenuLabel = t('nav.closeMenu', {}, { defaultValue: 'Close navigation menu' })
  const browseLabel = t('nav.browseHeader', {}, { defaultValue: 'Browse' })
  const manageLabel = t('common.manage', {}, { defaultValue: 'Manage' })

  const renderNavItems = (items: NavItem[], onNavigate?: () => void): ReactElement => (
    <>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.fontWeight(isActive ? 'bold' : 'medium'),
              'rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
            )
          }
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            {item.icon}
          </span>
          {t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
        </NavLink>
      ))}
    </>
  )

  // Mobile hamburger lives in the shared header (hidden ≥768px, where the
  // sidebar takes over) so it is only in the a11y tree on small screens.
  const mobileNavButton: ReactElement = (
    <button
      type="button"
      data-mol-id="button-mobile-nav"
      aria-label={drawerOpen ? closeMenuLabel : openMenuLabel}
      aria-expanded={drawerOpen}
      aria-controls="stoa-mobile-drawer"
      onClick={() => setDrawerOpen((open) => !open)}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        'h-10 w-10 shrink-0 rounded-md hover:bg-surface-container md:hidden',
      )}
    >
      <span className="material-symbols-outlined" aria-hidden>
        {drawerOpen ? 'close' : 'menu'}
      </span>
    </button>
  )

  return (
    <AppShellLayout header={<Header extraActions={mobileNavButton} />} footer={<Footer />}>
      {drawerOpen ? (
        <div
          role="presentation"
          data-mol-id="mobile-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      ) : null}
      {drawerOpen ? (
        <div
          id="stoa-mobile-drawer"
          data-mol-id="mobile-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={navAriaLabel}
          className={cm.cn(
            cm.surface,
            'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] overflow-y-auto p-4 shadow-xl md:hidden',
          )}
          style={{ animation: 'stoa-drawer-in 160ms ease-out' }}
        >
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mb-4')}>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                'tracking-tight text-on-surface',
              )}
            >
              {t('nav.drawerTitle', {}, { defaultValue: 'Menu' })}
            </p>
            <button
              type="button"
              aria-label={closeMenuLabel}
              onClick={() => setDrawerOpen(false)}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'h-10 w-10 rounded-md hover:bg-surface-container',
              )}
            >
              <span className="material-symbols-outlined" aria-hidden>
                close
              </span>
            </button>
          </div>
          <nav className={cm.cn(cm.stack(1), 'mb-6')} aria-label={navAriaLabel}>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('px', 3),
                cm.sp('mb', 2),
                'text-[10px] uppercase tracking-[0.25em] text-on-surface-variant',
              )}
            >
              {browseLabel}
            </p>
            {renderNavItems(PRIMARY_NAV, () => setDrawerOpen(false))}
          </nav>
          <nav className={cm.cn(cm.stack(1), 'border-t border-outline-variant/30 pt-4')}>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('px', 3),
                cm.sp('mb', 2),
                'text-[10px] uppercase tracking-[0.25em] text-on-surface-variant',
              )}
            >
              {manageLabel}
            </p>
            {renderNavItems(SECONDARY_NAV, () => setDrawerOpen(false))}
          </nav>
        </div>
      ) : null}
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'mx-auto w-full max-w-[1200px] gap-8 px-4 py-8 md:flex-row md:items-start md:px-8',
        )}
      >
        <aside
          className={cm.cn(cm.stack(6), 'hidden shrink-0 md:sticky md:top-8 md:block md:w-[260px]')}
        >
          <nav className={cm.cn(cm.stack(1))} aria-label={navAriaLabel}>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('px', 3),
                cm.sp('mb', 2),
                'text-[10px] uppercase tracking-[0.25em] text-on-surface-variant',
              )}
            >
              {browseLabel}
            </p>
            {renderNavItems(PRIMARY_NAV)}
          </nav>
          <div className={cm.cn(cm.stack(1), 'border-t border-outline-variant/30 pt-4')}>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('px', 3),
                cm.sp('mb', 2),
                'text-[10px] uppercase tracking-[0.25em] text-on-surface-variant',
              )}
            >
              {manageLabel}
            </p>
            {renderNavItems(SECONDARY_NAV)}
          </div>
          <div
            className={cm.cn(
              cm.sp('p', 4),
              cm.stack(2),
              'rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/15',
            )}
          >
            <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-primary')}>
              {t('nav.communityGuidelinesTitle', {}, { defaultValue: 'Community guidelines' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'nav.communityGuidelinesBody',
                {},
                {
                  defaultValue:
                    'Be considered. Quote sources. Mark solutions. Lift the conversation.',
                },
              )}
            </p>
          </div>
        </aside>
        <div className={cm.cn(cm.flex1, cm.stack(8), 'min-w-0')}>
          <Outlet />
        </div>
      </div>
    </AppShellLayout>
  )
}

export default DiscussionBoardsLayout
