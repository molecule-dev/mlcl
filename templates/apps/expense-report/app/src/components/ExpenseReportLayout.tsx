import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from './Footer.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Shell layout for all auth'd Recoup pages.
 *
 * Translated from crm/CrmLayout.tsx — sidebar + main column with sticky topbar.
 * Sidebar uses Recoup's primary teal accent for the active nav item, mirroring
 * the §13.7 brand-mark treatment used on auth pages.
 *
 * Mobile (≤768px): the fixed sidebar becomes a slide-in drawer — hamburger in
 * the sticky top bar, dimmed overlay, Escape + route-change close — following
 * the fleet mobile-shell pattern (employee-onboarding/EmployeeOnboardingLayout).
 */
const NAV_ITEMS = [
  {
    to: '/dashboard',
    icon: 'space_dashboard',
    key: 'nav.dashboard',
    fallback: 'Dashboard',
    end: true,
  },
  { to: '/expenses', icon: 'receipt_long', key: 'nav.expenses', fallback: 'Expenses', end: false },
  { to: '/reports', icon: 'description', key: 'nav.reports', fallback: 'Reports', end: false },
  {
    to: '/reports/list',
    icon: 'folder_open',
    key: 'nav.reportsList',
    fallback: 'Report Library',
    end: false,
  },
  {
    to: '/approvals',
    icon: 'approval',
    key: 'nav.approvals',
    fallback: 'Approvals',
    end: false,
  },
  {
    to: '/notifications',
    icon: 'notifications',
    key: 'nav.notifications',
    fallback: 'Activity',
    end: false,
  },
] as const

const MOBILE_MQ = '(max-width: 768px)'

export function ExpenseReportLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const [isMobile, setIsMobile] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
      if (!e.matches) setDrawerOpen(false)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Any route change closes the mobile drawer.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Escape closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  const closeDrawer = () => setDrawerOpen(false)

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 3),
      'py-2.5',
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      'rounded-xl transition-colors',
      isActive
        ? 'bg-primary-container text-on-primary-container font-bold'
        : 'text-on-surface-variant hover:bg-surface-container-low',
    )

  return (
    <div
      data-mol-id="recoup-layout"
      className={cm.cn(cm.flex(), cm.minH('screen'), 'bg-surface-container-low text-on-surface')}
    >
      {/* Mobile drawer overlay */}
      {isMobile && drawerOpen && (
        <div
          role="presentation"
          data-mol-id="recoup-drawer-overlay"
          onClick={closeDrawer}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            zIndex: 40,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <aside
        data-mol-id="recoup-sidebar"
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('px', 4),
          cm.sp('py', 6),
          'bg-surface',
        )}
        style={{
          width: '260px',
          flexShrink: 0,
          ...(isMobile
            ? {
                position: 'fixed',
                top: 0,
                bottom: 0,
                left: drawerOpen ? 0 : '-280px',
                zIndex: 50,
                transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: drawerOpen ? '8px 0 24px rgba(15, 23, 42, 0.2)' : 'none',
                overflowY: 'auto',
              }
            : {
                position: 'sticky',
                top: 0,
                height: '100vh',
                borderRight: '1px solid rgba(0,0,0,0.08)',
              }),
        }}
      >
        <NavLink
          to="/dashboard"
          onClick={closeDrawer}
          className={cm.cn(cm.sp('px', 3), cm.sp('mb', 8), 'block')}
          data-mol-id="sidebar-brand"
        >
          <div
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'tracking-tight font-extrabold',
            )}
            style={{ color: 'var(--color-primary-hover)' }}
          >
            {APP_NAME}
          </div>
          <div
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('app.tagline', {}, { defaultValue: APP_TAGLINE })}
          </div>
        </NavLink>

        <nav className={cm.cn(cm.stack(1), cm.flex1)}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeDrawer}
              data-mol-id={`nav-${item.to.replace(/\//g, '-').slice(1)}`}
              className={navLinkClass}
            >
              <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                {item.icon}
              </span>
              <span>{t(item.key, {}, { defaultValue: item.fallback })}</span>
            </NavLink>
          ))}
        </nav>

        <NavLink
          to="/settings"
          onClick={closeDrawer}
          data-mol-id="nav-settings"
          className={({ isActive }) => cm.cn(navLinkClass({ isActive }), 'mt-auto')}
        >
          <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
            settings
          </span>
          <span>{t('nav.settings', {}, { defaultValue: 'Settings' })}</span>
        </NavLink>
      </aside>

      <div className={cm.cn('flex flex-col flex-1 min-w-0 w-full')}>
        <header
          data-mol-id="recoup-topbar"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 8),
            'sticky top-0 z-30 h-14 border-b border-outline-variant/40 bg-surface/80 backdrop-blur-md',
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            {isMobile ? (
              <button
                type="button"
                data-mol-id="recoup-menu-toggle"
                aria-label={t('layout.openMenu', {}, { defaultValue: 'Open navigation menu' })}
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen(true)}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'border-0 bg-transparent text-on-surface hover:text-primary cursor-pointer',
                )}
                style={{ width: '40px', height: '40px', flexShrink: 0, marginLeft: '-8px' }}
              >
                <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
                  menu
                </span>
              </button>
            ) : null}
            <div
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('layout.workspace', {}, { defaultValue: 'Finance Workspace' })}
            </div>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main
          className={cm.cn(
            cm.flex1,
            cm.sp('px', 8),
            cm.sp('py', 8),
            'overflow-x-hidden max-md:px-4 max-md:py-5',
          )}
        >
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}
