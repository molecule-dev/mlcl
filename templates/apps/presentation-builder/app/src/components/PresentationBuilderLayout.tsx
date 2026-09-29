import { Link, useLocation, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
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
 * Authenticated app shell — the shared `ResponsiveAppShell` composed to this
 * app's shape (fleet-canonical: brand row in the desktop sidebar, mobile-only
 * top bar carrying the menu trigger + user menu, one nav element passed to
 * both `.Sidebar` and `.Drawer` so only the mounted breakpoint instantiates).
 *
 * The shell owns the breakpoint split, the drawer open state, the 44px menu
 * trigger, focus/Escape/backdrop handling, the body scroll lock, and the
 * auto-close-on-navigation; this component only supplies nav + brand. The
 * per-page header (eyebrow / title / actions) stays inside `.Content`, exactly
 * where the old hand-rolled `<main>` held it.
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
  const navAriaLabel = t('presentationBuilderLayout.navLabel', {}, { defaultValue: 'Main' })!

  // Brand row — leads the desktop sidebar (the shared Sidebar has no header
  // slot, so it rides inside `children`) and heads the mobile drawer.
  const brandBlock = (
    <div className={cm.cn(cm.sp('p', 5))}>
      <BrandWordmark size="lg" withTagline as="span" />
    </div>
  )

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same element, and only the mounted breakpoint instantiates it. The
  // drawer closes itself on navigation (shell-owned), so links carry no
  // onClick close.
  const navBody = (
    <div className={cm.cn(cm.flex1, cm.sp('px', 3), cm.stack(1), 'overflow-y-auto')}>
      {navItems}
    </div>
  )

  const shellFooter = (
    <>
      {newDeckButton()}
      {signOutButton()}
    </>
  )

  return (
    <ResponsiveAppShell sidebarWidth={260} className="antialiased">
      {/*
        Mobile top bar (< md). The desktop brand row lives in the sidebar, so
        this bar only exists below the breakpoint — it hosts the shell's menu
        trigger + wordmark + user menu.
      */}
      {!isCanvas && (
        <ResponsiveAppShell.TopBar
          mobileOnly
          brand={
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}>
              <BrandWordmark as="span" />
            </div>
          }
          actions={<UserMenu />}
        />
      )}

      {/* Desktop sidebar (>= md). */}
      <ResponsiveAppShell.Sidebar navLabel={navAriaLabel} footer={shellFooter}>
        {brandBlock}
        {navBody}
      </ResponsiveAppShell.Sidebar>

      {/* Mobile nav drawer (< md): full APG dialog contract, shell-owned. */}
      {!isCanvas && (
        <ResponsiveAppShell.Drawer navLabel={navAriaLabel} header={brandBlock} footer={shellFooter}>
          {navBody}
        </ResponsiveAppShell.Drawer>
      )}

      <ResponsiveAppShell.Content className={cm.flex({ direction: 'col' })}>
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
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default PresentationBuilderLayout
