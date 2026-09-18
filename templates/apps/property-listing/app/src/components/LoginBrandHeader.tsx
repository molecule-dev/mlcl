import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export function LoginBrandHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'sm' }))}>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(12),
          cm.h(12),
          cm.sp('mb', 2),
          'bg-primary rounded-lg rotate-3',
        )}
      >
        <span
          className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined text-on-primary')}
          data-icon="domain"
        >
          domain
        </span>
      </div>
      <h2
        className={cm.cn(
          cm.textSize('2xl'),
          cm.textPrimary,
          'font-headline font-extrabold tracking-tighter',
        )}
      >
        {t('app.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
      </h2>
    </div>
  )
}
export default LoginBrandHeader
