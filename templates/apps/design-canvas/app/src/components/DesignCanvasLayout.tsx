import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { UserMenu } from './UserMenu.js'

interface DesignCanvasLayoutProps {
  children: React.ReactNode
  /** Optional dense layout — drops the top app bar (used by canvas page). */
  variant?: 'default' | 'canvas' | 'fullscreen'
  /** Optional eyebrow + page title shown in the top-left of the main canvas. */
  eyebrow?: string
  title?: string
  /** Right-side actions (CTAs) rendered in the top app bar. */
  actions?: React.ReactNode
}

const NAV_ITEMS: Array<{ to: string; icon: string; key: string; defaultLabel: string }> = [
  { to: '/dashboard', icon: 'space_dashboard', key: 'dashboard', defaultLabel: 'Projects' },
  { to: '/templates', icon: 'auto_awesome_mosaic', key: 'templates', defaultLabel: 'Templates' },
  { to: '/library', icon: 'palette', key: 'library', defaultLabel: 'Library' },
  { to: '/team', icon: 'group', key: 'team', defaultLabel: 'Team' },
  {
    to: '/notifications',
    icon: 'notifications_active',
    key: 'notifications',
    defaultLabel: 'Notifications',
  },
  { to: '/search', icon: 'search', key: 'search', defaultLabel: 'Search' },
  { to: '/profile', icon: 'badge', key: 'profile', defaultLabel: 'Profile' },
  { to: '/settings', icon: 'tune', key: 'settings', defaultLabel: 'Settings' },
]

const MOBILE_QUERY = '(max-width: 767px)'

/**
 * Authenticated app shell — sidebar nav + sticky top bar on desktop, and below
 * the md breakpoint (768px) a sticky top bar + horizontally scrollable chip
 * nav (the 260px sidebar would swallow a 390px viewport). Only one shell is
 * mounted at a time so the page content never mounts twice.
 *
 * Translated from whiteboard's WhiteboardLayout.tsx — same 260px sidebar
 * + sticky-blur header pattern, retuned to the Atelier wordmark + Material
 * Symbols `brush` mark.
 */
export function DesignCanvasLayout({
  children,
  variant = 'default',
  eyebrow,
  title,
  actions,
}: DesignCanvasLayoutProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [belowMobile, setBelowMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const onChange = (e: MediaQueryListEvent) => setBelowMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

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

  const isCanvas = variant === 'canvas'

  // Mobile + canvas: the editor carries its own complete chrome (back,
  // toolbar, drawers, user menu) — render it bare so the canvas gets the
  // full viewport.
  if (belowMobile && isCanvas) {
    return (
      <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
        {children}
      </div>
    )
  }

  if (belowMobile) {
    const navLabel = t(
      'designCanvasLayout.primaryNavLabel',
      {},
      { defaultValue: 'Primary navigation' },
    )!
    return (
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.minH('screen'),
          'bg-surface text-on-surface antialiased',
        )}
        data-mol-id="design-canvas-mobile-shell"
      >
        <header
          className={cm.cn(
            'sticky top-0 z-40 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/30',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              cm.sp('px', 4),
              'h-14',
            )}
          >
            <Link
              to="/dashboard"
              className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(8),
                  cm.h(8),
                  'shrink-0 bg-gradient-to-br from-primary to-secondary rounded-lg text-white shadow-sm',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[18px]')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  brush
                </span>
              </span>
              <span
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'tracking-tight text-on-surface truncate',
                )}
              >
                {APP_NAME}
              </span>
            </Link>
            <UserMenu />
          </div>
        </header>
        <main className={cm.cn(cm.flex1, 'min-w-0')}>
          {!isCanvas && (
            <>
              <nav
                aria-label={navLabel}
                data-mol-id="design-canvas-mobile-nav"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  'pb-2 overflow-x-auto',
                )}
              >
                <Link
                  to="/dashboard?new=1"
                  data-mol-id="mobile-nav-new-project"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    cm.roundedFull,
                    'whitespace-nowrap bg-gradient-to-br from-primary to-secondary text-white shadow-sm',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[16px]')}
                    aria-hidden="true"
                  >
                    add
                  </span>
                  {t('designCanvasLayout.newProject', {}, { defaultValue: 'New project' })}
                </Link>
                {NAV_ITEMS.map((item) => {
                  const active =
                    location.pathname === item.to ||
                    (item.to !== '/' && location.pathname.startsWith(item.to))
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      data-mol-id={`mobile-nav-${item.key}`}
                      aria-current={active ? 'page' : undefined}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        cm.roundedFull,
                        'whitespace-nowrap',
                        active
                          ? 'bg-primary-fixed/40 text-on-primary-container'
                          : 'text-on-surface-variant hover:bg-surface-container/60',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[16px]')}
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                      {t(
                        `designCanvasLayout.nav.${item.key}`,
                        {},
                        { defaultValue: item.defaultLabel },
                      )}
                    </Link>
                  )
                })}
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  data-mol-id="mobile-nav-signout"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    cm.roundedFull,
                    'whitespace-nowrap text-on-surface-variant hover:bg-surface-container/60',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[16px]')}
                    aria-hidden="true"
                  >
                    logout
                  </span>
                  {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
                </button>
              </nav>
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.sp('px', 4),
                  cm.sp('py', 4),
                )}
              >
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
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    'tracking-tight text-on-surface',
                  )}
                >
                  {title ?? APP_NAME}
                </h1>
                {actions && (
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
                    {actions}
                  </div>
                )}
              </div>
            </>
          )}
          <div className={cm.cn(cm.flex1, isCanvas ? '' : cm.sp('px', 4))}>{children}</div>
        </main>
      </div>
    )
  }

  return (
    <div
      className={cm.cn(cm.flex({}), cm.minH('screen'), 'bg-surface text-on-surface antialiased')}
    >
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.h('screen'),
          'w-[260px] sticky top-0 left-0 bg-surface-container-low border-r border-outline-variant/30',
        )}
      >
        <Link
          to="/dashboard"
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('px', 6), cm.sp('py', 8))}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              'bg-gradient-to-br from-primary to-secondary rounded-xl text-white shadow-lg',
            )}
          >
            <span
              className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              brush
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
        </Link>

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
                    ? 'bg-primary-fixed/40 text-on-primary-container border-l-4 border-primary rounded-r-lg'
                    : 'text-on-surface-variant hover:bg-surface-container/50 rounded-lg transition-colors',
                )}
              >
                <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                  {item.icon}
                </span>
                {t(`designCanvasLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
              </Link>
            )
          })}
        </nav>

        <div className={cm.cn(cm.sp('p', 4), 'mt-auto border-t border-outline-variant/30')}>
          <button
            type="button"
            onClick={() => navigate('/dashboard?new=1')}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
              cm.w('full'),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.sp('mb', 3),
              'bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-md shadow-primary/30 active:scale-[0.98] transition-transform',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>add</span>
            {t('designCanvasLayout.newProject', {}, { defaultValue: 'New project' })}
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

      <main className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }), 'min-w-0')}>
        {!isCanvas && (
          <header
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
              cm.sp('px', 8),
              cm.sp('py', 5),
              'sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30',
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
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                'flex-wrap justify-end min-w-0',
              )}
            >
              {actions}
              <UserMenu />
            </div>
          </header>
        )}
        <div className={cm.cn(cm.flex1, isCanvas ? '' : 'p-8')}>{children}</div>
      </main>
    </div>
  )
}

export default DesignCanvasLayout
