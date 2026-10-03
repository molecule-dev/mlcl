import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
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
 * Authenticated app chrome — the shared ResponsiveAppShell. The TopBar is
 * `mobileOnly` (brand + new-message action + the shell's menu trigger, below
 * 768px only — the shell suppresses any bar rendered beside the Sidebar on
 * desktop); the nav lives in a desktop sidebar (≥768px: brand above the nav,
 * new-message + UserMenu in the footer) and in the mobile dialog drawer
 * (<768px, opened by the shell-owned menu trigger, UserMenu footer). The
 * shell owns the breakpoint signal, drawer state, focus trap, and
 * close-on-navigation.
 */

function BrandLink() {
  const cm = getClassMap()
  return (
    <Link to="/inbox" className={cm.cn('min-w-0 shrink-0')} aria-label={APP_NAME}>
      <BrandWordmark as="span" size="md" />
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
  const cm = getClassMap()
  const { t } = useTranslation()
  const navAriaLabel = t('hushLayout.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  // Brand block — mounted by the mobile TopBar AND the desktop Sidebar (never
  // simultaneously: the Sidebar is unmounted below 768px and the mobileOnly
  // TopBar returns null above it).
  const brand = <BrandLink />

  return (
    <ResponsiveAppShell sidebarWidth="md">
      <ResponsiveAppShell.TopBar mobileOnly brand={brand} actions={<NewMessageLink />} />
      {/* Desktop keeps brand + user affordances in the Sidebar: brand above
          the nav; new-message action beside the UserMenu in the shell's
          bordered footer row. */}
      <ResponsiveAppShell.Sidebar
        navLabel={navAriaLabel}
        footer={
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              cm.w('full'),
            )}
          >
            <UserMenu />
            <NewMessageLink />
          </div>
        }
      >
        <div className={cm.sp('px', 3)}>{brand}</div>
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
