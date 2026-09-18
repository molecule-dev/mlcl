import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export default function SignupPrompt() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <>
      {/* Secondary Actions */}
      <div className={cm.textCenter}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}>
          {t('signupPrompt.leadin', { appName: APP_NAME }, { defaultValue: 'New to {{appName}}?' })}

          <Link
            className={cm.cn('text-primary font-bold hover:underline underline-offset-4 ml-1')}
            to="/signup"
          >
            {t('signupPrompt.signUp', {}, { defaultValue: 'Sign up for free' })}
          </Link>
        </p>
      </div>
    </>
  )
}
export { SignupPrompt }
