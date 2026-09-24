/**
 * Authenticated shell for the writer pages — the shared `ResponsiveAppShell`
 * with this app's nav, brand/page title, notification count and user menu.
 *
 * The shared shell owns the breakpoint split: the Sidebar mounts only ≥768px,
 * the mobile Drawer (same nav element, full dialog contract — focus trap,
 * Escape/backdrop close, scroll lock) only below it, and the TopBar renders
 * the menu trigger itself. Page padding stays inside the pages via
 * `contentClassName`; the shell's `.Content` is a bare `<main>`.
 */
import { type ReactNode, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { SafeLink } from './SafeLink.js'
import { UserMenu } from './UserMenu.js'

interface NavItem {
  to: string
  labelKey: string
  defaultLabel: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard', defaultLabel: 'Dashboard', icon: 'dashboard' },
  { to: '/posts', labelKey: 'sideNavBar.myPosts', defaultLabel: 'My Posts', icon: 'description' },
  { to: '/tags', labelKey: 'sideNavBar.categories', defaultLabel: 'Categories', icon: 'category' },
  { to: '/analytics', labelKey: 'nav.analytics', defaultLabel: 'Analytics', icon: 'monitoring' },
  { to: '/comments', labelKey: 'sideNavBar.comments', defaultLabel: 'Comments', icon: 'forum' },
  {
    to: '/notifications',
    labelKey: 'settings.notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications',
  },
  { to: '/settings', labelKey: 'nav.settings', defaultLabel: 'Settings', icon: 'settings' },
]

/**
 * The nav links, shared by the desktop Sidebar and the mobile Drawer — the
 * shell mounts only the breakpoint's copy, so the `mobile-nav-<path>`
 * data-mol-ids are never duplicated in the DOM. Marking the current item is
 * the consumer's job: exact match, child-prefix match, and the public post
 * route lights "My Posts".
 */
function ShellNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.to ||
          pathname.startsWith(`${item.to}/`) ||
          (item.to === '/posts' && pathname.startsWith('/post/'))
        return (
          <SafeLink
            key={item.to}
            to={item.to}
            data-mol-id={`mobile-nav-${item.to.replace(/\//g, '')}`}
            aria-current={isActive ? 'page' : undefined}
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 3),
              'min-h-[44px] gap-3 py-2.5 rounded-lg text-sm font-medium uppercase tracking-wide',
              isActive
                ? 'border-l-4 border-primary text-[var(--color-status-published)] bg-surface-container-lowest shadow-sm'
                : 'border-l-4 border-transparent text-on-surface-variant hover:bg-surface-container',
            )}
          >
            <span
              className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            {t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
          </SafeLink>
        )
      })}
    </>
  )
}

interface NotificationsResponse {
  data?: { id: string }[]
  total?: number
}

interface AppShellProps {
  /** Page title — the TopBar brand (hidden on the editorial `search` pages). */
  title: string
  /** Editorial header: the search field takes the brand slot + ThemeToggle. */
  search?: boolean
  /** Extra page actions (New Tag, …) rendered before the user menu. */
  actions?: ReactNode
  /** Classes for the content `<main>` — page padding lives here. */
  contentClassName?: string
  /** `data-mol-id` for the content `<main>` (fleet locator convention). */
  contentMolId?: string
  children: ReactNode
}

/**
 * The shell every signed-in page composes into — see the module doc.
 *
 * @param props - Title/search/actions chrome plus the page content.
 */
export default function AppShell({
  title,
  search = false,
  actions,
  contentClassName,
  contentMolId,
  children,
}: AppShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { logout, user } = useAuth()
  const [notificationCount, setNotificationCount] = useState<number | null>(null)
  const { pathname } = useLocation()

  useEffect(() => {
    let cancelled = false
    http
      .get<NotificationsResponse>('/api/notifications')
      .then((res) => {
        if (cancelled) return
        const payload = res.data
        const items = payload?.data ?? []
        const count = typeof payload?.total === 'number' ? payload.total : items.length
        setNotificationCount(count)
      })
      .catch(() => {
        if (!cancelled) setNotificationCount(0)
      })
    return () => {
      cancelled = true
    }
  }, [http, pathname])

  const displayName =
    (user as { name?: string; email?: string } | null)?.name?.trim() ||
    (user as { email?: string } | null)?.email?.trim() ||
    t('nav.editor', {}, { defaultValue: 'Editor' })

  const handleSignOut = async () => {
    await logout()
    navigate('/login')
  }

  // Below-nav identity card + sign out — the same element the desktop
  // sidebar's footer and the drawer's footer mount (one per breakpoint).
  const shellFooter = (
    <>
      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 2), cm.sp('px', 2))}
      >
        <div
          className={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'bg-primary text-on-primary font-bold',
          )}
          aria-hidden="true"
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
        <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'truncate')}>
          {displayName}
        </span>
      </div>
      <button
        type="button"
        data-mol-id="mobile-nav-signout"
        onClick={() => void handleSignOut()}
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 3),
          cm.w('full'),
          'min-h-[44px] gap-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-left text-on-surface-variant hover:text-error hover:bg-error-container/20',
        )}
      >
        <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')} aria-hidden="true">
          logout
        </span>
        {t('common.logout', {}, { defaultValue: 'Logout' })}
      </button>
    </>
  )

  const nav = <ShellNav />

  return (
    <ResponsiveAppShell sidebarWidth="md">
      <ResponsiveAppShell.TopBar
        brand={
          search ? (
            <label className={cm.cn(cm.flex1, cm.w('full'), 'relative group')}>
              <span className={cm.fvca9358d4}>search</span>
              <input
                type="search"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('pl', 12),
                  cm.sp('pr', 4),
                  cm.textSize('sm'),
                  cm.roundedFull,
                  'py-2.5 bg-surface-container border border-transparent focus:border-primary/20 focus:ring-1 focus:ring-primary/10 outline-none placeholder:text-on-surface-variant/50',
                )}
                placeholder={t(
                  'topNavBar.searchPlaceholder',
                  {},
                  { defaultValue: 'Search (Cmd+K)' },
                )}
                readOnly
                aria-label={t('common.search', {}, { defaultValue: 'Search' })}
              />
            </label>
          ) : (
            <h2
              className={cm.cn(
                cm.textSize('lg'),
                'font-serif italic tracking-tight text-on-background truncate',
              )}
            >
              {title}
            </h2>
          )
        }
        actions={
          <>
            <button
              type="button"
              data-mol-id="topnav-notifications"
              aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
              onClick={() => navigate('/notifications')}
              className={cm.fv7bf6e077}
              data-icon="notifications"
            >
              notifications
              {notificationCount !== null && notificationCount > 0 && (
                <span
                  className={cm.cn(
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    'absolute min-w-[18px] h-[18px] px-1 flex items-center justify-center -top-0.5 -right-1 bg-error text-on-error text-[10px] leading-none',
                  )}
                  data-mol-id="topnav-notification-count"
                >
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            {search ? <ThemeToggle /> : null}
            {actions}
            <UserMenu dataMolId="topnav-account" />
          </>
        }
      />
      <ResponsiveAppShell.Sidebar footer={shellFooter}>{nav}</ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer
        header={
          <span
            className={cm.cn(
              cm.textSize('2xl'),
              "font-['Newsreader'] font-black text-on-background",
            )}
          >
            {t('sideNavBar.writeflow', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </span>
        }
        footer={shellFooter}
      >
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content className={contentClassName} dataMolId={contentMolId}>
        {children}
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export { AppShell }
