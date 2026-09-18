import { Link } from 'react-router'

import { useAuth, useHttpClient, useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Icon, SidebarUserCard, usePanelClose } from '@molecule/app-ui-react'

export function UserMenu() {
  return (
    <SidebarUserCard ariaLabelKey="userMenu.open">
      <UserMenuPanel />
    </SidebarUserCard>
  )
}

interface AccountUser {
  name?: string | null
  email?: string | null
}

function UserMenuPanel() {
  const onClose = usePanelClose()
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth<AccountUser>()
  const http = useHttpClient()
  const { mode, toggleTheme } = useTheme()
  const user = auth.user

  return (
    <div className={cm.cn(cm.sp('p', 5), 'space-y-4 w-72')}>
      <header className={cm.cn(cm.sp('pb', 4), 'border-b border-outline-variant')}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {user?.name ?? t('userMenu.guestName', {}, { defaultValue: 'Counsel' })}
        </p>
        {user?.email ? (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{user.email}</p>
        ) : null}
      </header>
      <nav
        className={'space-y-1'}
        aria-label={t('nav.accountMenu', {}, { defaultValue: 'Account menu' })}
      >
        <Link
          to="/settings"
          onClick={onClose}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'block rounded-md hover:bg-surface-container',
          )}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </Link>
        <Link
          to="/templates"
          onClick={onClose}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'block rounded-md hover:bg-surface-container',
          )}
        >
          {t('nav.templates', {}, { defaultValue: 'Templates' })}
        </Link>
        <button
          type="button"
          data-testid="user-menu-theme-toggle"
          onClick={toggleTheme}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'flex w-full items-center justify-between rounded-md hover:bg-surface-container',
          )}
        >
          <span>
            {mode === 'dark'
              ? t('userMenu.lightMode', {}, { defaultValue: 'Switch to light mode' })
              : t('userMenu.darkMode', {}, { defaultValue: 'Switch to dark mode' })}
          </span>
          <Icon name={mode === 'dark' ? 'sun' : 'moon'} size={16} />
        </button>
      </nav>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          // [M1-1] The persistent credential is the httpOnly `token` cookie.
          // auth.logout() only POSTs to the logout route while it still holds
          // the in-memory bearer token — gone after any full page load (the
          // cookie alone restores the session). Clear it server-side
          // explicitly via the bonded, credentialed HTTP client so the cookie
          // doesn't survive sign-out and silently re-authenticate the next
          // load. Route: `POST /users/logout` (same-origin, sends the cookie).
          await http
            .post('/api/users/logout', undefined, { withCredentials: true })
            .catch(() => undefined)
          await auth.logout()
          onClose()
        }}
      >
        {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
      </Button>
    </div>
  )
}
