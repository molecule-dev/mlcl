import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-react'

/**
 * Sift's user menu — the standard user-icon trigger
 * (data-mol-id="user-menu") opening a drawer panel with the signed-in
 * user's identity, profile/settings links, and a sign-out button.
 * Panel content dismisses the drawer via `usePanelClose()`.
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
  const auth = useAuth<UserProfile>()
  const user = auth.user

  const linkClass = cm.cn(
    cm.sp('px', 3),
    cm.sp('py', 2),
    cm.textSize('sm'),
    'block rounded-md hover:bg-surface-container',
  )

  return (
    <div className={cm.cn(cm.sp('p', 5), 'space-y-4 w-72')}>
      <header className={cm.cn(cm.sp('pb', 4), 'border-b border-outline-variant')}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {user?.name || t('userMenu.guestName', {}, { defaultValue: 'Reviewer' })}
        </p>
        {user?.email ? (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{user.email}</p>
        ) : null}
      </header>
      <nav
        className={cm.cn('space-y-1')}
        aria-label={t('nav.accountMenu', {}, { defaultValue: 'Account menu' })}
      >
        <Link to="/profile" onClick={onClose} className={linkClass}>
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </Link>
        <Link to="/settings" onClick={onClose} className={linkClass}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </Link>
      </nav>
      <Button
        variant="outline"
        size="sm"
        data-mol-id="user-menu-sign-out"
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
