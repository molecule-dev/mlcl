import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function LoginFormHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.textCenter, cm.sp('mb', 10))}>
      <h1
        className={cm.cn(
          cm.sp('mb', 2),
          cm.fontWeight('bold'),
          cm.textSize('4xl'),
          'font-headline leading-tight tracking-tight text-on-background',
        )}
      >
        {t('loginFormHeader.welcomeBack', {}, { defaultValue: 'Welcome back.' })}
      </h1>
      <p className={cm.cn(cm.textSize('sm'), 'font-body text-on-surface-variant tracking-wide')}>
        {t('loginFormHeader.signInTo', {}, { defaultValue: 'Sign in to your account' })}
      </p>
    </div>
  )
}

export default LoginFormHeader
export { LoginFormHeader }
