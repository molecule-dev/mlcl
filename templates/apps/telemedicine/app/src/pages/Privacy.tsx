import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
  interp?: Record<string, string>
}

const SECTIONS: Section[] = [
  {
    id: 'collect',
    titleKey: 'privacy.collect.title',
    titleDefault: 'Information we collect',
    bodyKey: 'privacy.collect.body',
    bodyDefault:
      'Account details (name, email), clinical information you share with your provider during a visit, and routine session telemetry needed to keep your account secure.',
  },
  {
    id: 'use',
    titleKey: 'privacy.use.title',
    titleDefault: 'How we use it',
    bodyKey: 'privacy.use.body',
    bodyDefault:
      'To deliver care, send appointment reminders, route prescriptions, and improve service reliability. We never sell your data and never share clinical information with advertisers.',
  },
  {
    id: 'rights',
    titleKey: 'privacy.rights.title',
    titleDefault: 'Your rights',
    bodyKey: 'privacy.rights.body',
    bodyDefault:
      'You can request an export, correction, or deletion of your record at any time from Settings → Account, or by emailing privacy@solace.health.',
  },
  {
    id: 'contact',
    titleKey: 'nav.contact',
    titleDefault: 'Contact',
    bodyKey: 'privacy.contact.body',
    bodyDefault:
      'Questions? Reach our HIPAA Privacy Officer at privacy@solace.health. We respond within five business days.',
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
      title={t('privacy.title', {}, { defaultValue: 'Privacy Notice' })}
    >
      <p
        data-mol-id="privacy-intro"
        className={cm.cn(cm.textSize('base'), cm.sp('mb', 8), 'font-body text-on-surface-variant')}
      >
        {t(
          'privacy.intro',
          { appName: APP_NAME },
          {
            defaultValue:
              '{{appName}} treats every encounter as protected health information. This notice describes what data we collect, how we use it, and the choices you have.',
          },
        )}
      </p>
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
