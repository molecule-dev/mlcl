import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function LoginHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.textCenter, cm.sp('mb', 8), cm.w('full'))}>
      <h1
        className={cm.cn(
          cm.textSize('4xl'),
          cm.textPrimary,
          cm.sp('mb', 2),
          'font-headline font-black tracking-tighter',
        )}
      >
        {t('loginHeader.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
      </h1>
      <p className={cm.cn(cm.textSize('sm'), 'font-body text-on-surface-variant')}>
        {t('loginHeader.subtitle', {}, { defaultValue: 'Sign in to your studio' })}
      </p>
    </div>
  )
}

export default LoginHeader
export { LoginHeader }
