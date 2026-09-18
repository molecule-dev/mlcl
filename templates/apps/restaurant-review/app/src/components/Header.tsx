import { Link } from 'react-router'

import { AppHeader } from '@molecule/app-header-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Signed-out header actions — a plain "Sign in" link + a "Create account"
 * pill. Public pages (About, Pricing, Terms, Privacy) share this Header, so
 * a logged-out visitor must get a path into auth rather than an account
 * panel that assumes a session.
 */
function SignedOutActions() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
      <Link
        to="/login"
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'hidden sm:inline text-on-surface hover:text-primary transition-colors',
        )}
      >
        {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
      </Link>
      <Link
        to="/signup"
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors',
        )}
      >
        {t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
      </Link>
    </div>
  )
}

export function Header() {
  const isAuthenticated = useIsAuthenticated()
  return (
    <AppHeader
      appName={APP_NAME}
      logoSize={LOGO_SIZE}
      themeToggle={<ThemeToggle />}
      userMenu={isAuthenticated ? <UserMenu /> : <SignedOutActions />}
    />
  )
}
