import { Link } from 'react-router'

import { AppHeader } from '@molecule/app-header-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Shared header for the public/content pages (Landing uses its own inline
 * header). Signed-in visitors get the {@link UserMenu} drawer; signed-out
 * visitors get Sign in / Start free links so an anonymous visitor never
 * sees the account/billing/sign-out panel. Mirrors Landing's auth branch.
 */
export function Header() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <AppHeader
      appName={APP_NAME}
      logoSize={LOGO_SIZE}
      themeToggle={<ThemeToggle />}
      userMenu={
        isAuthenticated ? (
          <UserMenu />
        ) : (
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/login"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 5),
                'h-10 inline-flex items-center rounded-full bg-primary text-on-primary text-sm font-semibold hover:bg-primary-hover transition-colors',
              )}
            >
              {t('common.startFree', {}, { defaultValue: 'Start free' })}
            </Link>
          </div>
        )
      }
    />
  )
}
