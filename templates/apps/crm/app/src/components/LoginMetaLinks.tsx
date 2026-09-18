import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

function LoginMetaLinks() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.sp('mt', 6), cm.flex({ justify: 'center', gap: 'lg' }))}>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          // outline (#94a3b8) was 2.5:1 on white (axe serious); on-surface-variant = 7.3:1
          'text-[10px] uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {t('nav.security', {}, { defaultValue: 'Security' })}
      </span>
      <LegalModalLinks
        show="privacy"
        linkClassName={cm.fv8b754ad1}
        appName={APP_NAME}
        loadContent={loadContent}
        privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
      />
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          // outline (#94a3b8) was 2.5:1 on white (axe serious); on-surface-variant = 7.3:1
          'text-[10px] uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {t('loginMetaLinks.version', { version: '2.4.0' }, { defaultValue: 'v{{version}}' })}
      </span>
    </div>
  )
}

export default LoginMetaLinks
export { LoginMetaLinks }
