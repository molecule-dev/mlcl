import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { SidebarUserCard, usePanelClose } from '@molecule/app-ui-react'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { useIsMobile } from '../lib/use-is-mobile.js'
import { SettingsPanel } from './SettingsPanel.js'

/**
 * Account drawer body for the sidebar user card — the app's shared
 * SettingsPanel, dismissed via the panel-close context.
 */
function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

interface WhiteboardLayoutProps {
  children: React.ReactNode
  /** Optional dense layout — drops the top app bar (used by canvas / present). */
  variant?: 'default' | 'canvas' | 'fullscreen'
  /** Optional eyebrow + page title shown in the top-left of the main canvas. */
  eyebrow?: string
  title?: string
  /** Right-side actions (CTAs) rendered in the top app bar. */
  actions?: React.ReactNode
}

const NAV_ITEMS: Array<{ to: string; icon: string; key: string; defaultLabel: string }> = [
  { to: '/boards', icon: 'space_dashboard', key: 'boards', defaultLabel: 'Boards' },
  { to: '/templates', icon: 'auto_awesome_mosaic', key: 'templates', defaultLabel: 'Templates' },
  { to: '/shared', icon: 'group', key: 'shared', defaultLabel: 'Shared with me' },
  {
    to: '/notifications',
    icon: 'notifications_active',
    key: 'notifications',
    defaultLabel: 'Inbox',
  },
  { to: '/workspace', icon: 'corporate_fare', key: 'workspace', defaultLabel: 'Workspace' },
  { to: '/profile', icon: 'badge', key: 'profile', defaultLabel: 'Profile' },
  { to: '/billing', icon: 'credit_card', key: 'billing', defaultLabel: 'Billing' },
  { to: '/settings', icon: 'tune', key: 'settings', defaultLabel: 'Settings' },
]

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

/**
 * Template-local mobile shell (fleet pattern): below `md` (768px) the fixed
 * 260px sidebar does not render at all and THIS takes over — a sticky top bar
 * (hamburger + wordmark + new-board) and a slide-in nav drawer. The drawer
 * carries the same nav items, the account card, New board and Sign out.
 * Conditionally rendered via matchMedia so nav data-mol-ids are never
 * duplicated in the DOM.
 */
function MobileShell({
  children,
  mobileHeader,
}: {
  children: React.ReactNode
  mobileHeader?: React.ReactNode
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const closeDrawer = useCallback((): void => setDrawerOpen(false), [])

  // Any navigation closes the drawer.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

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

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/login')
    }
  }

  const isActive = (to: string): boolean =>
    location.pathname === to || (to !== '/' && location.pathname.startsWith(to))

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface text-on-surface antialiased',
      )}
    >
      <header
        data-mol-id="mobile-top-bar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          'h-[56px] shrink-0 sticky top-0 z-40 px-2 border-b border-outline-variant/20 bg-surface-container-lowest/95 backdrop-blur-xl',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}>
          <button
            type="button"
            data-mol-id="mobile-nav-toggle"
            aria-label={t('mobileNav.openMenu', {}, { defaultValue: 'Open navigation menu' })}
            aria-expanded={drawerOpen}
            aria-controls="whiteboard-nav-drawer"
            onClick={() => setDrawerOpen(true)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'h-11 w-11 shrink-0 text-on-surface-variant hover:bg-surface-container',
              FOCUS_RING,
            )}
          >
            <span className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')} aria-hidden>
              menu
            </span>
          </button>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'h-8 w-8 shrink-0 bg-gradient-to-br from-primary to-primary-hover rounded-lg text-white shadow',
              )}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden>
                dashboard_customize
              </span>
            </span>
            <span
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('extrabold'),
                'tracking-tight text-on-surface truncate',
              )}
            >
              {APP_NAME}
            </span>
          </div>
        </div>
        <button
          type="button"
          data-mol-id="mobile-new-board"
          onClick={() => navigate('/boards?new=1')}
          aria-label={t('whiteboardLayout.newBoard', {}, { defaultValue: 'New board' })}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            'h-11 mr-1 bg-gradient-to-br from-primary to-primary-hover text-white rounded-xl shadow-md shadow-primary/30 active:scale-[0.98] transition-transform font-bold text-sm',
            FOCUS_RING,
          )}
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            add
          </span>
          <span className="hidden sm:inline">
            {t('mobileNav.new', {}, { defaultValue: 'New' })}
          </span>
        </button>
      </header>

      {mobileHeader}

      <main className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }), 'min-h-0')}>{children}</main>

      {drawerOpen && (
        <div className="fixed inset-0 z-50" data-mol-id="mobile-nav-drawer-root">
          <button
            type="button"
            aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
            className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm"
            onClick={closeDrawer}
          />
          <nav
            id="whiteboard-nav-drawer"
            aria-label={t(
              'whiteboardLayout.primaryNav',
              {},
              { defaultValue: 'Primary navigation' },
            )}
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-surface-container-lowest border-r border-outline-variant/20 shadow-xl overflow-y-auto',
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
                  cm.textSize('lg'),
                  cm.fontWeight('extrabold'),
                  'tracking-tight text-on-surface',
                )}
              >
                {APP_NAME}
              </span>
              <button
                type="button"
                aria-label={t('mobileNav.closeMenu', {}, { defaultValue: 'Close navigation menu' })}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'h-11 w-11 text-on-surface-variant hover:bg-surface-container',
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
            <ul className={cm.cn(cm.flex1, cm.sp('p', 3), 'space-y-1 text-sm')}>
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    data-mol-id="mobile-nav-item"
                    onClick={closeDrawer}
                    className={
                      isActive(item.to)
                        ? cm.cn(
                            cm.flex({ align: 'center', gap: 'md' }),
                            cm.sp('px', 4),
                            cm.sp('py', 3),
                            cm.fontWeight('bold'),
                            'rounded-xl border-l-4 border-primary bg-primary-fixed/40 text-primary-dark min-h-[44px]',
                            FOCUS_RING,
                          )
                        : cm.cn(
                            cm.flex({ align: 'center', gap: 'md' }),
                            cm.sp('px', 4),
                            cm.sp('py', 3),
                            cm.fontWeight('semibold'),
                            'rounded-xl border-l-4 border-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface min-h-[44px]',
                            FOCUS_RING,
                          )
                    }
                  >
                    <span
                      className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
                      aria-hidden
                    >
                      {item.icon}
                    </span>
                    {t(`whiteboardLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
                  </Link>
                </li>
              ))}
            </ul>
            <div
              className={cm.cn(
                cm.sp('p', 4),
                'mt-auto border-t border-outline-variant/30 space-y-3',
              )}
            >
              <SidebarUserCard dataMolId="mobile-user-menu" ariaLabelKey="userMenu.open">
                <UserMenuPanel />
              </SidebarUserCard>
              <button
                type="button"
                onClick={() => {
                  closeDrawer()
                  navigate('/boards?new=1')
                }}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                  cm.w('full'),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  'bg-gradient-to-br from-primary to-primary-hover text-white rounded-xl shadow-md shadow-primary/30 active:scale-[0.98] transition-transform min-h-[44px]',
                  FOCUS_RING,
                )}
              >
                <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>add</span>
                {t('whiteboardLayout.newBoard', {}, { defaultValue: 'New board' })}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'w-full text-on-surface-variant hover:bg-surface-container/50 rounded-lg transition-colors min-h-[44px]',
                  FOCUS_RING,
                )}
              >
                <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                  logout
                </span>
                {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
              </button>
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}

export function WhiteboardLayout({
  children,
  variant = 'default',
  eyebrow,
  title,
  actions,
}: WhiteboardLayoutProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/login')
    }
  }

  if (variant === 'fullscreen') {
    return <div className={cm.cn(cm.minH('screen'), 'bg-on-surface text-white')}>{children}</div>
  }

  // Canvas variant on a phone: the drawing surface is a fullscreen app view
  // with its own chrome (BoardCanvas header) — no shell, no drawer.
  if (isMobile && variant === 'canvas') {
    return <div className={cm.cn('bg-surface text-on-surface antialiased')}>{children}</div>
  }

  if (isMobile) {
    // Page header (eyebrow + title + actions) stacked and wrapping below the
    // top bar — actions keep their handlers, the search/CTA row wraps.
    const mobileHeader = (
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'sm' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'sticky top-[56px] z-30 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/20',
        )}
      >
        <div className={cm.stack(1)}>
          {eyebrow && (
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {eyebrow}
            </span>
          )}
          <h1 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}>
            {title ?? APP_NAME}
          </h1>
        </div>
        {actions && (
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap min-w-0')}>
            {actions}
          </div>
        )}
      </div>
    )
    return <MobileShell mobileHeader={mobileHeader}>{children}</MobileShell>
  }

  const isCanvas = variant === 'canvas'

  return (
    <div
      className={cm.cn(
        cm.flex({}),
        isCanvas ? cm.h('screen') : cm.minH('screen'),
        isCanvas ? 'overflow-hidden' : '',
        'bg-surface text-on-surface antialiased',
      )}
    >
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.h('screen'),
          'w-[260px] sticky top-0 left-0 bg-surface-container-low border-r border-outline-variant/30',
        )}
      >
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('px', 6), cm.sp('py', 8))}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              'bg-gradient-to-br from-primary to-primary-hover rounded-xl text-white shadow-lg',
            )}
          >
            <span
              className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              dashboard_customize
            </span>
          </div>
          <div className={cm.flex({ direction: 'col' })}>
            <span
              className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {APP_NAME}
            </span>
            <span
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {APP_TAGLINE}
            </span>
          </div>
        </div>

        <nav className={cm.cn(cm.flex1, cm.sp('px', 3), cm.stack(1))}>
          {NAV_ITEMS.map((item) => {
            const active =
              location.pathname === item.to ||
              (item.to !== '/' && location.pathname.startsWith(item.to))
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  active
                    ? 'bg-primary-fixed/40 text-primary-dark border-l-4 border-primary rounded-r-lg'
                    : 'text-on-surface-variant hover:bg-surface-container/50 rounded-lg transition-colors',
                )}
              >
                <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                  {item.icon}
                </span>
                {t(`whiteboardLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
              </Link>
            )
          })}
        </nav>

        <div className={cm.cn(cm.sp('p', 4), 'mt-auto border-t border-outline-variant/30')}>
          <div className={cm.sp('mb', 3)}>
            <SidebarUserCard dataMolId="user-menu" ariaLabelKey="userMenu.open">
              <UserMenuPanel />
            </SidebarUserCard>
          </div>
          <button
            type="button"
            onClick={() => navigate('/boards?new=1')}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
              cm.w('full'),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.sp('mb', 3),
              'bg-gradient-to-br from-primary to-primary-hover text-white rounded-xl shadow-md shadow-primary/30 active:scale-[0.98] transition-transform',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>add</span>
            {t('whiteboardLayout.newBoard', {}, { defaultValue: 'New board' })}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'w-full text-on-surface-variant hover:bg-surface-container/50 rounded-lg transition-colors',
            )}
          >
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>logout</span>
            {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
          </button>
        </div>
      </aside>

      <main className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }), 'min-h-0')}>
        {!isCanvas && (
          <header
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
              cm.sp('px', 8),
              cm.sp('py', 5),
              'sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 flex-wrap gap-y-2',
            )}
          >
            <div className={cm.stack(1)}>
              {eyebrow && (
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {eyebrow}
                </span>
              )}
              <h1
                className={cm.cn(
                  cm.textSize('2xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {title ?? APP_NAME}
              </h1>
            </div>
            <div
              className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap justify-end')}
            >
              {actions}
            </div>
          </header>
        )}
        <div className={cm.cn(cm.flex1, isCanvas ? 'min-h-0 overflow-hidden' : 'p-8')}>
          {children}
        </div>
      </main>
    </div>
  )
}

export default WhiteboardLayout
