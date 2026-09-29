/**
 * Three-pane Inbox shell — nav sidebar, 340px conversation list,
 * fluid chat panel, optional 320px customer panel. Wraps page-level
 * children so the chrome stays consistent across the signed-in routes.
 *
 * Layout per DESIGN.md "Layout > Agent Sidebar / Conversation List
 * Width / Customer Detail Panel".
 *
 * Built on the shared `ResponsiveAppShell`: the shell owns the 768px
 * breakpoint split (Sidebar ≥768px / dialog Drawer <768px), the mobile
 * menu trigger, drawer focus/Escape/backdrop handling, and the
 * auto-close-on-navigation — this component only supplies the nav, the
 * brand/title, and the three panes. Panes collapse to one-at-a-time
 * below md: list pages show the conversation list full width, detail
 * routes show the thread full width at viewport height so the composer
 * stays reachable without page scroll.
 */
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { UserMenu } from './UserMenu.js'

interface InboxLayoutProps {
  list?: ReactNode
  main: ReactNode
  side?: ReactNode
}

const NAV_ITEMS = [
  { to: '/inbox', icon: 'inbox', key: 'inboxLayout.nav.inbox', defaultValue: 'Inbox' },
  { to: '/contacts', icon: 'people', key: 'inboxLayout.nav.contacts', defaultValue: 'Contacts' },
  { to: '/reports', icon: 'analytics', key: 'inboxLayout.nav.reports', defaultValue: 'Reports' },
  {
    to: '/automations',
    icon: 'auto_awesome',
    key: 'inboxLayout.nav.automations',
    defaultValue: 'Automations',
  },
  {
    to: '/notifications',
    icon: 'notifications',
    key: 'inboxLayout.nav.notifications',
    defaultValue: 'Alerts',
  },
  {
    to: '/settings',
    icon: 'settings',
    key: 'inboxLayout.nav.settings',
    defaultValue: 'Settings',
  },
]

/** Routes that drill into one entity — on mobile they swap the list pane
 *  for the detail pane and gain a back arrow in the top bar. */
function detailBackTo(pathname: string): string | null {
  if (pathname.startsWith('/conversation/')) return '/inbox'
  if (/^\/contacts\/.+/.test(pathname)) return '/contacts'
  return null
}

function InboxLayout({ list, main, side }: InboxLayoutProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()

  const backTo = detailBackTo(location.pathname)
  const isDetail = backTo !== null
  const activeNav = [...NAV_ITEMS]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))

  const navLabel = t('inboxLayout.navDrawerLabel', {}, { defaultValue: 'Navigation' })

  // ONE nav element for both surfaces — the Sidebar (≥768px) and the Drawer
  // (<768px) receive the same array and only the mounted breakpoint
  // instantiates it. The drawer closes itself on navigation (shell-owned),
  // so links carry no onClick close.
  const navItems = NAV_ITEMS.map((item) => {
    const isActive =
      location.pathname === item.to ||
      (item.to === '/inbox' && location.pathname.startsWith('/conversation'))
    return (
      <Link
        key={item.to}
        to={item.to}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 3 }),
          cm.sp('px', 3),
          cm.fontWeight('semibold'),
          'min-h-11 rounded-lg transition-colors',
          isActive
            ? 'bg-primary/10 text-primary-dark'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container',
        )}
        aria-current={isActive ? 'page' : undefined}
        data-mol-id={`nav-${item.to.slice(1) || 'root'}`}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }} aria-hidden="true">
          {item.icon}
        </span>
        {t(item.key, {}, { defaultValue: item.defaultValue })}
      </Link>
    )
  })

  const title = activeNav
    ? t(activeNav.key, {}, { defaultValue: activeNav.defaultValue })
    : APP_NAME

  return (
    <ResponsiveAppShell sidebarWidth="md" className="bg-surface">
      {/*
        Mobile top bar (<768px): back arrow on detail routes, the active
        section title, and the user menu. The shell renders the drawer menu
        trigger itself; on desktop this bar does not mount (the sidebar
        carries the brand).
      */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        className="h-14 border-b border-[color:var(--color-border)]"
        brand={
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.fontWeight('bold'),
              'min-w-0',
            )}
          >
            {isDetail && (
              <Link
                to={backTo}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(10),
                  cm.h(10),
                  'shrink-0 rounded-lg text-on-surface-variant hover:text-on-surface transition-colors',
                )}
                aria-label={t('common.back', {}, { defaultValue: 'Back' })}
                data-mol-id="mobile-bar-back"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 22 }}
                  aria-hidden="true"
                >
                  arrow_back
                </span>
              </Link>
            )}
            <span className="min-w-0 truncate" data-mol-id="mobile-bar-title">
              {title}
            </span>
          </span>
        }
        actions={<UserMenu />}
      />

      {/*
        Desktop sidebar (≥768px): brand leads, user menu sits in the bordered
        footer row (where the old icon rail kept it).
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        className={cm.sp('p', 3)}
        footer={<UserMenu />}
      >
        <Link
          to="/inbox"
          className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), 'block truncate')}
          data-mol-id="sidebar-brand"
        >
          <BrandWordmark as="span" size="sm" />
        </Link>
        {navItems}
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile nav drawer (<768px): full dialog contract (focus trap,
        Escape, backdrop click, scroll lock) over the same nav, with the
        brand in the header row next to the shell's close button.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        className="h-full"
        header={<BrandWordmark as="span" size="sm" />}
      >
        {navItems}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        {/*
          The three panes — app-level layout inside the shell's <main>.
          Conversation list is full width on mobile list pages and hidden on
          mobile detail routes (the back arrow returns to it); detail routes
          get the full viewport height (100dvh minus the 3.5rem top bar) so
          the chat thread scrolls internally and the composer stays put.
        */}
        <div className={cm.cn(cm.flex({ gap: 0 }), 'flex-col md:flex-row md:min-h-[640px]')}>
          {list && (
            <div
              className={cm.cn(
                isDetail ? 'hidden md:block' : 'w-full md:w-[340px]',
                'shrink-0 md:border-r border-b md:border-b-0 border-[color:var(--color-border)] md:overflow-y-auto bg-surface',
              )}
            >
              {list}
            </div>
          )}
          <div
            className={cm.cn(
              cm.flex1,
              'min-w-0',
              list && !isDetail ? 'hidden md:block' : undefined,
              isDetail ? 'h-[calc(100dvh-3.5rem)] md:h-auto overflow-hidden' : undefined,
            )}
          >
            {main}
          </div>
          {side && <div className={cm.cn('w-[320px] shrink-0 hidden xl:block')}>{side}</div>}
        </div>
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default InboxLayout
export { InboxLayout }
