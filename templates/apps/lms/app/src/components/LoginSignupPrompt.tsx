import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function LoginSignupPrompt() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.sp('mt', 10), cm.textCenter)}>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}
        <Link
          className={cm.cn(
            'text-primary font-semibold hover:underline decoration-2 underline-offset-4 ml-1',
          )}
          to="/signup"
        >
          {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
        </Link>
      </p>
    </div>
  )
}

export default LoginSignupPrompt
export { LoginSignupPrompt }
