/**
 * Glint shell — the shared `ResponsiveAppShell`: brand top bar with the mobile
 * menu trigger (mobile only), a desktop sidebar (≥768px), a dialog drawer
 * (<768px) and one content column.
 *
 * The shell owns the breakpoint split, the drawer's open/close lifecycle
 * (navigation, Escape, backdrop tap), the APG dialog contract and the menu
 * trigger — the app's own hamburger, drawer state and escape/backdrop
 * handlers are gone. The SAME nav element feeds `.Sidebar` and `.Drawer`, so
 * only the mounted breakpoint instantiates it.
 */
import { Link, NavLink, Outlet, useLocation } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { Footer } from './Footer.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

interface NavLinkDef {
  to: string
  icon: string
}

const PRIMARY_LINKS: NavLinkDef[] = [
  { to: '/library', icon: 'video_library' },
  { to: '/record', icon: 'fiber_manual_record' },
  { to: '/shared', icon: 'group' },
  { to: '/analytics', icon: 'insights' },
  { to: '/notifications', icon: 'notifications' },
]

const WORKSPACE_LINKS: NavLinkDef[] = [
  { to: '/team', icon: 'groups' },
  { to: '/billing', icon: 'credit_card' },
  { to: '/settings', icon: 'settings' },
]

const PRIMARY_LABEL_KEYS: Record<string, [string, string]> = {
  '/library': ['nav.library', 'Library'],
  '/record': ['nav.record', 'Record'],
  '/shared': ['nav.shared', 'Shared with me'],
  '/analytics': ['nav.analytics', 'Analytics'],
  '/notifications': ['settings.notifications', 'Notifications'],
}

const WORKSPACE_LABEL_KEYS: Record<string, [string, string]> = {
  '/team': ['nav.team', 'Team'],
  '/billing': ['settings.billing', 'Billing'],
  '/settings': ['nav.settings', 'Settings'],
}

export function ScreenSharingLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const { user } = useAuth<UserProfile>()

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`)

  const navLabel = (link: NavLinkDef) => {
    const [key, fallback] = PRIMARY_LABEL_KEYS[link.to] ??
      WORKSPACE_LABEL_KEYS[link.to] ?? [link.to, link.to]
    return t(key, {}, { defaultValue: fallback })
  }

  const renderLinks = (links: NavLinkDef[]) =>
    links.map((link) => (
      <SidebarLink
        key={link.to}
        to={link.to}
        label={navLabel(link)}
        icon={link.icon}
        active={isActive(link.to)}
      />
    ))

  // One nav element for BOTH surfaces — the shell mounts exactly one per
  // breakpoint (Sidebar ≥768px, Drawer below), so it instantiates once. The
  // shell auto-closes the drawer on navigation, so rows need no close wiring.
  const nav = (
    <>
      <Link to="/library" className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('p', 6))}>
        <BrandWordmark
          as="span"
          size="lg"
          tagline={t('nav.tagline', {}, { defaultValue: 'Async Screencasts' })}
        />
      </Link>

      <div className={cm.cn(cm.sp('px', 4), cm.sp('mb', 4))}>
        <Link
          to="/record"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'w-full py-2.5 rounded-xl text-white bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] hover:opacity-90 shadow-md shadow-[var(--color-brand-gradient-from)]/30 transition-all active:scale-[0.98]',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-base inline-block animate-pulse')}
            style={{ color: 'var(--color-live-indicator)' }}
          >
            radio_button_checked
          </span>
          {t('nav.startRecording', {}, { defaultValue: 'Start recording' })}
        </Link>
      </div>

      <div
        className={cm.cn(
          cm.fontWeight('medium'),
          cm.textSize('sm'),
          cm.sp('px', 3),
          cm.stack(1),
          'overflow-y-auto',
        )}
      >
        <SidebarSectionHeader label={t('nav.workspace', {}, { defaultValue: 'Workspace' })} />
        {renderLinks(PRIMARY_LINKS)}

        <div className={cm.sp('mt', 4)}>
          <SidebarSectionHeader label={t('settings.account', {}, { defaultValue: 'Account' })} />
          {renderLinks(WORKSPACE_LINKS)}
        </div>
      </div>
    </>
  )

  const footer = (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.w('full'))}>
      <NavLink
        to="/profile"
        className={cm.cn(
          cm.flex1,
          cm.flex({ align: 'center', gap: 3 }),
          cm.cursorPointer,
          cm.sp('p', 2),
          'rounded-lg hover:bg-surface-container transition-colors',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(9),
            cm.h(9),
            cm.fontWeight('bold'),
            'rounded-full bg-gradient-to-br from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] text-white text-sm',
          )}
        >
          {(user?.name || user?.email || 'G').slice(0, 1).toUpperCase()}
        </div>
        <div className={cm.cn(cm.flex1, 'min-w-0')}>
          <div
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'truncate text-on-surface',
            )}
          >
            {user?.name || user?.email || t('nav.you', {}, { defaultValue: 'You' })}
          </div>
          <div className={cm.cn('text-[10px] uppercase tracking-widest text-on-surface-variant')}>
            {t('nav.viewProfile', {}, { defaultValue: 'View profile' })}
          </div>
        </div>
      </NavLink>
      <ThemeToggle />
      <UserMenu />
    </div>
  )

  return (
    <ResponsiveAppShell sidebarWidth={260} className="bg-surface text-on-surface antialiased">
      {/* Mobile top bar — the shell renders the menu trigger itself. */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        className="bg-surface-container-lowest/95 backdrop-blur border-outline-variant"
        brand={
          <Link to="/library" className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
            <BrandWordmark as="span" size="sm" />
          </Link>
        }
        actions={
          <Link
            to="/record"
            aria-label={t('nav.startRecording', {}, { defaultValue: 'Start recording' })}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 1 }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'min-h-[40px] px-3 rounded-full text-white bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] active:scale-[0.98] transition-transform',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-base animate-pulse')}
              style={{ color: 'var(--color-live-indicator)' }}
            >
              radio_button_checked
            </span>
            {t('nav.record', {}, { defaultValue: 'Record' })}
          </Link>
        }
      />

      <ResponsiveAppShell.Sidebar
        className="bg-surface-container-lowest border-outline-variant"
        footer={footer}
      >
        {nav}
      </ResponsiveAppShell.Sidebar>

      <ResponsiveAppShell.Drawer
        className="bg-surface-container-lowest border-outline-variant"
        footer={footer}
      >
        {nav}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content className={cm.cn(cm.sp('p', 4), 'md:p-8')}>
        <Outlet />
        <Footer />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

function SidebarSectionHeader({ label }: { label: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.sp('px', 3), cm.sp('py', 2))}>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          'text-[11px] uppercase tracking-[0.2em] text-on-surface-variant',
        )}
      >
        {label}
      </span>
    </div>
  )
}

function SidebarLink({
  to,
  label,
  icon,
  active,
}: {
  to: string
  label: string
  icon: string
  active: boolean
}) {
  const cm = getClassMap()
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 3 }),
        cm.sp('px', 3),
        cm.sp('py', 2),
        'min-h-[40px] rounded-lg transition-all',
        active
          ? 'bg-gradient-to-r from-[var(--color-brand-gradient-from)]/15 to-[var(--color-brand-gradient-to)]/10 text-[var(--color-brand-gradient-from)] font-semibold'
          : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
      )}
    >
      <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
