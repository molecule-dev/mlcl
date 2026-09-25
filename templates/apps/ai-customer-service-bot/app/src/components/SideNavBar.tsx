/**
 * Rapport side-nav CONTENT — brand, nav links and the user footer.
 *
 * This is no longer a shell: the responsive shell (desktop `<aside>` ≥768px,
 * mobile drawer below it, hamburger trigger, escape/backdrop handling) is
 * owned by `<ResponsiveAppShell>` from `@molecule/app-ui-react` and composed
 * once in `RapportLayout`. These pieces render INSIDE the shell's slots, on
 * whichever surface (sidebar/drawer) the current breakpoint mounts.
 */
import { Link, useLocation } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface AuthedUser {
  email?: string
  name?: string
}

function initialsOf(email: string | undefined): string {
  if (!email) return 'U'
  return email.slice(0, 2).toUpperCase()
}

const NAV_ITEMS = [
  {
    to: '/dashboard',
    icon: 'dashboard',
    labelKey: 'sideNavBar.dashboard',
    labelDefault: 'Dashboard',
    molId: 'nav-dashboard',
  },
  {
    to: '/conversations',
    icon: 'chat_bubble',
    labelKey: 'sideNavBar.conversations',
    labelDefault: 'Conversations',
    molId: 'nav-conversations',
  },
  {
    to: '/knowledge',
    icon: 'auto_stories',
    labelKey: 'sideNavBar.knowledge',
    labelDefault: 'Knowledge',
    molId: 'nav-knowledge',
  },
  {
    to: '/analytics',
    icon: 'analytics',
    labelKey: 'sideNavBar.analytics',
    labelDefault: 'Analytics',
    molId: 'nav-analytics',
  },
  {
    to: '/settings',
    icon: 'settings',
    labelKey: 'sideNavBar.settings',
    labelDefault: 'Settings',
    molId: 'nav-settings',
  },
  {
    to: '/profile',
    icon: 'person',
    labelKey: 'sideNavBar.profile',
    labelDefault: 'Profile',
    molId: 'nav-profile',
  },
]

/** Brand block — app name + tagline, linking home. Renders in the sidebar and as the drawer's header. */
export function SideNavBrand() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Link to="/dashboard" data-mol-id="nav-app-home">
      <h1
        className={cm.cn(
          cm.textSize('xl'),
          cm.fontWeight('bold'),
          'text-teal-900 dark:text-teal-50',
        )}
      >
        {t('sideNavBar.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
      </h1>
      <p
        className={cm.cn(
          cm.fontWeight('semibold'),
          cm.sp('mt', 1),
          'text-[0.6875rem] tracking-[0.05em] text-teal-700 dark:text-teal-300 uppercase',
        )}
      >
        {t('sideNavBar.tagline', {}, { defaultValue: 'The Human Concierge' })}
      </p>
    </Link>
  )
}

/** The six nav links — the SAME element the shell mounts as sidebar children or drawer children. */
export function SideNavLinks() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const isActive = (path: string) => location.pathname === path
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.to}
          data-mol-id={item.molId}
          to={item.to}
          aria-current={isActive(item.to) ? 'page' : undefined}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 4 }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            isActive(item.to)
              ? 'text-teal-900 dark:text-teal-50 font-semibold bg-surface/50 dark:bg-surface/10'
              : 'text-teal-700 dark:text-teal-300',
            'rounded-lg hover:scale-[1.02] hover:bg-teal-100 dark:hover:bg-teal-900 transition-all duration-300 group',
          )}
        >
          <span className="material-symbols-outlined group-hover:text-primary transition-colors">
            {item.icon}
          </span>
          <span>{t(item.labelKey, {}, { defaultValue: item.labelDefault })}</span>
        </Link>
      ))}
    </>
  )
}

/** User card + sign-out — the shell's below-nav footer slot on both surfaces. */
export function SideNavUserFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user, logout } = useAuth<AuthedUser>()
  const initials = initialsOf(user?.email)
  const displayName =
    user?.name ?? user?.email ?? t('sideNavBar.defaultName', {}, { defaultValue: 'Support agent' })

  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 3, justify: 'between' }))}>
      <Link
        to="/profile"
        data-mol-id="user-menu"
        className={cm.flex({ align: 'center', gap: 3 })}
        aria-label={t('sideNavBar.openProfile', {}, { defaultValue: 'Open profile' })}
      >
        <div
          data-mol-id="user-menu-avatar"
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            'bg-primary text-on-primary',
          )}
        >
          {initials}
        </div>
        <div>
          <p
            data-mol-id="user-menu-name"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-teal-900 dark:text-teal-50 capitalize',
            )}
          >
            {displayName}
          </p>
          <p
            className={cm.cn(
              cm.fontWeight('medium'),
              'text-[0.6875rem] text-teal-700 dark:text-teal-300 tracking-wide',
            )}
          >
            {t('sideNavBar.agentRole', {}, { defaultValue: 'Support agent' })}
          </p>
        </div>
      </Link>
      <button
        data-mol-id="user-menu-logout"
        type="button"
        onClick={() => {
          void logout()
        }}
        aria-label={t('settings.logOut', {}, { defaultValue: 'Sign out' })}
        className="text-teal-700 dark:text-teal-300 hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined">logout</span>
      </button>
    </div>
  )
}
