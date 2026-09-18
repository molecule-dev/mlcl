import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyValues?: Record<string, string>
  bodyDefault: string
}

const SECTIONS: Section[] = [
  {
    id: 'data',
    titleKey: 'privacy.dataHeading',
    titleDefault: 'Data we collect',
    bodyKey: 'privacy.dataBody',
    bodyDefault:
      'Account email, hashed password, profile metadata, and the candidate / job records you create. We never sell or share this data.',
  },
  {
    id: 'retention',
    titleKey: 'privacy.retentionHeading',
    titleDefault: 'Retention',
    bodyKey: 'privacy.retentionBody',
    bodyDefault:
      'You can delete your account at any time from Settings. We purge associated records within 30 days, except where retention is required by law.',
  },
  {
    id: 'contact',
    titleKey: 'nav.contact',
    titleDefault: 'Contact',
    bodyKey: 'privacy.contactBody',
    bodyDefault:
      'For privacy requests, email privacy@example.com. We respond within five business days.',
  },
]

export function Privacy() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('privacy.title', {}, { defaultValue: 'Privacy policy' })}
      subtitle={t(
        'privacy.intro',
        { app: APP_NAME },
        {
          defaultValue:
            '{{app}} processes recruiting data on behalf of customers. We treat candidate records, resumes, and hiring-team communications as confidential and store them encrypted at rest.',
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
