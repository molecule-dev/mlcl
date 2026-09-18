import { Link } from 'react-router'

import { AppHeader } from '@molecule/app-header-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Right-side auth actions for the public-page header: signed-in users get
 * the shared user-menu drawer; signed-out visitors get Sign in / Create
 * account links instead of an account panel they can't use.
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
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'text-on-surface-variant hover:text-on-surface transition-colors',
        )}
      >
        {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
      </Link>
      <Link
        to="/signup"
        data-mol-id="nav-create-account"
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors',
        )}
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
      userMenu={<HeaderAuthActions />}
    />
  )
}
