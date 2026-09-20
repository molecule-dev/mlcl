import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function LoginLogo() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }))}>
      <div
        className={cm.cn(
          cm.w(12),
          cm.h(12),
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('mb', 4),
          'rounded-xl bg-login-gradient login-card-shadow',
        )}
      >
        <span
          className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-white')}
          data-icon="cloud_done"
        >
          cloud_done
        </span>
      </div>
      <h1
        className={cm.cn(
          cm.textSize('xl'),
          cm.fontWeight('bold'),
          'tracking-tight text-on-surface',
        )}
      >
        {t('app.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
      </h1>
    </div>
  )
}

export default LoginLogo
export { LoginLogo }
