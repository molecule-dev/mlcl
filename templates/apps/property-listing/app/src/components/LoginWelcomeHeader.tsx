import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function LoginWelcomeHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.textCenter)}>
      <h1
        className={cm.cn(
          cm.textSize('4xl'),
          'font-extrabold',
          cm.sp('mb', 2),
          'tracking-tight text-on-surface',
        )}
      >
        {t('login.title', {}, { defaultValue: 'Welcome Back' })}
      </h1>
      <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
        {t(
          'login.subtitle',
          {},
          { defaultValue: 'Enter your details to access your curated estate portal.' },
        )}
      </p>
    </div>
  )
}
export { LoginWelcomeHeader }
