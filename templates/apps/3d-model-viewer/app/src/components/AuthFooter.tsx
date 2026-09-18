import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
export function AuthFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <footer
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.sp('py', 6),
        cm.w('full'),
        cm.fontWeight('medium'),
        "fixed bottom-0 opacity-60 bg-transparent text-primary font-['Inter'] text-[11px] uppercase tracking-[0.05em] z-10 pointer-events-none",
      )}
    >
      <div>
        {t(
          'authFooter.copyright',
          { year: new Date().getFullYear(), appName: APP_NAME },
          { defaultValue: '© {{year}} {{appName}} Visualization. Precision Crafted.' },
        )}
      </div>
      <div className={cm.cn(cm.flex({ gap: 6 }), 'pointer-events-auto')}>
        <LegalModalLinks
          linkClassName={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
          termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
        />
      </div>
    </footer>
  )
}

export default AuthFooter
