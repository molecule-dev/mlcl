import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { useAuth, useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

const NAV_ITEMS = [
  { to: '/', label: 'nav.dashboard', icon: 'dashboard', defaultLabel: 'Dashboard', end: true },
  { to: '/contacts', label: 'nav.contacts', icon: 'person', defaultLabel: 'Contacts', end: false },
  {
    to: '/companies',
    label: 'nav.companies',
    icon: 'domain',
    defaultLabel: 'Companies',
    end: false,
  },
  { to: '/deals', label: 'nav.deals', icon: 'handshake', defaultLabel: 'Deals', end: false },
  {
    to: '/activities',
    label: 'nav.activities',
    icon: 'schedule',
    defaultLabel: 'Activities',
    end: false,
  },
  { to: '/reports', label: 'nav.reports', icon: 'bar_chart', defaultLabel: 'Reports', end: false },
]

function LoadingSpinner({ cm }: { cm: ReturnType<typeof getClassMap> }) {
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.w('full'),
        cm.h('screen'),
      )}
    >
      <div
        className={cm.cn(cm.spinner({ size: 'xl' }))}
        style={{ color: 'var(--color-primary-container)' }}
      />
    </div>
  )
}

export function CrmLayout() {
  const { t } = useTranslation()
  const { mode } = useTheme()
  const { user } = useAuth()
  const cm = getClassMap()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!sidebarOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [sidebarOpen])

  // Show loading spinner while mounting to prevent hydration/flash issues
  if (!mounted) {
    return <LoadingSpinner cm={cm} />
  }

  // Get user display name safely
  const userName = (user as Record<string, unknown> | undefined)?.name as string | undefined
  const userInitial = (userName ?? '?')[0].toUpperCase()

  return (
    <div
      data-mol-id="crm-layout"
      data-theme={mode}
      className={cm.flex({})}
      style={{
        height: '100vh',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
        backgroundColor: 'var(--mol-color-background-secondary)',
        color: 'var(--mol-color-text)',
      }}
    >
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          role="presentation"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 40,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        data-mol-id="crm-sidebar"
        style={{
          width: '260px',
          minWidth: '260px',
          height: '100vh',
          backgroundColor: 'var(--mol-color-background)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
          flexShrink: 0,
          overflowY: 'auto',
          ...(isMobile
            ? {
                position: 'fixed',
                top: 0,
                left: sidebarOpen ? 0 : '-280px',
                zIndex: 50,
                transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: sidebarOpen ? '8px 0 24px rgba(0,0,0,0.2)' : 'none',
              }
            : {}),
        }}
      >
        {/* Brand */}
        <div
          className={cm.cn(cm.flex({ align: 'center' }))}
          style={{ gap: '12px', marginBottom: '40px', padding: '0 8px' }}
        >
          <BrandWordmark size="sm" />
          <div>
            <span
              // outline (#94a3b8) was 2.56:1 on white (axe serious) — use the muted-text token
              style={{
                fontSize: '11px',
                color: 'var(--color-on-surface-variant)',
                lineHeight: '16px',
              }}
            >
              {t('app.subtitle', {}, { defaultValue: 'Enterprise Workspace' })}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav
          data-mol-id="crm-nav"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-mol-id={`nav-${item.label.split('.')[1]}`}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                // primary #2563eb was 4.23:1 on primary-light #dbeafe (axe serious); primary-dark = 5.5:1
                color: isActive
                  ? 'var(--mol-color-primary-dark)'
                  : 'var(--mol-color-text-secondary)',
                backgroundColor: isActive ? 'var(--mol-color-primary-light)' : 'transparent',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: 'Inter, sans-serif',
                textDecoration: 'none',
                letterSpacing: '-0.01em',
                transition: 'all 150ms ease',
              })}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cm.fv5b245ffa}
                    style={{
                      fontSize: '20px',
                      fontVariationSettings: isActive ? "'FILL' 1" : undefined,
                    }}
                  >
                    {item.icon}
                  </span>
                  <span>{t(item.label, {}, { defaultValue: item.defaultLabel })}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <NavLink
            to="/settings"
            data-mol-id="nav-settings"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              // primary #2563eb was 4.23:1 on primary-light #dbeafe (axe serious); primary-dark = 5.5:1
              color: isActive ? 'var(--mol-color-primary-dark)' : 'var(--mol-color-text-secondary)',
              backgroundColor: isActive ? 'var(--mol-color-primary-light)' : 'transparent',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 500,
              fontFamily: 'Inter, sans-serif',
              textDecoration: 'none',
              transition: 'all 150ms ease',
            })}
          >
            {({ isActive }) => (
              <>
                <span
                  className={cm.fv5b245ffa}
                  style={{
                    fontSize: '20px',
                    fontVariationSettings: isActive ? "'FILL' 1" : undefined,
                  }}
                >
                  settings
                </span>
                <span>{t('nav.settings', {}, { defaultValue: 'Settings' })}</span>
              </>
            )}
          </NavLink>

          {/* User profile */}
          <div
            data-mol-id="sidebar-user-profile"
            className={cm.cn(cm.flex({ align: 'center' }))}
            style={{ gap: '12px', padding: '10px 16px', marginTop: '8px' }}
          >
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9999px',
                backgroundColor: 'var(--color-primary-container)',
                // on-error (white) on primary-container #dbeafe was 1.22:1 (axe serious);
                // on-primary-container is the matching M3 pair (12.4:1)
                color: 'var(--color-on-primary-container)',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                flexShrink: 0,
              }}
            >
              {userInitial}
            </div>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--mol-color-text)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {userName ?? t('nav.user', {}, { defaultValue: 'User' })}
            </span>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <header
          data-mol-id="crm-topbar"
          className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}
          style={{
            width: '100%',
            height: '56px',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            backgroundColor: 'var(--mol-color-background-secondary)',
            backdropFilter: 'blur(12px)',
            padding: '0 32px',
            borderBottom: '1px solid var(--mol-color-border)',
            flexShrink: 0,
          }}
        >
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={t('topbar.toggleMenu', {}, { defaultValue: 'Toggle menu' })}
              data-mol-id="btn-menu-toggle"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                color: 'var(--mol-color-text-secondary)',
                display: 'flex',
                marginRight: '8px',
              }}
            >
              <span className={cm.fv5b245ffa}>menu</span>
            </button>
          )}

          {/* Search — submits to the Companies list when browsing companies, else Contacts */}
          <form
            role="search"
            className={cm.cn(cm.flex({ align: 'center' }))}
            style={{ flex: 1, maxWidth: '36rem' }}
            onSubmit={(e) => {
              e.preventDefault()
              const q = searchQuery.trim()
              const base = location.pathname.startsWith('/companies') ? '/companies' : '/contacts'
              navigate(q ? `${base}?q=${encodeURIComponent(q)}` : base)
            }}
          >
            <div style={{ position: 'relative', width: '100%' }}>
              <span
                className={cm.fv5b245ffa}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-stage-lead)',
                  fontSize: '18px',
                  pointerEvents: 'none',
                }}
              >
                search
              </span>
              <input
                data-mol-id="crm-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(
                  'search.placeholder',
                  {},
                  { defaultValue: 'Search contacts or companies...' },
                )}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--mol-color-background-tertiary)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '8px 16px 8px 40px',
                  fontSize: '14px',
                  fontWeight: 400,
                  lineHeight: '20px',
                  fontFamily: 'Inter, sans-serif',
                  color: 'var(--mol-color-text)',
                  outline: 'none',
                }}
              />
            </div>
          </form>

          {/* Actions */}
          <div className={cm.cn(cm.flex({ align: 'center' }))} style={{ gap: '16px' }}>
            <button
              data-mol-id="btn-notifications"
              aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
              onClick={() => navigate('/notifications')}
              style={{
                position: 'relative',
                padding: '8px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: 'var(--mol-color-text-secondary)',
                display: 'flex',
                borderRadius: '12px',
              }}
            >
              <span className={cm.fv5b245ffa}>notifications</span>
              {/* No unread badge: the notifications feed is a static
                  "all caught up" page — a hardcoded dot would advertise
                  unread state that never exists. */}
            </button>

            <button
              data-mol-id={
                location.pathname.startsWith('/companies') ? 'btn-add-company' : 'btn-new-contact'
              }
              onClick={() =>
                // ?new=1 opens the create form on the target list page
                navigate(
                  location.pathname.startsWith('/companies')
                    ? '/companies?new=1'
                    : '/contacts?new=1',
                )
              }
              style={{
                backgroundColor: 'var(--color-primary-container)',
                // was on-error (white) on primary-container #dbeafe = 1.22:1 (axe serious);
                // on-primary-container is the matching M3 pair (12.4:1)
                color: 'var(--color-on-primary-container)',
                padding: '8px 20px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                lineHeight: '20px',
                fontFamily: 'Inter, sans-serif',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <span className={cm.fv5b245ffa} style={{ fontSize: '14px' }}>
                add
              </span>
              {location.pathname.startsWith('/companies')
                ? t('topbar.addCompany', {}, { defaultValue: 'Add Company' })
                : t('topbar.addContact', {}, { defaultValue: 'Add Contact' })}
            </button>

            <UserMenu />
          </div>
        </header>

        {/* Scrollable content */}
        <div data-mol-id="crm-main" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
