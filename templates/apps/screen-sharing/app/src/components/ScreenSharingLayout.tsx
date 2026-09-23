/**
 * Glint shell — left sidebar with primary nav + main content + Header/Footer.
 *
 * Translated from team-chat's SideNavBar shell pattern (260px fixed sidebar
 * + main column), retuned for the Glint purple→cyan palette and remixed
 * with the polished brand-mark from DESIGN.md.
 *
 * Mobile (<768px): the fixed sidebar does not fit a phone, so the shell
 * switches to a sticky top bar (menu toggle + brand + record shortcut) with
 * the same nav in a slide-in drawer. The drawer closes on navigation, on
 * backdrop tap and on Escape; every control keeps a ≥40px tap target.
 */
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
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
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`)

  // Any navigation closes the mobile drawer.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

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
        onNavigate={() => setMenuOpen(false)}
      />
    ))

  const sidebarBody = (onNavigate?: () => void) => (
    <>
      <Link
        to="/library"
        onClick={onNavigate}
        className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('p', 6))}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(10),
            cm.h(10),
            'rounded-xl bg-gradient-to-br from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] shadow-lg shadow-[var(--color-brand-gradient-from)]/30',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-white text-2xl')}>graphic_eq</span>
        </div>
        <div>
          <h1
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'text-on-surface tracking-tight leading-none',
            )}
          >
            {APP_NAME}
          </h1>
          <p
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.sp('mt', 1),
              'text-[10px] uppercase tracking-[0.2em] text-on-surface-variant',
            )}
          >
            {t('nav.tagline', {}, { defaultValue: 'Async Screencasts' })}
          </p>
        </div>
      </Link>

      <div className={cm.cn(cm.sp('px', 4), cm.sp('mb', 4))}>
        <Link
          to="/record"
          onClick={onNavigate}
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

      <nav
        className={cm.cn(
          cm.flex1,
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
      </nav>

      <div
        className={cm.cn(
          cm.sp('p', 4),
          cm.flex({ align: 'center', gap: 3 }),
          'border-t border-outline-variant',
        )}
      >
        <NavLink
          to="/profile"
          onClick={onNavigate}
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
    </>
  )

  return (
    <div className={cm.cn(cm.surface, 'min-h-screen w-full antialiased text-on-surface')}>
      {/* Mobile top bar — sticky, mirrors the sidebar brand + record action */}
      <header
        data-mol-id="mobile-top-bar"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 2 }),
          'md:hidden sticky top-0 z-40 h-14 border-b border-outline-variant bg-surface-container-lowest/95 backdrop-blur px-2',
        )}
      >
        <button
          type="button"
          data-mol-id="mobile-nav-toggle"
          onClick={() => setMenuOpen(true)}
          aria-label={t('nav.openMenu', {}, { defaultValue: 'Open navigation menu' })}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-drawer"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'min-h-[40px] min-w-[40px] rounded-lg text-on-surface hover:bg-surface-container transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-2xl')}>menu</span>
        </button>
        <Link
          to="/library"
          className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'min-w-0 flex-1 justify-center')}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)]',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-white text-lg')}>
              graphic_eq
            </span>
          </span>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('lg'),
              'text-on-surface tracking-tight truncate',
            )}
          >
            {APP_NAME}
          </span>
        </Link>
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
      </header>

      {/* Mobile drawer + backdrop */}
      {menuOpen ? (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            data-mol-id="mobile-nav-backdrop"
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          />
          <aside
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.openMenu', {}, { defaultValue: 'Navigation menu' })}
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'absolute left-0 top-0 h-full w-[290px] max-w-[85vw] border-r border-outline-variant bg-surface-container-lowest shadow-2xl',
            )}
          >
            {sidebarBody(() => setMenuOpen(false))}
          </aside>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'hidden md:flex fixed left-0 top-0 z-40 h-screen w-[260px] border-r border-outline-variant bg-surface-container-lowest',
        )}
      >
        {sidebarBody()}
      </aside>

      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'md:ml-[260px] md:w-[calc(100%-260px)] min-h-screen w-full',
        )}
      >
        <main className={cm.cn(cm.flex1, cm.sp('p', 4), 'md:p-8 overflow-y-auto')}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
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
  onNavigate,
}: {
  to: string
  label: string
  icon: string
  active: boolean
  onNavigate?: () => void
}) {
  const cm = getClassMap()
  return (
    <Link
      to={to}
      onClick={onNavigate}
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
