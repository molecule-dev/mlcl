/**
 * Gauge app shell — the shared `ResponsiveAppShell`
 * (@molecule/app-ui-react). Used by every authenticated screen (Surveys,
 * Builder, Responses, SurveyDetail, ResponseDetail, Analytics, Templates,
 * Settings, Profile, Notifications). Public survey + auth pages keep their
 * own framing.
 *
 * Desktop (≥768px): brand + labeled nav in the sidebar, ThemeToggle +
 * UserMenu in the sidebar footer row; the shell carries no top bar.
 * Mobile (<768px): a mobile-only top bar (brand + ThemeToggle) whose menu
 * trigger — rendered by the shell — opens the shared nav drawer with the
 * full APG dialog contract (focus trap, Escape/backdrop close, scroll
 * lock, auto-close on navigation). Replaces the former icon-rail + chip
 * nav pair, which CSS-mounted both navs at every width (duplicate nav
 * landmarks).
 *
 * The SAME nav element feeds `.Sidebar` and `.Drawer`, so only the mounted
 * breakpoint instantiates it and the links never duplicate in the DOM.
 * Page padding stays inside the pages.
 */
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { Footer } from './Footer.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

interface SurveyFeedbackToolLayoutProps {
  children: ReactNode
}

const NAV_ITEMS = [
  {
    to: '/surveys',
    icon: 'poll',
    key: 'surveys',
    defaultValue: 'Surveys',
  },
  {
    to: '/templates',
    icon: 'collections_bookmark',
    key: 'templates',
    defaultValue: 'Templates',
  },
  {
    to: '/notifications',
    icon: 'notifications',
    key: 'notifications',
    defaultValue: 'Activity',
  },
  {
    to: '/settings',
    icon: 'settings',
    key: 'settings',
    defaultValue: 'Settings',
  },
  {
    to: '/profile',
    icon: 'person',
    key: 'profile',
    defaultValue: 'Profile',
  },
] as const

function SurveyFeedbackToolLayout({ children }: SurveyFeedbackToolLayoutProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()

  const navLabel = t('nav.workspace', {}, { defaultValue: 'Workspace' })

  const navLinkClass = (isActive: boolean): string =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 3),
      cm.sp('py', 2),
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      cm.roundedFull,
      // Rows are their own tap surface — clear the ~44px minimum target.
      'min-h-[44px]',
      isActive
        ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
        : cm.cn(cm.textMuted, cm.link),
    )

  // The SAME nav element for Sidebar and Drawer — only the mounted
  // breakpoint instantiates it.
  const nav = (
    <>
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname.startsWith(item.to)
        const label = t(
          `surveyFeedbackToolLayout.nav.${item.key}`,
          {},
          { defaultValue: item.defaultValue },
        )
        return (
          <Link
            key={item.to}
            to={item.to}
            data-mol-id={`nav-${item.key}`}
            aria-current={isActive ? 'page' : undefined}
            className={navLinkClass(isActive)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {item.icon}
            </span>
            <span>{label}</span>
          </Link>
        )
      })}
    </>
  )

  // Brand mark shared by the mobile top bar, the desktop sidebar lead and
  // the drawer header — only the mounted breakpoint instantiates each.
  const brand = (
    <Link to="/surveys" className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
      <span
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(8),
          cm.h(8),
          cm.roundedFull,
          'bg-gradient-to-br from-primary to-secondary text-white',
        )}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">
          graphic_eq
        </span>
      </span>
      <span className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>{APP_NAME}</span>
    </Link>
  )

  // Nudge the shared UserMenu trigger to a 36px+ tap target.
  const userMenu = (
    <span className="inline-flex [&_button]:min-h-[36px] [&_button]:min-w-[36px]">
      <UserMenu />
    </span>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/* Mobile top bar (<768px): the shell renders the menu trigger itself
          next to the brand; the desktop shell carries no top bar. */}
      <ResponsiveAppShell.TopBar mobileOnly brand={brand} actions={<ThemeToggle />} />
      {/* Desktop sidebar (≥768px): brand leads the nav column; ThemeToggle
          + UserMenu sit in the bordered footer row, outside the nav
          landmark. */}
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        footer={
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }), 'w-full')}
          >
            {userMenu}
            <ThemeToggle />
          </div>
        }
      >
        <div className={cm.cn(cm.sp('mb', 4))}>{brand}</div>
        {nav}
      </ResponsiveAppShell.Sidebar>
      {/* Mobile drawer (<768px): the same nav element behind the full dialog
          contract; it auto-closes on navigation and on desktop-crossing. */}
      <ResponsiveAppShell.Drawer navLabel={navLabel} header={brand} footer={userMenu}>
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content className="bg-surface-secondary">
        {children}
        <Footer />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default SurveyFeedbackToolLayout
export { SurveyFeedbackToolLayout }
