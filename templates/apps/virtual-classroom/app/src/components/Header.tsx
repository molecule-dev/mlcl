import { Link } from 'react-router'

import { AppHeader } from '@molecule/app-header-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

export function Header() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  // Signed-out visitors (About / Pricing / Terms / Privacy) get Sign in /
  // Create account actions — never the authenticated account-settings drawer.
  if (!isAuthenticated) {
    return (
      <AppHeader
        appName={APP_NAME}
        logoSize={LOGO_SIZE}
        themeToggle={<ThemeToggle />}
        userMenu={
          <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
            <Link
              to="/login"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface hover:text-primary transition-colors',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link
              to="/signup"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-xl bg-primary text-on-primary hover:bg-primary-dark transition-colors',
              )}
            >
              {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
            </Link>
          </div>
        }
      />
    )
  }

  return (
    <AppHeader
      appName={APP_NAME}
      logoSize={LOGO_SIZE}
      themeToggle={<ThemeToggle />}
      userMenu={<UserMenu />}
    />
  )
}
