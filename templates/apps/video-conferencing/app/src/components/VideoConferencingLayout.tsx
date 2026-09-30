/**
 * Convoke shell layout — the shared `ResponsiveAppShell`
 * (`@molecule/app-ui-react`), composed the fleet-canonical way: the brand
 * leads the desktop Sidebar, the mobile-only TopBar carries the menu trigger
 * (rendered by the shell when a Drawer is composed) plus the user menu, and
 * the SAME nav element is passed to `.Sidebar` and `.Drawer` so only the
 * mounted breakpoint's copy ever instantiates. The drawer is the shell's full
 * APG dialog (focus trap, Escape/backdrop close, scroll lock, auto-close on
 * navigation) — the former hand-rolled hamburger button, drawer open state
 * and scrim/Escape handlers are deleted with it. The ≥md desktop chrome
 * (page title + search + theme toggle + user menu) rides at the top of the
 * content region as md+-only non-duplicating chrome, exactly where the old
 * sticky top bar sat.
 */
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

const NAV_ITEMS: ReadonlyArray<{ to: string; icon: string; key: string; defaultLabel: string }> = [
  { to: '/dashboard', icon: 'dashboard', key: 'nav.dashboard', defaultLabel: 'Dashboard' },
  { to: '/schedule', icon: 'event', key: 'nav.schedule', defaultLabel: 'Schedule' },
  { to: '/recordings', icon: 'play_circle', key: 'nav.recordings', defaultLabel: 'Recordings' },
  {
    to: '/notifications',
    icon: 'notifications',
    key: 'nav.notifications',
    defaultLabel: 'Notifications',
  },
  { to: '/team-members', icon: 'groups', key: 'nav.team', defaultLabel: 'Team' },
]

const FOOTER_NAV: ReadonlyArray<{ to: string; icon: string; key: string; defaultLabel: string }> = [
  { to: '/settings', icon: 'settings', key: 'nav.settings', defaultLabel: 'Settings' },
  { to: '/billing', icon: 'credit_card', key: 'nav.billing', defaultLabel: 'Billing' },
]

function navLinkClass(cm: ReturnType<typeof getClassMap>, isActive: boolean): string {
  return cm.cn(
    cm.flex({ align: 'center', gap: 3 }),
    cm.sp('px', 3),
    cm.sp('py', 2),
    cm.textSize('sm'),
    cm.fontWeight('medium'),
    'rounded-lg transition-colors',
    isActive
      ? 'bg-primary-container/30 text-primary font-semibold'
      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
  )
}

export function VideoConferencingLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [pageTitle, setPageTitle] = useState<string>('')

  useEffect(() => {
    const match = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))
    setPageTitle(match ? t(match.key, {}, { defaultValue: match.defaultLabel }) : APP_NAME)
  }, [location.pathname, t])

  // New-meeting quick action — the sidebar and the drawer share one element;
  // only the mounted breakpoint's copy ever instantiates.
  const newMeetingButton = (
    <button
      type="button"
      onClick={() => navigate('/schedule')}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center', gap: 2 }),
        cm.sp('px', 4),
        cm.fontWeight('semibold'),
        cm.textSize('sm'),
        'w-full py-2.5 rounded-lg text-on-primary bg-gradient-to-r from-primary to-secondary shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/40 transition-all active:scale-95',
      )}
    >
      <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>add</span>
      {t('nav.newMeeting', {}, { defaultValue: 'New meeting' })}
    </button>
  )

  // ONE nav element for both breakpoints — the Sidebar (≥768px) and the
  // Drawer (<768px) each render it, but only the mounted breakpoint's copy
  // instantiates. NavLink sets `aria-current="page"` on the active link.
  const nav = (
    <>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => navLinkClass(cm, isActive)}
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>{item.icon}</span>
          <span>{t(item.key, {}, { defaultValue: item.defaultLabel })}</span>
        </NavLink>
      ))}
    </>
  )

  const footerNav = (
    <>
      {FOOTER_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => navLinkClass(cm, isActive)}
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>{item.icon}</span>
          <span>{t(item.key, {}, { defaultValue: item.defaultLabel })}</span>
        </NavLink>
      ))}
    </>
  )

  // Brand — leads the desktop sidebar and rides in the mobile-only TopBar.
  // Breakpoint-exclusive mounts, so never duplicated on one screen.
  const desktopBrand = (
    <Link to="/dashboard" className={cm.cn(cm.flex({ align: 'center' }), cm.sp('p', 6))}>
      <BrandWordmark
        as="span"
        subline={t('nav.organization', {}, { defaultValue: 'Acme Workspace' })}
      />
    </Link>
  )

  const mobileBrand = (
    <Link to="/dashboard" className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
      <BrandWordmark as="span" size="sm" />
    </Link>
  )

  return (
    <ResponsiveAppShell sidebarWidth="lg">
      {/*
        Mobile top bar (<768px): the drawer menu trigger (rendered by the
        shell) + brand + user menu. Desktop returns null — the sidebar and
        the content-region chrome carry the shell there.
      */}
      <ResponsiveAppShell.TopBar mobileOnly brand={mobileBrand} actions={<UserMenu />} />

      {/*
        Desktop sidebar (>=768px): brand row, quick action and the primary
        nav; the shared Sidebar's footer slot carries the settings/billing
        links below its own bordered divider.
      */}
      <ResponsiveAppShell.Sidebar footer={footerNav}>
        {desktopBrand}
        <div className={cm.cn(cm.sp('px', 4), cm.sp('mb', 4))}>{newMeetingButton}</div>
        <div className={cm.cn(cm.flex1, cm.sp('px', 3), cm.sp('pb', 4))}>{nav}</div>
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): the shell's full dialog panel over the same
        nav, with the quick action on top and the footer links below.
      */}
      <ResponsiveAppShell.Drawer
        // The shared panel ships no height token (its content would size it);
        // `h-full` restores the documented full-height left-panel geometry.
        className="h-full"
        footer={footerNav}
      >
        <div className={cm.cn(cm.sp('p', 4), cm.sp('pb', 0))}>{newMeetingButton}</div>
        <div className={cm.cn(cm.sp('px', 3), cm.sp('pb', 4))}>{nav}</div>
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        {/*
          Desktop chrome — page title + search + theme + user menu, the old
          sticky content top bar. md+-only: the shell's mobile TopBar replaces
          it below the breakpoint (non-duplicating surface swap).
        */}
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 8),
            'sticky top-0 z-30 hidden h-14 shrink-0 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/40 md:flex',
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 4 })}>
            <h2
              className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}
            >
              {pageTitle}
            </h2>
          </div>
          <div className={cm.flex({ align: 'center', gap: 4 })}>
            <div className={cm.cn(cm.flex({ align: 'center' }), 'relative')}>
              <span
                className={cm.cn(
                  cm.textSize('lg'),
                  'material-symbols-outlined absolute left-3 text-on-surface-variant/60',
                )}
                aria-hidden="true"
              >
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={t(
                  'common.search',
                  {},
                  { defaultValue: 'Search meetings, recordings…' },
                )}
                placeholder={t(
                  'common.search',
                  {},
                  { defaultValue: 'Search meetings, recordings…' },
                )}
                className={cm.cn(
                  cm.sp('pl', 10),
                  cm.sp('pr', 4),
                  cm.textSize('sm'),
                  'w-72 py-1.5 bg-surface-container-low border-none rounded-lg text-on-surface placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all',
                )}
              />
            </div>
            {/* Theme + account chrome — styled so they don't render as bare
                browser controls on the glass header. */}
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                'border-l border-outline-variant/40 pl-3',
              )}
            >
              <div className="text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container">
                <ThemeToggle />
              </div>
              <div className="text-on-surface-variant hover:text-on-surface transition-colors">
                <UserMenu />
              </div>
            </div>
          </div>
        </header>
        <div className={cm.cn('w-full p-4 md:p-8')}>
          <div className={cm.cn(cm.mxAuto, cm.maxW('2xl'), 'w-full max-w-[1400px]')}>
            <Outlet />
          </div>
        </div>
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
