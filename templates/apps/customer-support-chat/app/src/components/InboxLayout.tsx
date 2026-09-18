/**
 * Three-pane Inbox shell — 64px icon rail, 340px conversation list,
 * fluid chat panel, optional 320px customer panel. Wraps page-level
 * children inside the AppLayout so the header / footer / locale chrome
 * stays consistent with the rest of the app.
 *
 * Layout per DESIGN.md "Layout > Agent Sidebar / Conversation List
 * Width / Customer Detail Panel".
 */
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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

function InboxLayout({ list, main, side }: InboxLayoutProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  return (
    <div
      className={cm.cn(
        cm.flex({ gap: 0 }),
        'min-h-[640px] bg-surface rounded-xl shadow-sm overflow-hidden border border-[color:var(--color-border)]',
      )}
    >
      <nav
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 2 }),
          cm.sp('py', 4),
          'w-16 bg-secondary text-white shrink-0',
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
      {list && (
        <div
          className={cm.cn(
            'w-[340px] shrink-0 border-r border-[color:var(--color-border)] overflow-y-auto bg-surface',
          )}
        >
          {list}
        </div>
      )}
      <div className={cm.cn(cm.flex1, 'min-w-0')}>{main}</div>
      {side && <div className={cm.cn('w-[320px] shrink-0 hidden xl:block')}>{side}</div>}
    </div>
  )
}

export default InboxLayout
export { InboxLayout }
