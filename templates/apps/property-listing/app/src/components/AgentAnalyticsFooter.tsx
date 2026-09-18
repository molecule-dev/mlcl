import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
export default function AgentAnalyticsFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <footer
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('py', 6),
        cm.sp('px', 12),
        'ml-64 bg-success-light w-[calc(100%-16rem)] mt-auto border-t border-emerald-900/5',
      )}
    >
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('medium'),
          'font-inter text-success/50 tracking-wide uppercase',
        )}
      >
        {t(
          'agentAnalyticsFooter.copyright',
          { year: new Date().getFullYear(), companyName: APP_NAME },
          { defaultValue: '© {{year}} {{companyName}}. All rights reserved.' },
        )}
      </p>
      <div className={cm.flex({ gap: 'xl' })}>
        <LegalModalLinks
          linkClassName={cm.cn(
            'text-success/50 text-xs tracking-wide uppercase font-medium hover:text-success dark:hover:text-emerald-300 transition-colors',
          )}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
          termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
        />
        <Link
          className={cm.cn(
            'text-success/50 text-xs tracking-wide uppercase font-medium hover:text-success dark:hover:text-emerald-300 transition-colors',
          )}
          to="/help"
        >
          {t('common.support', {}, { defaultValue: 'Support' })}
        </Link>
      </div>
    </footer>
  )
}
export { AgentAnalyticsFooter }
