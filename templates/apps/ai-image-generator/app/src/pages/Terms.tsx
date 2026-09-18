import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const SECTIONS: Section[] = [
  {
    id: 'account',
    titleKey: 'nav.yourAccount',
    titleDefault: 'Your account',
    bodyKey: 'terms.account.body',
    bodyDefault:
      'You are responsible for keeping your account credentials secure and for all activity that occurs under your account. You must be at least 13 years old to use {{appName}}, and you must provide accurate information when registering.',
  },
  {
    id: 'acceptable',
    titleKey: 'terms.acceptableUse.title',
    titleDefault: 'Acceptable use',
    bodyKey: 'terms.acceptableUse.body',
    bodyDefault:
      'You agree not to use {{appName}} to generate content that depicts minors in a sexual context, that infringes another person’s intellectual property, that is intended to deceive (deepfakes of real individuals without consent), or that violates applicable law. We may suspend or terminate accounts that violate this acceptable use policy.',
  },
  {
    id: 'ip',
    titleKey: 'terms.ip.title',
    titleDefault: 'Intellectual property',
    bodyKey: 'terms.ip.body',
    bodyDefault:
      'You retain ownership of the prompts you submit and, to the extent permitted by law, the images you generate. You grant {{appName}} a non-exclusive license to host, display, and process your generations to operate the service. We retain all rights in the {{appName}} software, brand, and underlying models.',
  },
  {
    id: 'liability',
    titleKey: 'terms.liability.title',
    titleDefault: 'Limitation of liability',
    bodyKey: 'terms.liability.body',
    bodyDefault:
      '{{appName}} is provided on an “as is” basis without warranties of any kind. To the maximum extent permitted by law, our aggregate liability for any claim arising from the service is limited to the fees you paid us in the twelve months preceding the claim.',
  },
  {
    id: 'law',
    titleKey: 'terms.law.title',
    titleDefault: 'Governing law and disputes',
    bodyKey: 'terms.law.body',
    bodyDefault:
      'These terms are governed by the laws of the State of Delaware, United States, without regard to conflict of laws principles. Any disputes arising out of or relating to these terms or the service will be resolved in the state or federal courts located in Wilmington, Delaware, and you consent to exclusive jurisdiction in those courts.',
  },
  {
    id: 'contact',
    titleKey: 'terms.contact.title',
    titleDefault: 'Contact us',
    bodyKey: 'terms.contact.body',
    bodyDefault: 'Questions about these terms can be sent to legal@reverie.app.',
  },
]

export function Terms() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
      subtitle={t(
        'terms.intro',
        { appName: APP_NAME },
        {
          defaultValue:
            'These Terms of Service govern your use of {{appName}}. By creating an account or generating images you agree to these terms. Please read them carefully.',
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
              {t(s.bodyKey, { appName: APP_NAME }, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
