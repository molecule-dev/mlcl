import { Link } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-react'

interface AccountUser {
  name?: string | null
  email?: string | null
}

/**
 * Shared user menu — the account icon rendered in every top bar.
 * Opens a drawer with the signed-in user's identity, quick links,
 * and a sign-out button (or sign-in/sign-up links for anonymous
 * visitors on the public pages).
 */
export function UserMenu() {
  return (
    <MoleculeUserMenu>
      <UserMenuPanel />
    </MoleculeUserMenu>
  )
}

function UserMenuPanel() {
  const onClose = usePanelClose()
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth<AccountUser>()
  const user = auth.user
  const navItemClass = cm.cn(
    cm.sp('px', 3),
    cm.sp('py', 2),
    cm.textSize('sm'),
    'block rounded-md hover:bg-surface-container',
  )

  if (!user) {
    return (
      <nav
        className={cm.cn(cm.sp('p', 5), 'w-72 space-y-1')}
        aria-label={t('nav.accountMenu', {}, { defaultValue: 'Account menu' })}
      >
        <Link to="/login" onClick={onClose} className={navItemClass}>
          {t('login.submit', {}, { defaultValue: 'Sign In' })}
        </Link>
        <Link to="/signup" onClick={onClose} className={navItemClass}>
          {t('signup.submit', {}, { defaultValue: 'Create Account' })}
        </Link>
      </nav>
    )
  }

  return (
    <div className={cm.cn(cm.sp('p', 5), 'w-72 space-y-4')}>
      <header className={cm.cn(cm.sp('pb', 4), 'border-b border-outline-variant/30')}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}>
          {user.name || user.email || t('userMenu.guestName', {}, { defaultValue: 'Account' })}
        </p>
        {user.name && user.email ? (
          <p className={cm.cn(cm.textSize('xs'), 'truncate text-on-surface-variant')}>
            {user.email}
          </p>
        ) : null}
      </header>
      <nav
        className={'space-y-1'}
        aria-label={t('nav.accountMenu', {}, { defaultValue: 'Account menu' })}
      >
        <Link to="/settings" onClick={onClose} className={navItemClass}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </Link>
        <Link to="/notifications" onClick={onClose} className={navItemClass}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </Link>
        <Link to="/help" onClick={onClose} className={navItemClass}>
          {t('help.title', {}, { defaultValue: 'Help & support' })}
        </Link>
      </nav>
      <Button
        variant="outline"
        size="sm"
        data-mol-id="user-menu-signout"
        onClick={async () => {
          await auth.logout()
          onClose()
        }}
      >
        {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
      </Button>
    </div>
  )
}

export default UserMenu
