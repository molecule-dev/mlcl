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

  return (
    <AppHeader
      appName={APP_NAME}
      logoSize={LOGO_SIZE}
      fixed={false}
      themeToggle={<ThemeToggle />}
      userMenu={
        isAuthenticated ? (
          <UserMenu />
        ) : (
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <Link
              to="/login"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
              )}
            >
              {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
            </Link>
          </div>
        )
      }
    />
  )
}
