import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

/**
 * Boilerplate Privacy page — links exist throughout the app (footer,
 * signup), so the route is wired with sensible default copy that the
 * tenant can override via i18n. Real production deployments should
 * substitute their own legal-reviewed text.
 */

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
  withApp?: boolean
}

const SECTIONS: Section[] = [
  {
    id: 'intro',
    titleKey: 'privacy.dataTitle',
    titleDefault: 'Data we collect',
    bodyKey: 'privacy.intro',
    bodyDefault:
      '{{app}} stores only the data needed to review your pull requests — repository metadata you connect, the diffs you submit, the rules you author, and notifications we deliver to you. We never share customer data with third parties for marketing.',
    withApp: true,
  },
  {
    id: 'retention',
    titleKey: 'privacy.retentionTitle',
    titleDefault: 'Data retention',
    bodyKey: 'privacy.dataRetention',
    bodyDefault:
      'Review history, custom rules, and webhook audit logs are retained for the lifetime of your account. Deleting your account purges all owned data immediately.',
  },
  {
    id: 'contact',
    titleKey: 'nav.contact',
    titleDefault: 'Contact',
    bodyKey: 'privacy.contact',
    bodyDefault:
      'Questions about your data? Email privacy@example.com and we will respond within seven business days.',
  },
]

export function Privacy() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
      subtitle={t(
        'privacy.subtitle',
        { app: APP_NAME },
        {
          defaultValue:
            'How {{app}} collects, uses, and protects information about the developers who connect repositories and submit pull requests.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        {SECTIONS.map((s) => (
          <section key={s.id} data-mol-id={`privacy-${s.id}`} className={cm.cn(cm.stack(2))}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
              {t(s.titleKey, {}, { defaultValue: s.titleDefault })}
            </h2>
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(s.bodyKey, s.withApp ? { app: APP_NAME } : {}, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
      </div>
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
