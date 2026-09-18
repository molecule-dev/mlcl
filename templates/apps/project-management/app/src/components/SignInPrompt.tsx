import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function SignInPrompt() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.textCenter}>
      <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}>
        {t('auth.login.alreadyHaveAccount', {}, { defaultValue: 'Already have an account?' })}
        <Link
          className={cm.cn('text-primary font-bold hover:underline underline-offset-4 ml-1')}
          to="/login"
        >
          {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
        </Link>
      </p>
    </div>
  )
}
export { SignInPrompt }
