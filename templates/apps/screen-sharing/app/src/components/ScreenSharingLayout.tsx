/**
 * Glint shell — left sidebar with primary nav + main content + Header/Footer.
 *
 * Translated from team-chat's SideNavBar shell pattern (260px fixed sidebar
 * + main column), retuned for the Glint purple→cyan palette and remixed
 * with the polished brand-mark from DESIGN.md.
 */
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
  label: string
  icon: string
  matchPrefix?: string
}

export function ScreenSharingLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const { user } = useAuth<UserProfile>()

  const primary: NavLinkDef[] = [
    {
      to: '/library',
      label: t('nav.library', {}, { defaultValue: 'Library' }),
      icon: 'video_library',
    },
    {
      to: '/record',
      label: t('nav.record', {}, { defaultValue: 'Record' }),
      icon: 'fiber_manual_record',
    },
    {
      to: '/shared',
      label: t('nav.shared', {}, { defaultValue: 'Shared with me' }),
      icon: 'group',
    },
    {
      to: '/analytics',
      label: t('nav.analytics', {}, { defaultValue: 'Analytics' }),
      icon: 'insights',
    },
    {
      to: '/notifications',
      label: t('settings.notifications', {}, { defaultValue: 'Notifications' }),
      icon: 'notifications',
    },
  ]

  const workspace: NavLinkDef[] = [
    {
      to: '/team',
      label: t('nav.team', {}, { defaultValue: 'Team' }),
      icon: 'groups',
    },
    {
      to: '/billing',
      label: t('settings.billing', {}, { defaultValue: 'Billing' }),
      icon: 'credit_card',
    },
    {
      to: '/settings',
      label: t('nav.settings', {}, { defaultValue: 'Settings' }),
      icon: 'settings',
    },
  ]

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`)

  return (
    <div className={cm.cn(cm.surface, 'min-h-screen w-full antialiased text-on-surface')}>
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'fixed left-0 top-0 z-40 h-screen w-[260px] border-r border-outline-variant bg-surface-container-lowest',
        )}
      >
        <Link to="/library" className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('p', 6))}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              'rounded-xl bg-gradient-to-br from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] shadow-lg shadow-[var(--color-brand-gradient-from)]/30',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-white text-2xl')}>
              graphic_eq
            </span>
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
          {primary.map((link) => (
            <SidebarLink key={link.to} link={link} active={isActive(link.to)} />
          ))}

          <div className={cm.sp('mt', 4)}>
            <SidebarSectionHeader label={t('settings.account', {}, { defaultValue: 'Account' })} />
            {workspace.map((link) => (
              <SidebarLink key={link.to} link={link} active={isActive(link.to)} />
            ))}
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
              <div
                className={cm.cn('text-[10px] uppercase tracking-widest text-on-surface-variant')}
              >
                {t('nav.viewProfile', {}, { defaultValue: 'View profile' })}
              </div>
            </div>
          </NavLink>
          <ThemeToggle />
          <UserMenu />
        </div>
      </aside>

      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'ml-[260px] min-h-screen w-[calc(100%-260px)]',
        )}
      >
        <main className={cm.cn(cm.flex1, cm.sp('p', 8), 'overflow-y-auto')}>
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

function SidebarLink({ link, active }: { link: NavLinkDef; active: boolean }) {
  const cm = getClassMap()
  return (
    <Link
      to={link.to}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 3 }),
        cm.sp('px', 3),
        cm.sp('py', 2),
        'rounded-lg transition-all',
        active
          ? 'bg-gradient-to-r from-[var(--color-brand-gradient-from)]/15 to-[var(--color-brand-gradient-to)]/10 text-[var(--color-brand-gradient-from)] font-semibold'
          : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
      )}
    >
      <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>{link.icon}</span>
      <span>{link.label}</span>
    </Link>
  )
}
