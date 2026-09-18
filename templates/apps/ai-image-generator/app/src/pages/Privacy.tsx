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
    titleKey: 'privacy.collect.title',
    titleDefault: 'Information we collect',
    bodyKey: 'privacy.collect.body',
    bodyDefault:
      'When you sign up we collect your name, email address, and a hashed password. As you use {{appName}} we store the prompts you submit, the images we generate for you, the styles and collections you save, and metadata such as the model used, generation timestamps, and credit balance.',
  },
  {
    id: 'use',
    titleKey: 'privacy.use.title',
    titleDefault: 'How we use your data',
    bodyKey: 'privacy.use.body',
    bodyDefault:
      'We use your personal data to authenticate you, render the gallery and collections you have created, deliver email notifications you have opted into, process payments for paid plans, and detect abuse. We do not sell your data and we do not use your private prompts or images to train third-party models without your explicit consent.',
  },
  {
    id: 'cookies',
    titleKey: 'privacy.cookies.title',
    titleDefault: 'Cookies and storage',
    bodyKey: 'privacy.cookies.body',
    bodyDefault:
      'We set a session cookie when you sign in so you stay logged in across pages, and we use browser local storage to remember theme and language preferences. You can clear these at any time from your browser settings.',
  },
  {
    id: 'rights',
    titleKey: 'privacy.rights.title',
    titleDefault: 'Your rights',
    bodyKey: 'privacy.rights.body',
    bodyDefault:
      'You can export or delete your account and all associated generations, prompts, and collections at any time from Settings. We retain backups for up to 30 days after deletion before they are purged from cold storage.',
  },
  {
    id: 'contact',
    titleKey: 'privacy.contact.title',
    titleDefault: 'Contact us',
    bodyKey: 'privacy.contact.body',
    bodyDefault:
      'For privacy enquiries you can contact us at privacy@reverie.app and we will respond within 30 days.',
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
            '{{appName}} respects your creative work and your privacy. This policy explains what personal data we collect when you use the service, how we use it, and the choices you have.',
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
              {t(s.bodyKey, { appName: APP_NAME }, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
      </div>
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
