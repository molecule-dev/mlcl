/**
 * Three-pane Inbox shell — 64px icon rail, 340px conversation list,
 * fluid chat panel, optional 320px customer panel. Wraps page-level
 * children inside the AppLayout so the header / footer / locale chrome
 * stays consistent with the rest of the app.
 *
 * Layout per DESIGN.md "Layout > Agent Sidebar / Conversation List
 * Width / Customer Detail Panel".
 *
 * Mobile shell (<768px): the icon rail hides and a sticky top bar takes
 * over — hamburger opens a nav drawer (or a back arrow on detail routes
 * like /conversation/:id), the section title sits center, UserMenu right.
 * Panes collapse to one-at-a-time: list pages show the conversation list
 * full width, detail routes show the thread full width at viewport height
 * so the composer stays reachable without page scroll.
 */
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
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
 *  for the detail pane and the hamburger for a back arrow. */
function detailBackTo(pathname: string): string | null {
  if (pathname.startsWith('/conversation/')) return '/inbox'
  if (/^\/contacts\/.+/.test(pathname)) return '/contacts'
  return null
}

function InboxLayout({ list, main, side }: InboxLayoutProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const backTo = detailBackTo(location.pathname)
  const isDetail = backTo !== null
  const activeNav = [...NAV_ITEMS]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))

  // Close the drawer whenever the route changes (nav selection or back).
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Escape closes the drawer (keyboard equivalent of the backdrop click).
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const iconButtonClass = cm.cn(
    cm.flex({ align: 'center', justify: 'center' }),
    cm.w(10),
    cm.h(10),
    'rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors',
  )

  return (
    <div
      className={cm.cn(
        cm.flex({ gap: 0 }),
        'flex-col md:flex-row md:min-h-[640px] bg-surface rounded-xl shadow-sm md:overflow-hidden border border-[color:var(--color-border)]',
      )}
    >
      {/* Mobile top bar — replaces the icon rail below md. Sticky against
          the page (the card only clips overflow on md+, where the bar is
          hidden anyway). */}
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 2 }),
          cm.sp('px', 3),
          'md:hidden sticky top-0 z-30 h-14 shrink-0 rounded-t-xl bg-secondary text-white border-b border-white/10',
        )}
      >
        {isDetail ? (
          <Link
            to={backTo}
            className={iconButtonClass}
            aria-label={t('common.back', {}, { defaultValue: 'Back' })}
            data-mol-id="mobile-bar-back"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }} aria-hidden="true">
              arrow_back
            </span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={iconButtonClass}
            aria-label={t('inboxLayout.openMenu', {}, { defaultValue: 'Open navigation menu' })}
            aria-expanded={drawerOpen}
            data-mol-id="mobile-bar-menu"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }} aria-hidden="true">
              menu
            </span>
          </button>
        )}
        <span
          className={cm.cn(cm.flex1, cm.fontWeight('bold'), 'min-w-0 truncate')}
          data-mol-id="mobile-bar-title"
        >
          {activeNav ? t(activeNav.key, {}, { defaultValue: activeNav.defaultValue }) : APP_NAME}
        </span>
        <UserMenu className="text-white!" />
      </div>

      {/* Desktop icon rail */}
      <nav
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 2 }),
          cm.sp('py', 4),
          'hidden md:flex w-16 bg-secondary text-white shrink-0 md:rounded-l-xl',
        )}
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            location.pathname === item.to ||
            (item.to === '/inbox' && location.pathname.startsWith('/conversation'))
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                'rounded-lg transition-colors',
                isActive
                  ? 'bg-surface/15 text-white'
                  : 'text-white/60 hover:text-white hover:bg-surface/10',
              )}
              aria-label={t(item.key, {}, { defaultValue: item.defaultValue })}
              aria-current={isActive ? 'page' : undefined}
              data-mol-id={`rail-${item.to.slice(1) || 'root'}`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {item.icon}
              </span>
            </Link>
          )
        })}
        <div className={cm.cn(cm.flex1)} aria-hidden="true" />
        <UserMenu className="text-white!" />
      </nav>

      {/* Conversation list pane — full width on mobile list pages, hidden
          on mobile detail routes (the back arrow returns to it). */}
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

      {/* Main pane — on mobile list pages with a list pane, the detail body
          waits behind navigation; detail routes get the full viewport height
          so the chat thread scrolls internally and the composer stays put. */}
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

      {/* Mobile nav drawer */}
      {drawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('inboxLayout.navDrawerLabel', {}, { defaultValue: 'Navigation' })}
          className="md:hidden fixed inset-0 z-50"
          data-mol-id="mobile-drawer"
        >
          <div
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-foreground/50"
          />
          <nav
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 1 }),
              cm.sp('p', 3),
              'absolute left-0 top-0 h-full w-72 max-w-[85%] bg-secondary text-white overflow-y-auto shadow-xl',
            )}
          >
            {NAV_ITEMS.map((item) => {
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
                      ? 'bg-surface/15 text-white'
                      : 'text-white/70 hover:text-white hover:bg-surface/10',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  data-mol-id={`drawer-${item.to.slice(1) || 'root'}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    {item.icon}
                  </span>
                  {t(item.key, {}, { defaultValue: item.defaultValue })}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </div>
  )
}

export default InboxLayout
export { InboxLayout }
