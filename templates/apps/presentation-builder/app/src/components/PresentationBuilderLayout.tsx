import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { UserMenu } from './UserMenu.js'

interface PresentationBuilderLayoutProps {
  children: React.ReactNode
  /** Optional full-bleed variant — drops the top app bar (used by Editor / Present). */
  variant?: 'default' | 'canvas' | 'fullscreen'
  /** Optional eyebrow + page title shown in the top-left of the main canvas. */
  eyebrow?: string
  title?: string
  /** Right-side actions (CTAs) rendered in the top app bar. */
  actions?: React.ReactNode
}

const NAV_ITEMS: Array<{ to: string; icon: string; key: string; defaultLabel: string }> = [
  { to: '/decks', icon: 'co_present', key: 'decks', defaultLabel: 'Decks' },
  { to: '/templates', icon: 'auto_awesome_mosaic', key: 'templates', defaultLabel: 'Templates' },
  { to: '/analytics', icon: 'monitoring', key: 'analytics', defaultLabel: 'Analytics' },
  { to: '/shared', icon: 'group', key: 'shared', defaultLabel: 'Shared' },
  {
    to: '/notifications',
    icon: 'notifications_active',
    key: 'notifications',
    defaultLabel: 'Notifications',
  },
  { to: '/settings', icon: 'tune', key: 'settings', defaultLabel: 'Settings' },
]

/**
 * Authenticated app shell — sticky left sidebar + glass-blur top bar.
 *
 * Translated from design-canvas's DesignCanvasLayout.tsx — same 260px sidebar
 * + sticky header pattern, retuned to the Overture wordmark with a Material
 * Symbols `co_present` mark and the violet→magenta brand gradient.
 */
export function PresentationBuilderLayout({
  children,
  variant = 'default',
  eyebrow,
  title,
  actions,
}: PresentationBuilderLayoutProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Close the mobile drawer whenever the route changes (nav link tap).
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Escape closes the drawer; scroll is locked while it is open.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
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

  const navLabel = (item: (typeof NAV_ITEMS)[number]) =>
    t(`presentationBuilderLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })

  const navItems = (
    <>
      {NAV_ITEMS.map((item) => {
        const active =
          location.pathname === item.to ||
          (item.to !== '/' && location.pathname.startsWith(item.to))
        const label = navLabel(item)
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              active
                ? 'bg-primary-fixed/40 text-primary border-l-4 border-primary rounded-r-lg'
                : 'text-on-surface-variant hover:bg-surface-container/50 rounded-lg transition-colors',
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
            >
              {item.icon}
            </span>
            {label}
          </Link>
        )
      })}
    </>
  )

  const newDeckButton = (extra?: string) => (
    <button
      type="button"
      onClick={() => navigate('/decks?new=1')}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
        cm.w('full'),
        cm.sp('py', 3),
        cm.fontWeight('bold'),
        cm.sp('mb', 3),
        'bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-md shadow-primary/30 active:scale-[0.98] transition-transform',
        extra,
      )}
    >
      <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>add</span>
      {t('presentationBuilderLayout.newDeck', {}, { defaultValue: 'New deck' })}
    </button>
  )

  const signOutButton = (extra?: string) => (
    <button
      type="button"
      onClick={() => void handleLogout()}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 4),
        cm.sp('py', 2),
        cm.fontWeight('semibold'),
        cm.textSize('sm'),
        'w-full text-on-surface-variant hover:bg-surface-container/50 rounded-lg transition-colors',
        extra,
      )}
    >
      <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>logout</span>
      {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
    </button>
  )

  if (variant === 'fullscreen') {
    // The presenter stage is dark in BOTH themes — `bg-on-surface` flips to a
    // near-white surface in dark mode (white-on-white text), so use the
    // always-dark slide-canvas token instead.
    return (
      <div
        className={cm.cn(cm.minH('screen'), 'text-white')}
        style={{ backgroundColor: 'var(--color-slide-canvas-deep)' }}
      >
        {children}
      </div>
    )
  }

  const isCanvas = variant === 'canvas'

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'md:flex-row bg-surface text-on-surface antialiased',
      )}
    >
      {/* Mobile top bar — the 260px sidebar is hidden below md; this bar hosts
          the drawer toggle + wordmark + user menu instead. */}
      {!isCanvas && (
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'md:hidden sticky top-0 z-30 w-full h-14 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/30',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
            <button
              type="button"
              aria-label={t(
                'presentationBuilderLayout.openMenu',
                {},
                { defaultValue: 'Open navigation menu' },
              )!}
              aria-expanded={drawerOpen}
              aria-controls="pb-mobile-drawer"
              data-testid="mobile-nav-toggle"
              onClick={() => setDrawerOpen(true)}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                'rounded-lg text-on-surface hover:bg-surface-container/60 shrink-0',
              )}
            >
              <span className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}>menu</span>
            </button>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(8),
                  cm.h(8),
                  'bg-gradient-to-br from-primary to-secondary rounded-lg text-white shrink-0',
                )}
              >
                <span
                  className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  co_present
                </span>
              </div>
              <span
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'tracking-tight text-on-surface truncate',
                )}
              >
                {APP_NAME}
              </span>
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}>
            <UserMenu />
          </div>
        </header>
      )}

      {/* Mobile nav drawer (below md only). */}
      {drawerOpen && (
        <div className="md:hidden">
          <button
            type="button"
            aria-label={t(
              'presentationBuilderLayout.closeMenu',
              {},
              { defaultValue: 'Close navigation menu' },
            )!}
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-40 bg-black/40"
          />
          <nav
            id="pb-mobile-drawer"
            aria-label={t('presentationBuilderLayout.navLabel', {}, { defaultValue: 'Main' })!}
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'fixed top-0 left-0 bottom-0 z-50 w-[280px] max-w-[85vw] bg-surface-container-low border-r border-outline-variant/30 shadow-2xl',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 5),
                cm.sp('py', 5),
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(9),
                  cm.h(9),
                  'bg-gradient-to-br from-primary to-secondary rounded-xl text-white',
                )}
              >
                <span
                  className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  co_present
                </span>
              </div>
              <div className={cm.flex({ direction: 'col' })}>
                <span
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('extrabold'),
                    'tracking-tight text-on-surface',
                  )}
                >
                  {APP_NAME}
                </span>
                <span
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant/70',
                  )}
                >
                  {APP_TAGLINE}
                </span>
              </div>
            </div>
            <div className={cm.cn(cm.flex1, cm.sp('px', 3), cm.stack(1), 'overflow-y-auto')}>
              {navItems}
            </div>
            <div className={cm.cn(cm.sp('p', 4), 'border-t border-outline-variant/30')}>
              {newDeckButton()}
              {signOutButton()}
            </div>
          </nav>
        </div>
      )}

      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.h('screen'),
          'hidden md:flex w-[260px] sticky top-0 left-0 bg-surface-container-low border-r border-outline-variant/30',
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
              'bg-gradient-to-br from-primary to-secondary rounded-xl text-white shadow-lg',
            )}
          >
            <span
              className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              co_present
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
                'text-[10px] uppercase tracking-widest text-on-surface-variant/70',
              )}
            >
              {APP_TAGLINE}
            </span>
          </div>
        </div>

        <nav
          aria-label={t('presentationBuilderLayout.navLabel', {}, { defaultValue: 'Main' })!}
          className={cm.cn(cm.flex1, cm.sp('px', 3), cm.stack(1))}
        >
          {navItems}
        </nav>

        <div className={cm.cn(cm.sp('p', 4), 'mt-auto border-t border-outline-variant/30')}>
          {newDeckButton()}
          {signOutButton()}
        </div>
      </aside>

      <main className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }), 'min-w-0')}>
        {!isCanvas && (
          <header
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
              cm.sp('px', 8),
              cm.sp('py', 5),
              'hidden md:flex sticky top-0 z-20 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30',
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
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
              {actions}
              <UserMenu />
            </div>
          </header>
        )}
        <div className={cm.cn(cm.flex1, isCanvas ? '' : 'p-4 md:p-8')}>{children}</div>
      </main>
    </div>
  )
}

export default PresentationBuilderLayout
