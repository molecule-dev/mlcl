import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import {
  ResponsiveAppShell,
  SidebarUserCard,
  useIsDesktop,
  usePanelClose,
} from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { SettingsPanel } from './SettingsPanel.js'
import { ThemeToggle } from './ThemeToggle.js'

/**
 * Account drawer body for the sidebar user card — the app's shared
 * SettingsPanel, dismissed via the panel-close context.
 */
function UserMenuPanel() {
  return <SettingsPanel onClose={usePanelClose()} />
}

interface WhiteboardLayoutProps {
  children: ReactNode
  /** Optional dense layout — drops the top app bar (used by canvas / present). */
  variant?: 'default' | 'canvas' | 'fullscreen'
  /** Optional eyebrow + page title shown in the top-left of the main canvas. */
  eyebrow?: string
  title?: string
  /** Right-side actions (CTAs) rendered in the top app bar. */
  actions?: ReactNode
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
 * Signed-in shell — the shared `ResponsiveAppShell` (fleet standard): a
 * mobile-only top bar (menu trigger + brand + New board), a desktop sidebar
 * (≥768px), an APG dialog drawer (<768px) and one content column. The shell
 * owns the breakpoint signal, drawer open state, focus trap, scroll lock and
 * close-on-navigate; the nav element is passed to BOTH `Sidebar` and
 * `Drawer`, so only the mounted breakpoint's copy ever instantiates.
 */
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
  const isMobile = !useIsDesktop()

  const handleLogout = async (): Promise<void> => {
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

  const isCanvas = variant === 'canvas'

  const isActive = (to: string): boolean =>
    location.pathname === to || (to !== '/' && location.pathname.startsWith(to))

  // The primary nav — the SAME element goes to `Sidebar` and `Drawer`.
  // Marking the current item is the consumer's job (the shell renders rows
  // pass-through): `aria-current="page"` + the active surface class.
  const nav = (
    <>
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.to)
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              active ? cm.fontWeight('bold') : cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'min-h-[44px]',
              active
                ? 'bg-primary-fixed/40 text-primary-dark border-l-4 border-primary rounded-r-lg'
                : 'text-on-surface-variant hover:bg-surface-container/50 rounded-lg transition-colors',
              FOCUS_RING,
            )}
          >
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')} aria-hidden>
              {item.icon}
            </span>
            {t(`whiteboardLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
          </Link>
        )
      })}
    </>
  )

  // Brand block for the desktop sidebar (icon + wordmark + tagline).
  const brand = (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8))}>
      <BrandWordmark as="span" size="lg" withTagline />
    </div>
  )

  // Compact brand for the mobile-only top bar and the drawer header.
  const brandCompact = <BrandWordmark as="span" size="sm" />

  // Below-nav content — user card, theme toggle, New board and Sign out; the
  // same element serves the sidebar footer and the drawer footer.
  const shellFooter = (
    <>
      <SidebarUserCard dataMolId="user-menu" ariaLabelKey="userMenu.open">
        <UserMenuPanel />
      </SidebarUserCard>
      {/* Theme toggle — styled so it doesn't render as a bare floating icon
          next to the user card. */}
      <div className="text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container">
        <ThemeToggle />
      </div>
      <button
        type="button"
        onClick={() => navigate('/boards?new=1')}
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
        <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')} aria-hidden>
          logout
        </span>
        {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
      </button>
    </>
  )

  // Page header (eyebrow + title + actions). Desktop sticks to the viewport
  // top; mobile sticks BELOW the shell's h-14 (56px) top bar.
  const pageHeader = isCanvas ? null : (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        isMobile ? cm.sp('px', 4) : cm.sp('px', 8),
        isMobile ? cm.sp('py', 3) : cm.sp('py', 5),
        isMobile ? 'sticky top-[56px] z-30 bg-surface/90' : 'sticky top-0 z-30 bg-surface/80',
        'backdrop-blur-xl border-b border-outline-variant/30 flex-wrap gap-y-2 shrink-0',
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
            cm.textSize(isMobile ? 'xl' : '2xl'),
            'font-extrabold tracking-tight text-on-surface',
          )}
        >
          {title ?? APP_NAME}
        </h1>
      </div>
      {actions && (
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            'flex-wrap justify-end min-w-0',
          )}
        >
          {actions}
        </div>
      )}
    </header>
  )

  return (
    <ResponsiveAppShell
      sidebarWidth="md"
      className={cm.cn('antialiased', isCanvas ? 'h-screen overflow-hidden' : '')}
    >
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={brandCompact}
        actions={
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
        }
      />
      <ResponsiveAppShell.Sidebar className="bg-surface-container-low" footer={shellFooter}>
        {brand}
        {nav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer
        className="bg-surface-container-lowest shadow-xl"
        header={brandCompact}
        footer={shellFooter}
      >
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content className={cm.cn(cm.flex({ direction: 'col' }), 'min-h-0')}>
        {pageHeader}
        <div className={cm.cn(cm.flex1, isCanvas ? 'min-h-0 overflow-hidden' : 'p-8')}>
          {children}
        </div>
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default WhiteboardLayout
