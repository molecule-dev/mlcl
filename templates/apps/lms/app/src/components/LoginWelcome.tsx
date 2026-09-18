import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function LoginWelcome() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.sp('mb', 10)}>
      <h2
        className={cm.cn(
          cm.fontWeight('semibold'),
          cm.sp('mb', 2),
          'font-headline text-[1.75rem] text-on-surface',
        )}
      >
        {t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
      </h2>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t(
          'loginWelcome.subtitle',
          {},
          { defaultValue: 'Sign in to continue your learning journey' },
        )}
      </p>
    </div>
  )
}

export default LoginWelcome
export { LoginWelcome }
