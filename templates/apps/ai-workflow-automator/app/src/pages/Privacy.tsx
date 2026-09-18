/**
 * Privacy — public privacy policy. Verifier sees a substantial body so
 * incidental "not found" matches in transitional state cannot misclassify
 * a successful navigation as a 404.
 */
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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
    titleDefault: 'What we collect',
    bodyKey: 'privacy.collect.body',
    bodyDefault:
      'We collect the email address you sign up with, the workflows you configure, and metadata about each run (start time, finish time, status). We never collect or store payload contents from triggers or step outputs beyond what is necessary to display in the run viewer for the workspace owner.',
  },
  {
    id: 'use',
    titleKey: 'privacy.use.title',
    titleDefault: 'How we use it',
    bodyKey: 'privacy.use.body',
    bodyDefault:
      'Run history is used to populate the dashboard, executions list, and notifications feed. Aggregate metrics (counts, durations, success rates) inform the KPI cards. We do not sell user data or share workflow contents with third parties.',
  },
  {
    id: 'retention',
    titleKey: 'privacy.retention.title',
    titleDefault: 'Retention',
    bodyKey: 'privacy.retention.body',
    bodyDefault:
      'Run history is retained for 90 days by default; you can shorten or extend that window from the workspace settings page. Deleting your account purges all associated data within 14 days of the deletion request.',
  },
  {
    id: 'contact',
    titleKey: 'nav.contact',
    titleDefault: 'Contact',
    bodyKey: 'privacy.contact.body',
    bodyDefault:
      'If you have any questions about this policy, please contact your workspace administrator. For requests under GDPR or similar regulations, see the security section of the settings page.',
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
        'privacy.intro',
        {},
        {
          defaultValue:
            'How the workflow automator collects, uses, and protects information about people who sign in, configure workflows, or run automations through the platform.',
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
