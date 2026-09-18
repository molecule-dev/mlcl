import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { PublicHeader } from '../components/PublicHeader.js'

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const SECTIONS: Section[] = [
  {
    id: 'eligibility',
    titleKey: 'terms.eligibilityHeading',
    titleDefault: 'Eligibility',
    bodyKey: 'terms.eligibility',
    bodyDefault:
      'You must be at least 18 years old, a resident of a supported country, and provide accurate identity information. We may refuse, restrict, or close any account at our discretion.',
  },
  {
    id: 'fees',
    titleKey: 'terms.feesHeading',
    titleDefault: 'Fees and limits',
    bodyKey: 'terms.fees',
    bodyDefault:
      'Free accounts include up to 5 active accounts, cards, statements, transactions, and transfers per period. Paid plans raise these limits and unlock advanced features. Fees for paid plans are billed monthly or yearly via Stripe and shown on the Pricing page before checkout.',
  },
  {
    id: 'disputes',
    titleKey: 'terms.disputesHeading',
    titleDefault: 'Disputes and termination',
    bodyKey: 'terms.disputes',
    bodyDefault:
      'You may close your account at any time from Settings. We may suspend access for suspected fraud or unpaid balances. Disputes are first resolved through our support team; unresolved disputes are handled in the jurisdiction where your account was opened.',
  },
]

export function Terms() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<PublicHeader />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
      subtitle={t(
        'terms.intro',
        { appName: APP_NAME },
        {
          defaultValue:
            'By opening a {{appName}} account you agree to the rules below. We update these terms from time to time and will email you at least 30 days before a material change takes effect.',
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
              {t(s.bodyKey, {}, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
