import {
  Component,
  type ErrorInfo,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useState,
} from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

const SIDEBAR_WIDTH = '256px'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logError(error, errorInfo.componentStack ?? '')
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }
    return this.props.children
  }
}

function ErrorFallback({ error }: { error: Error | null }) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(cm.page, cm.flex({ direction: 'col', align: 'center', justify: 'center' }))}
      style={{ minHeight: '100vh', padding: '48px' }}
    >
      <div className={cm.card()} style={{ maxWidth: '500px', width: '100%' }}>
        <div className={cm.cn(cm.cardContent, cm.sp('p', 8))}>
          <div className={cm.emptyState}>
            <div className={cm.emptyStateIcon}>
              <span
                className={cm.cn('material-symbols-outlined')}
                style={{ fontSize: '48px', color: 'var(--color-error)' }}
              >
                error_outline
              </span>
            </div>
            <p className={cm.emptyStateTitle}>
              {t('errorBoundary.title', {}, { defaultValue: 'Something went wrong' })}
            </p>
            <p className={cm.emptyStateDescription}>
              {error?.message ||
                t('error.unknown', {}, { defaultValue: 'An unexpected error occurred.' })}
            </p>
            <button
              onClick={() => window.location.reload()}
              className={cm.cn(cm.button({ variant: 'solid' }), cm.sp('mt', 4))}
            >
              {t('errorBoundary.reloadButton', {}, { defaultValue: 'Reload Page' })}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AgentLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth<{ name?: string; email?: string; id?: string }>()
  const cm = getClassMap()
  const [searchQuery, setSearchQuery] = useState('')
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const q = searchQuery.trim()
    if (q) navigate(`/?q=${encodeURIComponent(q)}`)
  }

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    if (!isNotificationsOpen) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        !target.closest('[data-mol-id="button-notifications-header"]') &&
        !target.closest('[data-mol-id="notifications-dropdown"]')
      ) {
        setIsNotificationsOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [isNotificationsOpen])

  const navItems = [
    {
      to: '/admin',
      label: t('nav.dashboard', {}, { defaultValue: 'Dashboard' }),
      icon: 'dashboard',
      end: true,
    },
    {
      to: '/admin/listings',
      label: t('nav.listings', {}, { defaultValue: 'Listings' }),
      icon: 'home_work',
      end: false,
    },
    {
      to: '/admin/leads',
      label: t('nav.leads', {}, { defaultValue: 'Leads' }),
      icon: 'person_search',
      end: false,
    },
    {
      to: '/admin/showings',
      label: t('nav.showings', {}, { defaultValue: 'Showings' }),
      icon: 'calendar_today',
      end: false,
    },
    {
      to: '/admin/analytics',
      label: t('nav.analytics', {}, { defaultValue: 'Analytics' }),
      icon: 'analytics',
      end: false,
    },
    {
      to: '/admin/settings',
      label: t('nav.settings', {}, { defaultValue: 'Settings' }),
      icon: 'settings',
      end: false,
    },
  ]

  // Safe access to user properties
  const userName = user?.name || t('nav.agent', {}, { defaultValue: 'Luxury Curator' })

  return (
    <div data-mol-id="agent-layout" className={cm.page} style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <aside
        data-mol-id="agent-sidebar"
        className={cm.flex({ direction: 'col' })}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: SIDEBAR_WIDTH,
          height: '100vh',
          overflowY: 'auto',
          backgroundColor: 'rgb(250, 250, 250)',
          padding: '16px',
          gap: '8px',
          zIndex: 50,
          borderRight: '1px solid rgba(228, 228, 231, 0.5)',
          fontFamily: 'Manrope, sans-serif',
          color: 'var(--color-on-background)',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '0 8px', marginBottom: '32px' }}>
          <NavLink to="/" data-mol-id="nav-agent-logo" style={{ textDecoration: 'none' }}>
            <h1
              style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: '18px',
                fontWeight: 900,
                letterSpacing: '-0.9px',
                lineHeight: '28px',
                color: 'rgb(6, 78, 59)',
                margin: 0,
              }}
            >
              {t('brand.name', {}, { defaultValue: 'Evergreen Estate' })}
            </h1>
          </NavLink>
          <p
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--color-outline)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: 0,
            }}
          >
            {t('brand.subtitle', {}, { defaultValue: 'Agent Portal' })}
          </p>
        </div>

        {/* Navigation */}
        <nav
          className={cm.flex({ direction: 'col' })}
          style={{ flex: 1, gap: '4px', color: 'rgb(87, 83, 78)' }}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-mol-id={`nav-agent-${item.to.split('/').pop() || 'dashboard'}`}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
                ...(isActive
                  ? {
                      backgroundColor: 'var(--color-primary-container)',
                      color: 'var(--color-on-primary-container)',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.15)',
                    }
                  : {
                      color: 'var(--color-on-surface-variant)',
                    }),
              })}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cm.cn('material-symbols-outlined')}
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* New Listing Button */}
        <Link
          to="/admin/listings/new"
          data-mol-id="nav-agent-new-listing"
          className={cm.cn(
            cm.button({ variant: 'solid' }),
            cm.flex({ align: 'center', justify: 'center' }),
          )}
          style={{
            marginTop: 'auto',
            gap: '8px',
            textDecoration: 'none',
          }}
        >
          <span className={cm.cn('material-symbols-outlined')} style={{ fontSize: 18 }}>
            add
          </span>
          <span>{t('nav.newListing', {}, { defaultValue: 'New Listing' })}</span>
        </Link>

        {/* Footer nav */}
        <div className={cm.flex({ direction: 'col' })} style={{ gap: '4px', paddingTop: '12px' }}>
          <NavLink
            to="/help"
            data-mol-id="nav-agent-support"
            className={cm.cn(cm.flex({ align: 'center' }), cm.button({ variant: 'ghost' }))}
            style={{
              gap: '12px',
              justifyContent: 'flex-start',
              textDecoration: 'none',
            }}
          >
            <span className={cm.cn('material-symbols-outlined')}>support_agent</span>
            <span>{t('nav.support', {}, { defaultValue: 'Support' })}</span>
          </NavLink>
          <NavLink
            to="/logout"
            data-mol-id="nav-agent-logout"
            className={cm.cn(cm.flex({ align: 'center' }), cm.button({ variant: 'ghost' }))}
            style={{
              gap: '12px',
              justifyContent: 'flex-start',
              textDecoration: 'none',
            }}
          >
            <span className={cm.cn('material-symbols-outlined')}>logout</span>
            <span>{t('nav.logout', {}, { defaultValue: 'Log Out' })}</span>
          </NavLink>
        </div>
      </aside>

      {/* Main content area */}
      <div
        className={cm.flex({ direction: 'col' })}
        style={{ marginLeft: SIDEBAR_WIDTH, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}
      >
        {/* Top Header Bar */}
        <header
          data-mol-id="agent-header"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 6),
            cm.sp('py', 4),
          )}
          style={{
            backgroundColor: 'rgba(240, 253, 250, 0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          <div
            className={cm.flex({ align: 'center' })}
            style={{
              gap: 'xl',
              backgroundColor: 'rgb(255, 255, 255)',
              border: '1px solid rgba(228, 228, 231, 0.5)',
              borderRadius: 9999,
              padding: '8px 20px',
            }}
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              style={{ fontSize: 18, color: 'var(--color-outline)' }}
            >
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t('search.placeholder', {}, { defaultValue: 'Search listings...' })}
              aria-label={t('search.placeholder', {}, { defaultValue: 'Search listings...' })}
              style={{
                border: 'none',
                background: 'none',
                outline: 'none',
                fontSize: 14,
                color: 'var(--color-on-surface-variant)',
                fontFamily: 'Inter, sans-serif',
                width: 160,
              }}
            />
          </div>
          <div className={cm.flex({ align: 'center' })} style={{ gap: 'xl' }}>
            <div style={{ position: 'relative' }}>
              <button
                data-mol-id="button-notifications-header"
                type="button"
                aria-expanded={isNotificationsOpen}
                onClick={() => setIsNotificationsOpen((v) => !v)}
                className={cm.button({ variant: 'ghost', size: 'sm' })}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: '1px solid rgba(228, 228, 231, 0.5)',
                  backgroundColor: 'rgb(255, 255, 255)',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className={cm.cn('material-symbols-outlined')} style={{ fontSize: 18 }}>
                  notifications
                </span>
              </button>
              {isNotificationsOpen && (
                <div
                  data-mol-id="notifications-dropdown"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: 8,
                    backgroundColor: 'rgb(255, 255, 255)',
                    border: '1px solid rgba(228, 228, 231, 0.5)',
                    borderRadius: 8,
                    padding: 16,
                    minWidth: 320,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    zIndex: 50,
                  }}
                >
                  <p style={{ margin: 0, color: 'var(--color-outline)', fontSize: 14 }}>
                    {t('agentLayout.noNotifications', {}, { defaultValue: 'No new notifications' })}
                  </p>
                </div>
              )}
            </div>
            <Link
              to="/admin/settings"
              data-mol-id="nav-agent-profile-header"
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.button({ variant: 'solid', size: 'sm' }),
              )}
              style={{
                gap: 'xl',
                padding: '6px 14px 6px 16px',
                borderRadius: 9999,
                textDecoration: 'none',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    margin: 0,
                    whiteSpace: 'nowrap',
                    lineHeight: '16px',
                  }}
                >
                  {t('nav.agentProfile', {}, { defaultValue: 'Agent Profile' })}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    margin: 0,
                    opacity: 0.7,
                    whiteSpace: 'nowrap',
                    lineHeight: '14px',
                  }}
                >
                  {userName}
                </p>
              </div>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span className={cm.cn('material-symbols-outlined')} style={{ fontSize: 18 }}>
                  person
                </span>
              </div>
            </Link>
          </div>
        </header>
        <main
          data-mol-id="agent-content"
          style={{ flex: 1, padding: '48px', backgroundColor: 'rgb(248, 250, 249)' }}
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
        <footer className={cm.footerBar}>
          <span className={cm.textSize('sm')}>
            {t(
              // Own key: four footers rendered 'footer.copyright' with three
              // different placeholder shapes, so any one translation would leave
              // the others showing a raw token.
              'footer.copyrightAgent',
              { year: new Date().getFullYear(), brand: APP_NAME },
              { defaultValue: '© {{year}} {{brand}}. All rights reserved.' },
            )}
          </span>
        </footer>
      </div>
    </div>
  )
}
