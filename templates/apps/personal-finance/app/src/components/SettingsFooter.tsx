import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
function SettingsFooter() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <footer
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 12),
        cm.sp('py', 8),
        'mt-20 border-t border-border text-foreground-tertiary',
      )}
    >
      <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))}>
        {t(
          'settingsFooter.copyright',
          { year: new Date().getFullYear(), appName: APP_NAME },
          { defaultValue: '© {{year}} {{appName}} Financial Services. All rights reserved.' },
        )}
      </p>
      <div className={cm.cn(cm.flex({ gap: 'lg' }))}>
        <LegalModalLinks
          linkClassName={cm.cn(
            'text-[10px] font-bold uppercase tracking-widest hover:text-primary transition-colors',
          )}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
          termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
        />
      </div>
    </footer>
  )
}

export default SettingsFooter
export { SettingsFooter }
