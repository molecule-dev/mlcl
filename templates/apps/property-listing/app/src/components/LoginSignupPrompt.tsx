import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function LoginSignupPrompt() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <>
      {/* Footer Link */}
      <div className={cm.cn(cm.textCenter)}>
        <p className={cm.cn('text-on-surface-variant')}>
          {t('auth.login.dontHaveAccount', {}, { defaultValue: "Don't have an account?" })}
          <Link className={cm.cn('text-primary font-bold ml-1 hover:underline')} to="/signup">
            {t('login.signUpLink', {}, { defaultValue: 'Sign Up' })}
          </Link>
        </p>
      </div>
    </>
  )
}
export default LoginSignupPrompt
