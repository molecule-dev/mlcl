import { Link } from 'react-router'

import { AppHeader } from '@molecule/app-header-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR, LOGO_SIZE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Public-page header user area: the authenticated account menu when signed
 * in, or Sign in / Request access links for anonymous visitors. Without the
 * signed-out branch a logged-out visitor on /about, /pricing, /terms, or
 * /privacy would see a "Guest" account card that opens the settings/logout
 * drawer.
 */
function HeaderUserArea() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  if (isAuthenticated) return <UserMenu />

  return (
    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
      <Link
        to="/login"
        className={cm.cn(
          'text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors',
        )}
      >
        {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
      </Link>
      <Link
        to="/signup"
        className={cm.cn(
          'px-4 py-2 rounded-md text-sm font-semibold transition-all hover:opacity-90',
        )}
        style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary, #ffffff)' }}
      >
        {t('login.signUp', {}, { defaultValue: 'Request access' })}
      </Link>
    </div>
  )
}

export function Header() {
  return (
    <AppHeader
      appName={APP_NAME}
      logoSize={LOGO_SIZE}
      fixed={false}
      themeToggle={<ThemeToggle />}
      userMenu={<HeaderUserArea />}
    />
  )
}
