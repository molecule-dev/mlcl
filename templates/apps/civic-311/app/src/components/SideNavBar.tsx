import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { SidebarUserCard, usePanelClose } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { SettingsPanel } from './SettingsPanel.js'

/**
 * The authed shell chrome, both modes:
 *
 * - Desktop (>=768px): the fixed 240px sidebar. Pages offset their content
 *   with `md:ml-[240px]`.
 * - Mobile (<768px): a sticky top bar (hamburger + brand + the signature
 *   Report CTA) plus a slide-over drawer carrying the same nav links. The
 *   two chrome modes are conditionally RENDERED, not CSS-hidden, so nav
 *   `data-mol-id`s are never duplicated in the DOM. Drawer follows the
 *   fleet QA pattern (backdrop click / Escape / navigation all close it,
 *   background scroll locked while open).
 */

const DESKTOP_QUERY = '(min-width: 768px)'

function SideNavUserPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

const NAV_ITEMS = [
  {
    to: '/explore',
    icon: 'map',
    molId: 'side-nav-explore',
    labelKey: 'sideNavBar.navExplore',
    defaultLabel: 'Explore',
  },
  {
    to: '/my-reports',
    icon: 'fact_check',
    molId: 'side-nav-my-reports',
    labelKey: 'sideNavBar.navMyReports',
    defaultLabel: 'My reports',
  },
  {
    to: '/watch-areas',
    icon: 'notifications_active',
    molId: 'side-nav-watch-areas',
    labelKey: 'sideNavBar.navWatchAreas',
    defaultLabel: 'Watch areas',
  },
  {
    to: '/notifications',
    icon: 'notifications',
    molId: 'side-nav-notifications',
    labelKey: 'sideNavBar.navNotifications',
    defaultLabel: 'Notifications',
  },
  {
    to: '/settings',
    icon: 'settings',
    molId: 'side-nav-settings',
    labelKey: 'nav.settings',
    defaultLabel: 'Settings',
  },
] as const

function NavLink({
  to,
  icon,
  label,
  molId,
  onNavigate,
}: {
  to: string
  icon: string
  label: string
  molId: string
  onNavigate?: () => void
}) {
  const cm = getClassMap()
  const location = useLocation()
  const active =
    to === '/'
      ? location.pathname === to
      : location.pathname === to || location.pathname.startsWith(to + '/')
  return (
    <Link
      data-mol-id={molId}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 3 }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        'transition-colors duration-200',
        active
          ? cm.cn(
              cm.textPrimary,
              cm.fontWeight('bold'),
              'border-r-2 border-primary hover:bg-border/50 scale-[0.98]',
            )
          : 'text-foreground-secondary hover:text-foreground hover:bg-border/50',
      )}
      to={to}
      onClick={onNavigate}
    >
      <span className={cm.cn('material-symbols-outlined')} data-icon={icon}>
        {icon}
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('medium'),
          cm.textSize('sm'),
          "font-['Inter'] tracking-tight",
        )}
      >
        {label}
      </span>
    </Link>
  )
}

/** Live breakpoint check — SSR-safe default is desktop (no chrome flash). */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window === 'undefined' || window.matchMedia(DESKTOP_QUERY).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

function useReportCtaClass(): string {
  const cm = getClassMap()
  return cm.cn(
    cm.flex({ align: 'center', justify: 'center', gap: 2 }),
    cm.sp('mb', 6),
    cm.sp('px', 4),
    'rounded-lg py-3 font-semibold text-sm transition-colors',
    'bg-[var(--color-nav-cta)] text-[var(--color-on-nav-cta)] hover:bg-[var(--color-nav-cta-hover)]',
  )
}

export function SideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isDesktop = useIsDesktop()
  const location = useLocation()
  const reportCtaClass = useReportCtaClass()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  // Follow the breakpoint live: growing back to desktop force-closes the
  // drawer so the overlay can never strand over the sidebar.
  useEffect(() => {
    if (isDesktop) setDrawerOpen(false)
  }, [isDesktop])

  // Any navigation closes the drawer.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // While the drawer is open: Escape closes it and background scroll is locked.
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

  if (isDesktop) {
    return (
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('py', 8),
          cm.sp('px', 4),
          'h-screen w-[240px] fixed left-0 top-0 border-r-0 bg-surface-secondary z-50',
        )}
      >
        <div
          className={cm.cn(cm.sp('mb', 8), cm.sp('px', 4), cm.flex({ direction: 'col', gap: 1 }))}
        >
          <h1 className={cm.cn(cm.textSize('2xl'), cm.textPrimary, 'font-black tracking-tighter')}>
            {t('sideNavBar.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-foreground-secondary tracking-tight uppercase',
            )}
          >
            {t('sideNavBar.productTagline', {}, { defaultValue: 'Riverton 311' })}
          </p>
        </div>
        {/* The signature action: always one click away. */}
        <Link data-mol-id="side-nav-report-cta" to="/report" className={reportCtaClass}>
          <span className="material-symbols-outlined" aria-hidden>
            add_location_alt
          </span>
          {t('sideNavBar.reportIssue', {}, { defaultValue: 'Report an issue' })}
        </Link>
        <nav className={cm.cn(cm.flex1, cm.stack(2))}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.molId}
              to={item.to}
              icon={item.icon}
              molId={item.molId}
              label={t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
            />
          ))}
        </nav>
        {/* Signed-in user card — opens the settings drawer (identity, settings, sign out). */}
        <div className={cm.cn(cm.sp('pt', 2), 'mt-auto')}>
          <SidebarUserCard>
            <SideNavUserPanel />
          </SidebarUserCard>
        </div>
      </aside>
    )
  }

  return (
    <>
      {/* Mobile top bar — sticky, full-width, carries the signature CTA. */}
      <header
        data-mol-id="mobile-top-bar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 2 }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          'sticky top-0 z-40 bg-surface-secondary border-b border-outline-variant/40',
        )}
      >
        <button
          type="button"
          data-mol-id="mobile-nav-toggle"
          aria-label={t('sideNavBar.openMenu', {}, { defaultValue: 'Open navigation menu' })}
          aria-expanded={drawerOpen}
          aria-controls="mobile-nav-drawer"
          onClick={() => setDrawerOpen(true)}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-11 w-11 rounded-lg text-foreground hover:bg-border/50',
          )}
        >
          <span className="material-symbols-outlined" aria-hidden>
            menu
          </span>
        </button>
        <Link
          to="/explore"
          className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), 'min-w-0')}
        >
          <span className={cm.cn(cm.textSize('lg'), cm.textPrimary, 'font-black tracking-tighter')}>
            {t('sideNavBar.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-foreground-secondary tracking-tight uppercase',
            )}
          >
            {t('sideNavBar.productTagline', {}, { defaultValue: 'Riverton 311' })}
          </span>
        </Link>
        <Link
          data-mol-id="side-nav-report-cta"
          to="/report"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 1 }),
            cm.sp('px', 3),
            'rounded-lg py-2 text-xs font-semibold transition-colors shrink-0',
            'bg-[var(--color-nav-cta)] text-[var(--color-on-nav-cta)]',
          )}
        >
          <span className="material-symbols-outlined" aria-hidden>
            add_location_alt
          </span>
          {t('sideNavBar.reportShort', {}, { defaultValue: 'Report' })}
        </Link>
      </header>

      {/* Mobile drawer: backdrop + slide-over panel with the same nav links. */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label={t('sideNavBar.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
            onClick={closeDrawer}
            className="absolute inset-0 w-full h-full bg-black/40 cursor-default"
          />
          <div
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t('sideNavBar.menuLabel', {}, { defaultValue: 'Navigation' })}
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'absolute top-0 left-0 bottom-0 w-[280px] max-w-[85vw] bg-surface-secondary shadow-xl overflow-y-auto',
              cm.sp('py', 6),
              cm.sp('px', 4),
            )}
          >
            <div className={cm.cn(cm.sp('mb', 6), cm.sp('px', 2))}>
              <h1
                className={cm.cn(cm.textSize('2xl'), cm.textPrimary, 'font-black tracking-tighter')}
              >
                {t('sideNavBar.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'text-foreground-secondary tracking-tight uppercase',
                )}
              >
                {t('sideNavBar.productTagline', {}, { defaultValue: 'Riverton 311' })}
              </p>
            </div>
            <nav className={cm.cn(cm.flex1, cm.stack(2))}>
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.molId}
                  to={item.to}
                  icon={item.icon}
                  molId={item.molId}
                  label={t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
                  onNavigate={closeDrawer}
                />
              ))}
            </nav>
            <div className={cm.cn(cm.sp('pt', 2), 'mt-auto')}>
              <SidebarUserCard>
                <SideNavUserPanel />
              </SidebarUserCard>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
export default SideNavBar
