import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
  bodyValues?: Record<string, string>
}

const SECTIONS: Section[] = [
  {
    id: 'collected',
    titleKey: 'privacy.section.collected.title',
    titleDefault: '1. Information we collect',
    bodyKey: 'privacy.section.collected.body',
    bodyDefault:
      'We collect account details (name, email, company), the financial records you upload (invoices, expenses, customers, payments), and standard service-operation logs (IP, user-agent, timestamps).',
  },
  {
    id: 'use',
    titleKey: 'privacy.section.use.title',
    titleDefault: '2. How we use information',
    bodyKey: 'privacy.section.use.body',
    bodyDefault:
      'Information is used to operate the service, generate the reports and PDFs you request, send transactional email through Mailgun, and process payments through Stripe. We do not sell or rent personal information.',
  },
  {
    id: 'processors',
    titleKey: 'privacy.section.processors.title',
    titleDefault: '3. Service providers',
    bodyKey: 'privacy.section.processors.body',
    bodyDefault:
      'We use Stripe for billing, Mailgun for transactional email, and a managed PostgreSQL provider for storage. Each processor handles only the data necessary for its function and is bound by a data-protection agreement.',
  },
  {
    id: 'security',
    titleKey: 'privacy.section.security.title',
    titleDefault: '4. Security',
    bodyKey: 'privacy.section.security.body',
    bodyDefault:
      'Data is encrypted in transit (TLS 1.2+) and at rest. Access to production systems is restricted by single sign-on with hardware-key-backed multi-factor authentication and audited quarterly.',
  },
  {
    id: 'rights',
    titleKey: 'privacy.section.rights.title',
    titleDefault: '5. Your rights',
    bodyKey: 'privacy.section.rights.body',
    bodyDefault:
      'You may export your data at any time from Settings, request deletion of your account, or update your contact details directly. We honor GDPR and CCPA requests within thirty days.',
  },
  {
    id: 'contact',
    titleKey: 'privacy.section.contact.title',
    titleDefault: '6. Contact',
    bodyKey: 'privacy.section.contact.body',
    bodyDefault:
      'Questions about this Policy can be sent to privacy@{{app}}.example. Our data-protection officer responds to all inquiries within five business days.',
  },
]

export function Privacy() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
      subtitle={t(
        'privacy.intro',
        { app: APP_NAME },
        {
          defaultValue:
            'This Privacy Policy describes how {{app}} collects, uses, and discloses information about businesses that use the service.',
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
              {t(s.bodyKey, s.id === 'contact' ? { app: APP_NAME } : {}, {
                defaultValue: s.bodyDefault,
              })}
            </p>
          </section>
        ))}
      </div>
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
