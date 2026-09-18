import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import LoginForm from './LoginForm.js'

function LoginCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      data-mol-id="login-card"
      className={cm.cn(
        cm.w('full'),
        cm.maxW('[420px]'),
        cm.sp('p', 10),
        'bg-surface-container-lowest rounded-xl relative z-10',
      )}
      style={{ boxShadow: 'var(--shadow-lg)' }}
    >
      <div className={cm.cn(cm.textCenter, cm.sp('mb', 8))}>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textPrimary,
            cm.sp('mb', 2),
            'text-[2.75rem] tracking-tight leading-none font-headline',
          )}
        >
          {t('common.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
          {t('login.subtitle', {}, { defaultValue: 'Sign in to your support console' })}
        </p>
      </div>
      <LoginForm />
      <div className={cm.cn(cm.sp('mt', 8), cm.textCenter, cm.textSize('sm'))}>
        <span className="text-on-surface-variant">
          {t('login.noAccount', {}, { defaultValue: 'Need an account?' })}
        </span>
        <Link
          data-mol-id="login-signup-link"
          className="font-medium text-primary hover:text-primary-container transition-colors ml-1"
          to="/signup"
        >
          {t('auth.signup.createAnAccount', {}, { defaultValue: 'Create an account' })}
        </Link>
      </div>
    </div>
  )
}

export default LoginCard
export { LoginCard }
