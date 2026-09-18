import { Link } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, SidebarUserCard, usePanelClose } from '@molecule/app-ui-react'

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
  const user = auth.user

  return (
    <div className={cm.cn(cm.sp('p', 5), 'space-y-4 w-72')}>
      <header className={cm.cn(cm.sp('pb', 4), 'border-b border-outline-variant')}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {user?.name ?? t('nav.you', {}, { defaultValue: 'You' })}
        </p>
        {user?.email ? (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{user.email}</p>
        ) : null}
      </header>
      <nav
        className={cm.stack(1)}
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
          to="/projects"
          onClick={onClose}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'block rounded-md hover:bg-surface-container',
          )}
        >
          {t('nav.projects', {}, { defaultValue: 'Projects' })}
        </Link>
        <Link
          to="/labels"
          onClick={onClose}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'block rounded-md hover:bg-surface-container',
          )}
        >
          {t('userMenu.labels', {}, { defaultValue: 'Labels' })}
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
