import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function LoginHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.textCenter, cm.stack(2))}>
      <h1
        className={cm.cn(
          cm.textSize('3xl'),
          'font-headline font-extrabold text-on-surface tracking-tight',
        )}
      >
        {t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      </h1>
      <p className={cm.cn(cm.fontWeight('medium'), 'text-on-surface-variant')}>
        {t('loginHeader.subtitle', {}, { defaultValue: 'Sign in to your chatbot workspace' })}
      </p>
    </div>
  )
}

export default LoginHeader
export { LoginHeader }
