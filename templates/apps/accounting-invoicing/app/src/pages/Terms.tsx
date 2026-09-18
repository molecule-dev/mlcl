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
  withApp?: boolean
}

const SECTIONS: Section[] = [
  {
    id: 'accounts',
    titleKey: 'terms.section.accounts.title',
    titleDefault: '1. Accounts',
    bodyKey: 'terms.section.accounts.body',
    bodyDefault:
      'You must provide accurate registration information, maintain the security of your credentials, and notify us promptly of any unauthorized access. You are responsible for all activity that occurs under your account.',
  },
  {
    id: 'billing',
    titleKey: 'terms.section.billing.title',
    titleDefault: '2. Subscriptions and billing',
    bodyKey: 'terms.section.billing.body',
    bodyDefault:
      'Paid plans are billed in advance on a monthly or yearly cycle. Subscriptions renew automatically until cancelled. Refunds are issued on a pro-rated basis when service obligations are not met.',
  },
  {
    id: 'data',
    titleKey: 'terms.section.data.title',
    titleDefault: '3. Your data',
    bodyKey: 'terms.section.data.body',
    bodyDefault:
      'You retain all rights to the financial records, customer details, and other data you upload. {{app}} processes that data solely to operate the service and provide the features you have enabled.',
    withApp: true,
  },
  {
    id: 'acceptable',
    titleKey: 'terms.section.acceptable.title',
    titleDefault: '4. Acceptable use',
    bodyKey: 'terms.section.acceptable.body',
    bodyDefault:
      'You agree not to use the service to violate any law, infringe intellectual-property rights, transmit malware, or attempt to gain unauthorized access to other accounts or our infrastructure.',
  },
  {
    id: 'termination',
    titleKey: 'terms.section.termination.title',
    titleDefault: '5. Termination',
    bodyKey: 'terms.section.termination.body',
    bodyDefault:
      'You may cancel your subscription at any time from the Settings page. We may suspend or terminate accounts that violate these Terms after written notice and a reasonable opportunity to remedy.',
  },
  {
    id: 'warranty',
    titleKey: 'terms.section.warranty.title',
    titleDefault: '6. Disclaimers',
    bodyKey: 'terms.section.warranty.body',
    bodyDefault:
      'The service is provided on an "as is" basis without warranties of any kind. We do not warrant that the service will be uninterrupted, error-free, or fit for a particular accounting or tax purpose; consult a licensed professional for advice.',
  },
  {
    id: 'contact',
    titleKey: 'terms.section.contact.title',
    titleDefault: '7. Contact',
    bodyKey: 'terms.section.contact.body',
    bodyDefault:
      'Questions about these Terms can be sent to legal@{{app}}.example. We respond to all inquiries within five business days.',
    withApp: true,
  },
]

export function Terms() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
      subtitle={t(
        'terms.intro',
        { app: APP_NAME },
        {
          defaultValue:
            'These Terms of Service ("Terms") govern your access to and use of {{app}}. By creating an account or using the service you agree to be bound by them.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        {SECTIONS.map((s) => (
          <section key={s.id} data-mol-id={`terms-${s.id}`} className={cm.cn(cm.stack(2))}>
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

export default Terms
export { Terms as TermsPage }
