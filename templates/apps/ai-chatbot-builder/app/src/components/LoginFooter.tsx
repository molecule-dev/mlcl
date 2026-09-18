import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
function LoginFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <footer className={cm.cn('relative z-10')}>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'between' }),
          cm.w('full'),
          cm.sp('px', 8),
          cm.sp('py', 8),
          'max-w-7xl',
          cm.mxAuto,
          'md:flex-row gap-4',
        )}
      >
        <div
          className={cm.cn(
            cm.textSize('sm'),
            "text-on-surface-variant font-['Inter'] tracking-normal",
          )}
        >
          {t(
            'loginFooter.copyright',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}}. The chatbot builder for AI-native teams.' },
          )}
        </div>
        <div className={cm.cn(cm.flex(), 'gap-6')}>
          <LegalModalLinks
            linkClassName={cm.cn(
              "text-on-surface-variant hover:text-primary transition-colors font-['Inter'] text-sm",
            )}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
          />
          <Link
            className={cm.cn(
              "text-on-surface-variant hover:text-primary transition-colors font-['Inter'] text-sm",
            )}
            to="/about"
          >
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
          <Link
            className={cm.cn(
              "text-on-surface-variant hover:text-primary transition-colors font-['Inter'] text-sm",
            )}
            to="/help"
          >
            {t('loginFooter.helpCenter', {}, { defaultValue: 'Help Center' })}
          </Link>
        </div>
      </div>
    </footer>
  )
}

export default LoginFooter
export { LoginFooter }
