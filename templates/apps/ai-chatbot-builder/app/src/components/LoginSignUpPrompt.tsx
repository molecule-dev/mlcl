import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function LoginSignUpPrompt() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}>
      {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}

      <Link
        className={cm.cn('text-primary font-bold hover:underline underline-offset-4 ml-1')}
        to="/signup"
      >
        {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
      </Link>
    </p>
  )
}

export default LoginSignUpPrompt
export { LoginSignUpPrompt }
