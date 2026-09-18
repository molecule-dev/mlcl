import { Link } from 'react-router'

import { AppHeader } from '@molecule/app-header-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from '@molecule/app-ui-react'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/** Bell link to the activity feed — only shown once signed in. */
function NotificationsLink() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  if (!isAuthenticated) return null
  return (
    <Link
      to="/notifications"
      data-mol-id="nav-notifications"
      aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
      className={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))}
    >
      <Icon name="bell" size={20} />
    </Link>
  )
}

export function Header() {
  return (
    <AppHeader
      appName={APP_NAME}
      logoSize={LOGO_SIZE}
      themeToggle={<ThemeToggle />}
      extraActions={<NotificationsLink />}
      userMenu={<UserMenu />}
    />
  )
}
