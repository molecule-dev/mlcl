import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

const NAV_KEYS = [
  { to: '/inbox', key: 'inbox', defaultLabel: 'Inbox', icon: 'inbox' },
  { to: '/contacts', key: 'contacts', defaultLabel: 'Contacts', icon: 'group' },
  { to: '/groups', key: 'groups', defaultLabel: 'Groups', icon: 'forum' },
  { to: '/archive', key: 'archive', defaultLabel: 'Archive', icon: 'archive' },
  { to: '/search', key: 'search', defaultLabel: 'Search', icon: 'search' },
  {
    to: '/notifications',
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', key: 'settings', defaultLabel: 'Settings', icon: 'settings' },
] as const

function useNavItems() {
  const { t } = useTranslation()
  return NAV_KEYS.map((item) => ({
    to: item.to,
    key: item.key,
    icon: item.icon,
    label: t(`hushLayout.nav.${item.key}`, {}, { defaultValue: item.defaultLabel }),
  }))
}

/**
 * Authenticated app chrome — the shared ResponsiveAppShell. The top bar
 * (brand + new-message action) renders on every breakpoint; the nav lives in
 * a desktop sidebar (≥768px) and in the mobile dialog drawer (<768px, opened
 * by the shell-owned menu trigger), with the UserMenu in whichever nav
 * container is mounted. The shell owns the breakpoint signal, drawer state,
 * focus trap, and close-on-navigation.
 */

function BrandLink() {
  const cm = getClassMap()
  return (
    <Link
      to="/inbox"
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.fontWeight('bold'),
        cm.textSize('lg'),
        'tracking-tight min-w-0',
      )}
    >
      <span
        className={cm.cn(
          cm.w(8),
          cm.h(8),
          cm.flex({ align: 'center', justify: 'center' }),
          'rounded-xl bg-gradient-to-br from-primary to-secondary text-white shrink-0',
        )}
      >
        <span
          className="material-symbols-outlined text-base"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          lock
        </span>
      </span>
      <span className="truncate">{APP_NAME}</span>
    </Link>
  )
}

function NewMessageLink() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Link
      to="/conversations/new"
      aria-label={t('inbox.newLabel', {}, { defaultValue: 'New message' })}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        'w-11 h-11 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors shrink-0',
      )}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        edit_square
      </span>
    </Link>
  )
}

function HushNav() {
  const cm = getClassMap()
  const location = useLocation()
  const navItems = useNavItems()
  return (
    <>
      {navItems.map((item) => {
        const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
        return (
          <NavLink
            key={item.key}
            to={item.to}
            data-mol-id={`nav-${item.key}`}
            aria-current={active ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.roundedFull,
              active
                ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                : cm.cn(cm.textMuted, cm.link),
            )}
          >
            {item.icon ? (
              <span className="material-symbols-outlined" aria-hidden="true">
                {item.icon}
              </span>
            ) : null}
            <span>{item.label}</span>
          </NavLink>
        )
      })}
    </>
  )
}

export function HushLayout() {
  const { t } = useTranslation()
  const navAriaLabel = t('hushLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  return (
    <ResponsiveAppShell sidebarWidth="md">
      <ResponsiveAppShell.TopBar brand={<BrandLink />} actions={<NewMessageLink />} />
      <ResponsiveAppShell.Sidebar navLabel={navAriaLabel} footer={<UserMenu />}>
        <HushNav />
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer navLabel={navAriaLabel} footer={<UserMenu />}>
        <HushNav />
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
