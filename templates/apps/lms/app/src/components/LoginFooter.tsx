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
    <footer
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'between', gap: 4 }),
        cm.sp('py', 8),
        cm.sp('px', 8),
        cm.mxAuto,
        cm.maxW('screen-2xl'),
        cm.w('full'),
        'bg-surface-secondary md:flex-row',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 6 }))}>
        <span className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
          {t(
            'loginFooter.copyright',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}} LMS. The Digital Curator.' },
          )}
          {' — Built with '}
          <a
            href="https://molecule.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline font-medium"
          >
            Molecule.dev
          </a>
        </span>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 8 }))}>
        <LegalModalLinks
          linkClassName={cm.cn(
            'text-foreground-secondary text-sm hover:text-foreground dark:hover:text-white transition-all',
          )}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
          termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
        />
        <Link
          className={cm.cn(
            'text-foreground-secondary text-sm hover:text-foreground dark:hover:text-white transition-all',
          )}
          to="/help"
        >
          {t('loginFooter.contactSupport', {}, { defaultValue: 'Contact Support' })}
        </Link>
      </div>
    </footer>
  )
}

export default LoginFooter
export { LoginFooter }
