import { Link } from 'react-router'

import { AppHeader } from '@molecule/app-header-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker } from '@molecule/app-ui-react'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Right-side auth actions for the public-page header: signed-in visitors
 * get the shared user-menu drawer; signed-out visitors get Sign in /
 * Create account links instead of an account panel they can't use.
 */
function HeaderAuthActions() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  if (isAuthenticated) return <UserMenu />
  return (
    <>
      <Link
        to="/login"
        data-mol-id="nav-sign-in"
        className={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))}
      >
        {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
      </Link>
      <Link
        to="/signup"
        data-mol-id="nav-create-account"
        className={cm.cn(cm.button({ variant: 'solid', size: 'sm' }))}
      >
        {t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
      </Link>
    </>
  )
}

export function Header() {
  return (
    <AppHeader
      appName={APP_NAME}
      logoSize={LOGO_SIZE}
      fixed={false}
      themeToggle={<ThemeToggle />}
      extraActions={<LanguagePicker display="icon" />}
      userMenu={<HeaderAuthActions />}
    />
  )
}
