import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function LoginBrandHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), cm.sp('mb', 10))}>
      <div
        className={cm.cn(
          cm.w(12),
          cm.h(12),
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('mb', 6),
          'architect-gradient rounded-xl shadow-lg shadow-primary/20',
        )}
      >
        <span
          className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-white')}
          data-icon="architecture"
        >
          architecture
        </span>
      </div>
      <h1
        className={cm.cn(
          cm.textSize('2xl'),
          'font-extrabold tracking-tight text-on-surface font-headline uppercase',
        )}
      >
        {t('loginBrandHeader.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
      </h1>
      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.sp('mt', 2),
          cm.fontWeight('medium'),
          'text-on-surface-variant tracking-wide',
        )}
      >
        {t('loginBrandHeader.tagline', {}, { defaultValue: 'PRECISION ARCHITECTED DATA' })}
      </p>
    </div>
  )
}

export default LoginBrandHeader
export { LoginBrandHeader }
