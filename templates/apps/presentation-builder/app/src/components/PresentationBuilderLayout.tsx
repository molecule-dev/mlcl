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

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/login')
    }
  }

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
      className={cm.cn(cm.flex({}), cm.minH('screen'), 'bg-surface text-on-surface antialiased')}
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

        <nav className={cm.cn(cm.flex1, cm.sp('px', 3), cm.stack(1))}>
          {NAV_ITEMS.map((item) => {
            const active =
              location.pathname === item.to ||
              (item.to !== '/' && location.pathname.startsWith(item.to))
            const label = t(
              `presentationBuilderLayout.nav.${item.key}`,
              {},
              { defaultValue: item.defaultLabel },
            )
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label={label}
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
        </nav>

        <div className={cm.cn(cm.sp('p', 4), 'mt-auto border-t border-outline-variant/30')}>
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
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>add</span>
            {t('presentationBuilderLayout.newDeck', {}, { defaultValue: 'New deck' })}
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

      <main className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }))}>
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
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
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

export default PresentationBuilderLayout
