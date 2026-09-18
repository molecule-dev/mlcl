import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
function LoginSignUpPrompt() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <p
      className={cm.cn(cm.sp('mt', 8), cm.textCenter, cm.textSize('sm'), 'text-on-surface-variant')}
    >
      {t(
        'loginSignUpPrompt.newToApp',
        { appName: APP_NAME },
        { defaultValue: 'New to {{appName}}?' },
      )}

      <Link
        className={cm.cn(
          'font-semibold text-primary hover:text-primary-container transition-colors',
        )}
        to="/signup"
      >
        {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
      </Link>
    </p>
  )
}

export default LoginSignUpPrompt
export { LoginSignUpPrompt }
