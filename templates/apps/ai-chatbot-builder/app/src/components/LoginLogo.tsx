import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function LoginLogo() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 group')}>
      <div
        className={cm.cn(
          cm.w(10),
          cm.h(10),
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          'bg-gradient-to-tr from-primary to-secondary text-white shadow-lg',
        )}
      >
        <span
          className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}
          data-icon="auto_awesome"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          auto_awesome
        </span>
      </div>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.textSize('2xl'),
          'font-headline tracking-tight text-primary',
        )}
      >
        {t('loginLogo.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
      </span>
    </div>
  )
}

export default LoginLogo
export { LoginLogo }
