import { Link } from 'react-router'

import { AppHeader } from '@molecule/app-header-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Signed-out affordances for the shared public-page header — mirrors the
 * Landing hero's Sign in / Create account buttons so logged-out visitors
 * on /pricing, /about, /privacy, /terms get a real auth entry point
 * instead of the (empty) signed-in user panel.
 */
function SignedOutActions() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn('flex items-center gap-2')}>
      <Link
        to="/login"
        className={cm.cn(
          'inline-flex h-8 items-center rounded border border-border bg-surface px-3 font-headline text-xs font-semibold text-text transition-colors hover:border-primary hover:text-primary',
        )}
      >
        {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
      </Link>
      <Link
        to="/signup"
        className={cm.cn(
          'inline-flex h-8 items-center rounded bg-primary px-3 font-headline text-xs font-bold text-on-primary transition-colors hover:bg-primary/90',
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
      fixed={false}
      themeToggle={<ThemeToggle />}
      userMenu={isAuthenticated ? <UserMenu /> : <SignedOutActions />}
    />
  )
}
