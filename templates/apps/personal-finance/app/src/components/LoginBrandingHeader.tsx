import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function LoginBrandingHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'sm' }))}>
      <div
        className={cm.cn(
          cm.w(12),
          cm.h(12),
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('mb', 2),
          'primary-gradient',
        )}
      >
        <span
          className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-white')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          account_balance
        </span>
      </div>
      <h1
        className={cm.cn(
          cm.textSize('4xl'),
          cm.textPrimary,
          'font-headline font-extrabold tracking-tighter',
        )}
      >
        {t('loginBrandingHeader.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
      </h1>
      <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}>
        {t('loginBrandingHeader.tagline', {}, { defaultValue: 'The Financial Curator' })}
      </p>
    </header>
  )
}

export default LoginBrandingHeader
export { LoginBrandingHeader }
