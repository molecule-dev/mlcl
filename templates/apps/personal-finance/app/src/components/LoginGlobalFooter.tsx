import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
function LoginGlobalFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const securityUnavailableLabel = t(
    'loginGlobalFooter.securityUnavailable',
    {},
    { defaultValue: 'Security center is not available in this build yet.' },
  )
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'between' }),
        cm.sp('px', 12),
        cm.sp('py', 8),
        cm.w('full'),
        'fixed bottom-0 md:flex-row gap-6',
      )}
    >
      <span
        className={cm.cn(
          cm.textSize('lg'),
          'font-black text-primary font-headline tracking-tighter',
        )}
      >
        {t('loginGlobalFooter.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
      </span>
      <p
        className={cm.cn(
          cm.fontWeight('semibold'),
          'font-inter text-[10px] uppercase tracking-[0.2em] text-foreground-secondary',
        )}
      >
        {t(
          'loginGlobalFooter.copyright',
          { year: new Date().getFullYear(), appName: APP_NAME },
          { defaultValue: '© {{year}} {{appName}} Financial Services. All rights reserved.' },
        )}
      </p>
      <nav className={cm.cn(cm.flex(), 'gap-6')}>
        <LegalModalLinks
          show="both"
          linkClassName={cm.cn(
            'font-inter text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground-secondary hover:text-primary transition-colors',
          )}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
          termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
        />
        <button
          type="button"
          disabled
          title={securityUnavailableLabel}
          className={cm.cn(
            cm.fontWeight('semibold'),
            'font-inter text-[10px] uppercase tracking-[0.2em] text-foreground-tertiary transition-colors opacity-60 cursor-not-allowed bg-transparent border-0 p-0',
          )}
        >
          {t('nav.security', {}, { defaultValue: 'Security' })}
        </button>
      </nav>
    </div>
  )
}

export default LoginGlobalFooter
export { LoginGlobalFooter }
