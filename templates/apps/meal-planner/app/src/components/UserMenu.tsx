import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, usePanelClose, UserMenu as MoleculeUserMenu } from '@molecule/app-ui-react'

/**
 * UserMenu trigger in the Simmer top bar.
 *
 * Fleet-standard shared `UserMenu` from @molecule/app-ui-react — a 'user'
 * icon button (data-mol-id="user-menu") that opens a drawer panel with the
 * signed-in user's identity, a Settings link, and a sign-out button. Panel
 * content dismisses the drawer via `usePanelClose()`.
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
  const { user, logout } = useAuth<UserProfile>()

  return (
    <div className={cm.cn(cm.sp('p', 5), 'space-y-4 w-72')}>
      <header className={cm.cn(cm.sp('pb', 4), 'border-b border-outline/30')}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
          {user?.name ?? t('userMenu.guestName', {}, { defaultValue: 'Your account' })}
        </p>
        {user?.email ? (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{user.email}</p>
        ) : null}
      </header>
      <nav
        className={cm.cn('space-y-1')}
        aria-label={t('userMenu.navLabel', {}, { defaultValue: 'Account menu' })}
      >
        <Link
          to="/settings"
          onClick={onClose}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'block rounded-lg text-on-surface hover:bg-primary-container/50 transition-colors',
          )}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </Link>
        <Link
          to="/recipes"
          onClick={onClose}
          data-mol-id="user-menu-recipes"
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'block rounded-lg text-on-surface hover:bg-primary-container/50 transition-colors',
          )}
        >
          {t('simmer.nav.recipes', {}, { defaultValue: 'Recipes' })}
        </Link>
      </nav>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          await logout()
          onClose()
        }}
      >
        {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
      </Button>
    </div>
  )
}
