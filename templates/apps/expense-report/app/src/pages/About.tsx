import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t('about.tagline', {}, { defaultValue: APP_TAGLINE })}
    >
      <div className={cm.cn(cm.prose, cm.stack(4))}>
        <p data-mol-id="about-intro">
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} is an expense management platform for finance teams and the people they reimburse. Capture a receipt, file an expense, send a report through approval, and track every reimbursement — without the spreadsheet ceremony.',
            },
          )}
        </p>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
          {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
        </h2>
        <p data-mol-id="about-mission">
          {t(
            'about.missionBody',
            { app: APP_NAME },
            {
              defaultValue:
                'Reimbursement should be fast, fair, and auditable. We built {{app}} so submitters get paid back without nagging, approvers see exactly what they are signing off on, and finance has a clean trail for every dollar — policy checks and all.',
            },
          )}
        </p>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
          <li>
            {t(
              'about.featureCapture',
              {},
              {
                defaultValue:
                  'Receipt capture with photo upload that attaches images to the right expense, line by line.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureWorkflow',
              {},
              {
                defaultValue:
                  'A two-tier approval workflow with reviewer notes, policy-violation flags, and one-tap reimbursement marking.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featurePolicy',
              {},
              {
                defaultValue:
                  'Policy guardrails — daily caps, per-category limits, and receipt-required thresholds enforced at submission time.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureExport',
              {},
              {
                defaultValue:
                  'Auditable CSV exports of every report, expense, and approval state — ready for your accounting team.',
              },
            )}
          </li>
        </ul>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
          {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
        </h2>
        <p data-mol-id="about-contact">
          {t(
            'about.contactBody',
            { app: APP_NAME },
            {
              defaultValue:
                'Questions, feedback, or a feature request? Reach the {{app}} team from Settings → Notifications, or write to us any time — every message goes to a real human.',
            },
          )}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
