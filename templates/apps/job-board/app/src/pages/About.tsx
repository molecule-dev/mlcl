import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

const FEATURES = [
  {
    key: 'search',
    defaultValue:
      'Smart, faceted job search powered by Meilisearch — filter by skills, salary, location, and team size and surface the right roles in milliseconds.',
  },
  {
    key: 'pipeline',
    defaultValue:
      'A clear application pipeline that tracks every role from submitted to reviewing to interview to offer, with email and push updates when status moves.',
  },
  {
    key: 'companies',
    defaultValue:
      'Honest company profiles — real culture, benefits, employee count, and every open role — so you can apply with confidence.',
  },
  {
    key: 'posting',
    defaultValue:
      'One-page job posting for employers, plus an applicant pipeline dashboard and tiered plans for teams that hire at scale.',
  },
] as const

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <ContentPageShell
      dataMolId="page-about"
      containerSize="lg"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About us' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(6))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} is a modern job board for seekers and employers. We connect real candidates with real companies — clean search, transparent salaries, and a hiring experience built so the next move is the right move.',
            },
          )}
        </p>

        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
          {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
        </h2>
        <p data-mol-id="about-mission" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.missionBody',
            { app: APP_NAME },
            {
              defaultValue:
                'Hiring should be fast, fair, and signal-rich for both sides of the table. {{app}} gives seekers a calm place to search and track applications, and gives employers a fast way to post roles and review qualified applicants — without dark patterns, spam, or noise.',
            },
          )}
        </p>

        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <ul data-mol-id="about-features" className={cm.cn(cm.stack(3), 'list-disc pl-6')}>
          {FEATURES.map((f) => (
            <li key={f.key} className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(`about.feature.${f.key}`, {}, { defaultValue: f.defaultValue })}
            </li>
          ))}
        </ul>

        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
          {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
        </h2>
        <p data-mol-id="about-contact" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.contactBody',
            {},
            {
              defaultValue:
                'Have feedback, found a bug, or want to hire with us? Reach out from your account settings — every message goes to a real human on the team.',
            },
          )}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
