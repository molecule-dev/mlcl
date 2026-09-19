import { useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SafeLink } from './SafeLink.js'
function LoginTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const isSignInActive = location.pathname === '/login'
  const isSignupActive = location.pathname === '/signup'
  return (
    <header className={cm.cn(cm.w('full'), 'fixed top-0 z-50 bg-background/80 backdrop-blur-md')}>
      <nav
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          'max-w-7xl',
          cm.mxAuto,
        )}
      >
        <SafeLink to="/" className={cm.fvf99bd6e7}>
          {t('common.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </SafeLink>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <SafeLink
            aria-current={isSignInActive ? 'page' : undefined}
            className={cm.cn(
              'font-serif italic tracking-tight font-medium duration-200 ease-in-out',
              isSignInActive
                ? 'text-foreground border-b border-stone-900 scale-95'
                : 'text-foreground-secondary hover:text-primary transition-colors',
            )}
            to="/login"
          >
            {t('common.signIn', {}, { defaultValue: 'Sign In' })}
          </SafeLink>
          <SafeLink
            aria-current={isSignupActive ? 'page' : undefined}
            className={cm.cn(
              'px-6 py-2 rounded-full font-label text-xs uppercase tracking-widest font-semibold transition-all',
              isSignupActive
                ? 'bg-primary-container text-on-primary'
                : 'bg-primary hover:bg-primary-container text-on-primary',
            )}
            to="/signup"
          >
            {t('common.getStarted', {}, { defaultValue: 'Get started' })}
          </SafeLink>
        </div>
      </nav>
    </header>
  )
}

export default LoginTopNavBar
export { LoginTopNavBar }
