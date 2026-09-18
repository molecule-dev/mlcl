import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SafeLink } from './SafeLink.js'

interface AccountUser {
  name?: string | null
  email?: string | null
}

export function UserMenu() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth<AccountUser>()
  const user = auth.user

  return (
    <div data-mol-id="user-menu" className={cm.cn(cm.sp('p', 2), 'space-y-2')}>
      <div className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), cm.textSize('sm'))}>
        <span className={cm.cn(cm.fontWeight('semibold'), 'block truncate')}>
          {user?.name ??
            user?.email ??
            t('userMenu.guestName', {}, { defaultValue: 'Account holder' })}
        </span>
        {user?.email ? (
          <span className={cm.cn(cm.textSize('xs'), 'block truncate text-on-surface-variant')}>
            {user.email}
          </span>
        ) : null}
      </div>
      <nav
        className={cm.cn('space-y-1')}
        aria-label={t('nav.accountMenu', {}, { defaultValue: 'Account menu' })}
      >
        <SafeLink
          to="/notifications"
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'block rounded-md hover:bg-surface-container',
          )}
        >
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </SafeLink>
        <button
          type="button"
          onClick={() => {
            void auth.logout()
          }}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'block w-full text-left rounded-md hover:bg-surface-container text-error',
          )}
        >
          {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
        </button>
      </nav>
    </div>
  )
}
