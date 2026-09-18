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
  bodyValues?: Record<string, string>
}

const SECTIONS: Section[] = [
  {
    id: 'data',
    titleKey: 'privacy.dataHeading',
    titleDefault: 'What we store',
    bodyKey: 'privacy.intro',
    bodyDefault:
      '{{app}} collects only the minimum data we need to operate your continuous-delivery account: your email, the repositories you connect, the commits and build metadata your runners produce, and the secrets you choose to store with us. We never read your source code outside of the build runner; build artifacts are stored in your S3 bucket when configured.',
    bodyValues: { app: APP_NAME },
  },
  {
    id: 'processors',
    titleKey: 'privacy.processorsHeading',
    titleDefault: 'Sub-processors',
    bodyKey: 'privacy.processorsBody',
    bodyDefault:
      'We use Stripe for billing, Mailgun for transactional email, and AWS S3 for build artifact storage. Each is contractually bound to the minimum scope of data needed to deliver its service.',
  },
  {
    id: 'rights',
    titleKey: 'privacy.rightsHeading',
    titleDefault: 'Your rights',
    bodyKey: 'privacy.rightsBody',
    bodyDefault:
      'You can export every byte of your data, delete your account at any time from Settings, and request a record of every webhook delivery on your account. We respond to GDPR / CCPA requests within 30 days.',
  },
  {
    id: 'contact',
    titleKey: 'nav.contact',
    titleDefault: 'Contact',
    bodyKey: 'privacy.contact',
    bodyDefault: 'Questions? Email privacy@conduit.dev.',
  },
]

export function Privacy() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('privacy.title', {}, { defaultValue: 'Privacy policy' })}
      subtitle={t(
        'privacy.subtitle',
        { app: APP_NAME },
        {
          defaultValue:
            'How {{app}} collects, stores, and protects your data while we run your pipelines.',
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
              {t(s.bodyKey, s.bodyValues ?? {}, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
      </div>
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
