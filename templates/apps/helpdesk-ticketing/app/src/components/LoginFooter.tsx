import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

function LoginFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const legalLinkClass = cm.cn(
    'text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest hover:text-primary transition-colors',
  )
  return (
    <footer
      className={cm.cn(
        cm.sp('mt', 12),
        cm.flex({ direction: 'col', align: 'center' }),
        cm.stack(4),
      )}
    >
      <div className={cm.cn(cm.flex({ wrap: 'wrap', justify: 'center' }), 'gap-x-8 gap-y-2')}>
        <LegalModalLinks
          linkClassName={legalLinkClass}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
          termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
        />
      </div>
      <p className={cm.cn('text-[10px] text-foreground-secondary uppercase tracking-wider')}>
        {t(
          'loginFooter.copyright',
          { year: new Date().getFullYear(), appName: APP_NAME },
          { defaultValue: '© {{year}} {{appName}} Support' },
        )}
      </p>
    </footer>
  )
}

export default LoginFooter
export { LoginFooter }
