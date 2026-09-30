import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Sidebar + top bar shell shared by all authed Embark screens.
 *
 * Translated from crm/AppLayout.tsx + DashboardSideNavBar.tsx — sidebar nav with
 * primary/accent active rail, top bar with greeting + user menu. Embark teal/purple
 * palette and Material Symbols glyphs throughout.
 *
 * Mobile (≤768px): the sidebar becomes a slide-in drawer (hamburger in the top
 * bar, overlay, Escape + route-change close) and the global search input is
 * hidden — the Team directory page carries its own search. Follows the fleet
 * mobile-shell pattern from crm/CrmLayout.tsx.
 */

interface NavItem {
  to: string
  iconKey: string
  labelKey: string
  defaultLabel: string
}

const NAV_PRIMARY: NavItem[] = [
  {
    to: '/dashboard',
    iconKey: 'space_dashboard',
    labelKey: 'nav.dashboard',
    defaultLabel: 'Dashboard',
  },
  { to: '/checklist', iconKey: 'checklist', labelKey: 'nav.checklist', defaultLabel: 'Checklist' },
  { to: '/timeline', iconKey: 'timeline', labelKey: 'nav.timeline', defaultLabel: '30/60/90' },
  { to: '/training', iconKey: 'school', labelKey: 'nav.training', defaultLabel: 'Training' },
  {
    to: '/documents',
    iconKey: 'description',
    labelKey: 'nav.documents',
    defaultLabel: 'Documents',
  },
]

const NAV_PEOPLE: NavItem[] = [
  { to: '/team', iconKey: 'groups', labelKey: 'nav.team', defaultLabel: 'Team' },
  { to: '/profile', iconKey: 'person', labelKey: 'nav.profile', defaultLabel: 'My Profile' },
  {
    to: '/notifications',
    iconKey: 'notifications',
    labelKey: 'nav.notifications',
    defaultLabel: 'Notifications',
  },
  { to: '/settings', iconKey: 'settings', labelKey: 'nav.settings', defaultLabel: 'Settings' },
]

const MOBILE_MQ = '(max-width: 768px)'

function NavSection({
  cm,
  t,
  heading,
  items,
  onNavigate,
}: {
  cm: ReturnType<typeof getClassMap>
  t: ReturnType<typeof useTranslation>['t']
  heading: string
  items: NavItem[]
  onNavigate: () => void
}) {
  return (
    <div className={cm.sp('mb', 6)}>
      <p
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('mb', 2),
          'text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant',
        )}
      >
        {heading}
      </p>
      <ul className={cm.cn(cm.flex({ direction: 'col' }), cm.sp('px', 2))}>
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/10 text-primary border-l-[3px] border-primary'
                    : 'text-on-surface hover:bg-surface-container-low',
                )
              }
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                {item.iconKey}
              </span>
              <span>{t(item.labelKey, {}, { defaultValue: item.defaultLabel })}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function EmployeeOnboardingLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
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

  return (
    <div
      className={cm.cn(cm.flex(), cm.minH('screen'), 'bg-background text-on-surface antialiased')}
    >
      {/* Mobile overlay */}
      {isMobile && drawerOpen && (
        <div
          role="presentation"
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

      {/* Sidebar */}
      <aside
        data-mol-id="layout-sidebar"
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'bg-surface border-r border-outline-variant',
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
            : {}),
        }}
      >
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('px', 5), cm.sp('py', 5))}
        >
          <div>
            <BrandWordmark as="span" />
            <p className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
              {t('layout.tagline', {}, { defaultValue: APP_TAGLINE })}
            </p>
          </div>
        </div>
        <nav className={cm.cn(cm.flex1, cm.sp('py', 4))}>
          <NavSection
            cm={cm}
            t={t}
            heading={t('layout.section.onboarding', {}, { defaultValue: 'Onboarding' })}
            items={NAV_PRIMARY}
            onNavigate={closeDrawer}
          />
          <NavSection
            cm={cm}
            t={t}
            heading={t('nav.you', {}, { defaultValue: 'You' })}
            items={NAV_PEOPLE}
            onNavigate={closeDrawer}
          />
        </nav>
      </aside>

      {/* Main column */}
      <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1)} style={{ minWidth: 0 }}>
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 8),
            'bg-surface border-b border-outline-variant',
          )}
          style={{
            height: '64px',
            flexShrink: 0,
            ...(isMobile ? { padding: '0 12px' } : {}),
          }}
        >
          {isMobile && (
            <button
              type="button"
              data-mol-id="layout-menu-toggle"
              aria-label={t('layout.openMenu', {}, { defaultValue: 'Open navigation menu' })}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'border-0 bg-transparent text-on-surface hover:text-primary cursor-pointer',
              )}
              style={{ width: '40px', height: '40px', flexShrink: 0 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                menu
              </span>
            </button>
          )}
          {!isMobile && (
            <form
              className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
              role="search"
              onSubmit={(e) => {
                e.preventDefault()
                const q = new FormData(e.currentTarget).get('q')
                if (typeof q === 'string' && q.trim()) {
                  navigate(`/team?q=${encodeURIComponent(q.trim())}`)
                  e.currentTarget.reset()
                }
              }}
            >
              <span
                className="material-symbols-outlined text-on-surface-variant"
                style={{ fontSize: '20px' }}
              >
                search
              </span>
              <input
                type="search"
                name="q"
                data-mol-id="layout-search-input"
                placeholder={t(
                  'layout.searchTeammates',
                  {},
                  { defaultValue: 'Search teammates by name or role…' },
                )}
                className="bg-transparent outline-none"
                style={{ width: '320px' }}
              />
            </form>
          )}
          {/* Top-bar controls — styled so they don't read as bare browser
              controls bolted onto the chrome. */}
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <div className="text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container">
              <ThemeToggle />
            </div>
            <div className="text-on-surface-variant hover:text-on-surface transition-colors">
              <UserMenu />
            </div>
          </div>
        </header>

        <main
          className={cm.cn(cm.flex1, 'eo-page-pad')}
          style={{ overflowY: 'auto', minHeight: 0 }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
