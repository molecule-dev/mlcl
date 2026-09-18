import React from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export function AgentProfileTopNavBar() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <header
      className={cm.cn(cm.w('full'), 'top-0 sticky bg-surface z-50 shadow-sm dark:shadow-none')}
    >
      <nav
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.w('full'),
          cm.sp('px', 8),
          cm.sp('py', 3),
          cm.mxAuto,
          'max-w-screen-2xl',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xl' }))}>
          <span
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              "text-success font-['Manrope'] tracking-tight",
            )}
          >
            {t('brand.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </span>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'hidden md:flex')}>
            <Link
              className={cm.cn(
                cm.fontWeight('medium'),
                'text-foreground-secondary hover:text-success dark:hover:text-emerald-300 transition-colors',
              )}
              to="/"
            >
              {t('navigation.properties', {}, { defaultValue: 'Properties' })}
            </Link>
          </div>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <Link
            className={cm.cn(
              cm.fontWeight('bold'),
              "text-success font-['Manrope'] tracking-tight hover:opacity-80 transition-all duration-200",
            )}
            to="/login"
          >
            {t('common.signIn', {}, { defaultValue: 'Sign In' })}
          </Link>
        </div>
      </nav>
    </header>
  )
}

export default AgentProfileTopNavBar
