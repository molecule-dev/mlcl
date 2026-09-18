import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingTopNavBar } from '../components/LandingTopNavBar.js'

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const SECTIONS: Section[] = [
  {
    id: 'acceptable',
    titleKey: 'terms.useTitle',
    titleDefault: 'Acceptable use',
    bodyKey: 'terms.useBody',
    bodyDefault:
      'You may only record meetings you have permission to record under applicable law. You are responsible for notifying participants and obtaining consent where required. We do not allow harassing, illegal, or rights-infringing content on the service.',
  },
  {
    id: 'subscription',
    titleKey: 'terms.subscriptionTitle',
    titleDefault: 'Subscriptions and billing',
    bodyKey: 'terms.subscriptionBody',
    bodyDefault:
      'Paid plans renew automatically until cancelled. You can cancel at any time from your account settings; cancellations take effect at the end of the current billing period. Refunds are processed in line with the policy disclosed at checkout.',
  },
  {
    id: 'data',
    titleKey: 'terms.dataTitle',
    titleDefault: 'Your content',
    bodyKey: 'terms.dataBody',
    bodyDefault:
      'You retain ownership of meeting recordings, transcripts, and notes you create with {{appName}}. You grant us the limited rights needed to operate the service: storing your audio, generating transcripts and summaries, and showing them back to you and the team members you invite.',
  },
  {
    id: 'termination',
    titleKey: 'terms.terminationTitle',
    titleDefault: 'Termination',
    bodyKey: 'terms.terminationBody',
    bodyDefault:
      'You may delete your account at any time. We may suspend or terminate accounts that violate these terms or that pose a security risk to other users.',
  },
  {
    id: 'contact',
    titleKey: 'nav.contact',
    titleDefault: 'Contact',
    bodyKey: 'terms.contactBody',
    bodyDefault:
      'Questions about these terms should be sent to legal@murmur.app. We will respond within ten business days.',
  },
]

export function Terms() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<LandingTopNavBar />}
      footer={<LandingFooter />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
      subtitle={t(
        'terms.intro',
        { appName: APP_NAME },
        {
          defaultValue:
            'These terms govern your use of {{appName}}. By creating an account, recording or uploading meetings, or otherwise using the service, you agree to the terms below.',
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
