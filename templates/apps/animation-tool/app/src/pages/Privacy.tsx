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
    id: 'collect',
    titleKey: 'privacy.collectTitle',
    titleDefault: 'What we collect',
    bodyKey: 'privacy.collectBody',
    bodyDefault:
      'We collect the email address you sign up with, the projects, layers, keyframes, assets, and exports you create, and basic technical information (browser type, IP address, error logs) needed to operate the service. We do not sell your data.',
  },
  {
    id: 'use',
    titleKey: 'privacy.useTitle',
    titleDefault: 'How we use it',
    bodyKey: 'privacy.useBody',
    bodyDefault: `Your data powers your account, your projects, billing for paid plans, and product analytics that help us improve ${APP_NAME}. Payment processing is handled by our payment provider; we never store your full card number.`,
  },
  {
    id: 'choices',
    titleKey: 'privacy.choicesTitle',
    titleDefault: 'Your choices',
    bodyKey: 'privacy.choicesBody',
    bodyDefault:
      'You can export or delete any project at any time from the editor. To close your account and remove your data, contact support and we will process the request within 30 days.',
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
      title={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
      subtitle={t(
        'privacy.intro',
        { appName: APP_NAME },
        {
          defaultValue:
            'We respect your privacy. This page describes what data we collect when you use {{appName}}, how we use it, and the choices you have over your information.',
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
              {t(s.bodyKey, {}, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
      </div>
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
