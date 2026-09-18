import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function LoginBranding() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 10))}>
      <div
        className={cm.cn(
          cm.w(10),
          cm.h(10),
          cm.flex({ align: 'center', justify: 'center' }),
          'scholar-gradient rounded-lg shadow-md',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-white')}
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          school
        </span>
      </div>
      <h1
        className={cm.cn(
          cm.fontWeight('bold'),
          'font-headline text-[1.75rem] text-on-surface tracking-tight',
        )}
      >
        {t('loginBranding.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
      </h1>
    </div>
  )
}

export default LoginBranding
export { LoginBranding }
