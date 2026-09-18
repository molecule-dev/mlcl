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
    id: 'accounts',
    titleKey: 'terms.accountsTitle',
    titleDefault: 'Accounts and content',
    bodyKey: 'terms.accountsBody',
    bodyDefault:
      'You are responsible for keeping your account credentials secure and for all activity under your account. You retain ownership of the projects, animations, layers, and assets you upload; we only use them to provide the service to you.',
  },
  {
    id: 'billing',
    titleKey: 'terms.billingTitle',
    titleDefault: 'Billing and plans',
    bodyKey: 'terms.billingBody',
    bodyDefault:
      'Paid plans (Pro, Team) are billed in advance through our payment provider. You can cancel at any time from Settings; cancellations take effect at the end of the current billing period.',
  },
  {
    id: 'acceptable',
    titleKey: 'terms.acceptableTitle',
    titleDefault: 'Acceptable use',
    bodyKey: 'terms.acceptableBody',
    bodyDefault:
      'You agree not to upload content that infringes on intellectual property rights, contains malicious code, or violates applicable law. We may suspend accounts that abuse the service or harm other users.',
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
            'These terms govern your use of {{appName}}, an online motion-design and animation tool. By creating an account or using the service, you agree to the terms below.',
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
