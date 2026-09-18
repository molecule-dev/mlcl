import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function LoginSignupPrompt() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.sp('mt', 10), cm.textCenter)}>
      <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}>
        {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}

        <Link className={cm.fv5e9a3b86} to="/signup">
          {t('loginSignupPrompt.signUp', {}, { defaultValue: 'Sign Up' })}
        </Link>
      </p>
    </div>
  )
}

export default LoginSignupPrompt
export { LoginSignupPrompt }
