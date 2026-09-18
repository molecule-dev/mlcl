import { Link } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-react'

/**
 * User-account icon in the top bar — the shared `UserMenu` trigger
 * (`data-mol-id="user-menu"`) opening a drawer panel with the signed-in
 * user's identity, account links and a sign-out button. The shared
 * component closes the drawer automatically on route change, and the
 * panel content dismisses itself via `usePanelClose()`.
 */
export function UserMenu() {
  return (
    <MoleculeUserMenu>
      <UserMenuPanel />
    </MoleculeUserMenu>
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
  const user = auth.user

  return (
    <div className={cm.cn(cm.sp('p', 5), 'space-y-4 w-72')}>
      <header className={cm.cn(cm.sp('pb', 4), 'border-b border-outline-variant/15')}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
          {user?.name ?? t('userMenu.guestName', {}, { defaultValue: 'Creator' })}
        </p>
        {user?.email ? (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{user.email}</p>
        ) : null}
      </header>
      <nav
        className={cm.cn('space-y-1')}
        aria-label={t('nav.accountMenu', {}, { defaultValue: 'Account menu' })}
      >
        <Link
          to="/settings"
          onClick={onClose}
          data-mol-id="user-menu-settings"
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'block rounded-xl hover:bg-primary/10 hover:text-primary transition-colors',
          )}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </Link>
        <Link
          to="/profile/me"
          onClick={onClose}
          data-mol-id="user-menu-profile"
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'block rounded-xl hover:bg-primary/10 hover:text-primary transition-colors',
          )}
        >
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </Link>
      </nav>
      <Button
        variant="outline"
        size="sm"
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
