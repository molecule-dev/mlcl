import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { SafeLink } from './SafeLink.js'
import { UserMenu } from './UserMenu.js'

const NAV_ITEMS = [
  { to: '/dashboard', key: 'nav.dashboard', fallback: 'Dashboard', icon: 'dashboard' },
  { to: '/issues', key: 'sideNavBar.issues', fallback: 'Issues', icon: 'mail' },
  { to: '/subscribers', key: 'sideNavBar.subscribers', fallback: 'Subscribers', icon: 'group' },
  { to: '/settings', key: 'nav.settings', fallback: 'Settings', icon: 'settings' },
] as const

interface CurrentUser {
  id?: string
  email?: string
  name?: string
}

/**
 * StudioLayout — the authenticated creator shell, composed from the shared
 * `ResponsiveAppShell`: the Sidebar mounts only ≥768px, the mobile Drawer
 * (same nav element, full dialog contract — focus trap, Escape/backdrop
 * close, scroll lock) only below it, and the TopBar renders the menu trigger
 * itself. The shell owns the breakpoint split, the drawer open state, and
 * the auto-close-on-navigation; this component only supplies nav + brand.
 */
export function StudioLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { logout, user } = useAuth()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<CurrentUser | null>(null)
  useEffect(() => {
    const userId = (user as { id?: string } | null)?.id
    if (!userId) return
    void http
      .get<CurrentUser>(`/api/users/${userId}`)
      .then((res) => setProfile(res?.data ?? null))
      .catch(() => undefined)
  }, [http, user])

  const navItemActive = cm.cn(
    cm.flex({ align: 'center' }),
    cm.sp('px', 3),
    'gap-3 py-2.5 text-[var(--color-status-published)] dark:text-secondary-container bg-surface-container-lowest rounded-lg shadow-sm border-l-4 border-primary transition-transform',
  )
  const navItemInactive = cm.cn(
    cm.flex({ align: 'center' }),
    cm.sp('px', 3),
    'gap-3 py-2.5 border-l-4 border-transparent text-on-surface-variant hover:bg-surface-container rounded-lg transition-all duration-300',
  )

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same element, and only the mounted breakpoint instantiates it, so the
  // links are never duplicated in the DOM. `aria-current` marks the active
  // item (consumer's job per the shell contract); /issues lit for its detail
  // and editor routes too.
  const nav = (
    <>
      {NAV_ITEMS.map((item) => {
        const active =
          item.to === '/issues'
            ? pathname === '/issues' || pathname.startsWith('/issues/')
            : pathname === item.to
        return (
          <SafeLink
            key={item.to}
            to={item.to}
            data-mol-id={`nav-${item.to.slice(1)}`}
            aria-current={active ? 'page' : undefined}
            className={active ? navItemActive : navItemInactive}
          >
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
              {item.icon}
            </span>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                "font-['Inter'] tracking-wide uppercase",
              )}
            >
              {t(item.key, {}, { defaultValue: item.fallback })}
            </span>
          </SafeLink>
        )
      })}
    </>
  )

  // The old fixed TopNavBar surfaced a "New issue" action on every studio
  // page except the dashboard — kept 1:1 so the create path (and its e2e id)
  // survives the migration.
  const showNewIssue = pathname !== '/dashboard'

  const handleSignOut = async (): Promise<void> => {
    await logout()
    navigate('/login')
  }
  const displayName =
    profile?.name?.trim() ||
    profile?.email?.trim() ||
    (user as { email?: string } | null)?.email ||
    t('nav.editor', {}, { defaultValue: 'Editor' })
  const footer = (
    <div className={cm.cn(cm.sp('pt', 4), 'mt-auto border-t border-outline-variant/10')}>
      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4), cm.sp('px', 2))}
      >
        <div
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'overflow-hidden bg-primary text-on-primary font-bold',
          )}
          aria-hidden="true"
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className={cm.flex({ direction: 'col' })}>
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-on-surface')}>
            {displayName}
          </span>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t('nav.editor', {}, { defaultValue: 'Editor' })}
          </span>
        </div>
      </div>
      <button
        type="button"
        data-mol-id="side-nav-sign-out"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.w('full'),
          'text-left text-on-surface-variant hover:text-error transition-colors rounded-lg',
        )}
        onClick={() => void handleSignOut()}
      >
        <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>logout</span>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wider',
          )}
        >
          {t('sideNavBar.signOut', {}, { defaultValue: 'Sign Out' })}
        </span>
      </button>
    </div>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      <ResponsiveAppShell.TopBar
        brand={
          <SafeLink
            className={cm.cn(
              cm.textSize('2xl'),
              "font-['Newsreader'] font-black text-on-background",
            )}
            to="/dashboard"
          >
            {t('sideNavBar.dispatch', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </SafeLink>
        }
        actions={
          <>
            {showNewIssue && (
              <button
                type="button"
                onClick={() => navigate('/issues/new')}
                aria-label={t('issues.newIssue', {}, { defaultValue: 'New issue' })}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary uppercase tracking-widest hover:bg-primary-container transition-all',
                )}
                data-mol-id="topnav-new-issue"
              >
                {t('issues.newIssue', {}, { defaultValue: 'New issue' })}
              </button>
            )}
            <ThemeToggle />
            <UserMenu dataMolId="topnav-account" />
          </>
        }
      />
      <ResponsiveAppShell.Sidebar className={cm.sp('p', 6)} footer={footer}>
        {nav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer
        className={cm.sp('p', 6)}
        header={
          <span
            className={cm.cn(
              cm.textSize('2xl'),
              "font-['Newsreader'] font-black text-on-background",
            )}
          >
            {t('sideNavBar.dispatch', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </span>
        }
        footer={footer}
      >
        {nav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default StudioLayout
