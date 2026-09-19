import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SafeLink } from './SafeLink.js'

interface CurrentUser {
  id?: string
  email?: string
  name?: string
}

export default function SideNavBar() {
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
  const handleSignOut = async () => {
    await logout()
    navigate('/login')
  }
  const displayName =
    profile?.name?.trim() ||
    profile?.email?.trim() ||
    (user as { email?: string } | null)?.email ||
    t('nav.editor', {}, { defaultValue: 'Editor' })
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
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.h('full'),
        cm.sp('p', 6),
        'fixed left-0 top-0 w-[240px] z-50 bg-surface-container-low border-r border-transparent',
      )}
    >
      <div className={cm.cn(cm.sp('mb', 10))}>
        <h1
          className={cm.cn(cm.textSize('2xl'), "font-['Newsreader'] font-black text-on-background")}
        >
          {t('sideNavBar.dispatch', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </h1>
        <p
          className={cm.cn(
            cm.fontWeight('medium'),
            cm.sp('mt', 1),
            "font-['Inter'] text-[10px] tracking-widest uppercase text-on-surface-variant",
          )}
        >
          {t('sideNavBar.newsletterSuite', {}, { defaultValue: 'Newsletter Suite' })}
        </p>
      </div>
      <nav className={cm.cn(cm.flex1, cm.stack(1))}>
        <SafeLink
          className={pathname === '/dashboard' ? navItemActive : navItemInactive}
          to="/dashboard"
        >
          <span
            className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
            data-icon="dashboard"
          >
            dashboard
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              "font-['Inter'] tracking-wide uppercase",
            )}
          >
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </span>
        </SafeLink>
        <SafeLink
          className={
            pathname === '/issues' || pathname.startsWith('/issues/')
              ? navItemActive
              : navItemInactive
          }
          to="/issues"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')} data-icon="mail">
            mail
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              "font-['Inter'] tracking-wide uppercase",
            )}
          >
            {t('sideNavBar.issues', {}, { defaultValue: 'Issues' })}
          </span>
        </SafeLink>
        <SafeLink
          className={pathname === '/subscribers' ? navItemActive : navItemInactive}
          to="/subscribers"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')} data-icon="group">
            group
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              "font-['Inter'] tracking-wide uppercase",
            )}
          >
            {t('sideNavBar.subscribers', {}, { defaultValue: 'Subscribers' })}
          </span>
        </SafeLink>
        <SafeLink
          className={pathname === '/settings' ? navItemActive : navItemInactive}
          to="/settings"
        >
          <span
            className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
            data-icon="settings"
          >
            settings
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              "font-['Inter'] tracking-wide uppercase",
            )}
          >
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </span>
        </SafeLink>
      </nav>
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
        <SafeLink
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            'text-on-surface-variant hover:text-primary rounded-lg transition-colors',
          )}
          to="/settings"
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>settings</span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider',
            )}
          >
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </span>
        </SafeLink>
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
    </aside>
  )
}
export { SideNavBar }
