import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface Feature {
  key: string
  defaultValue: string
}

const FEATURES: Feature[] = [
  {
    key: 'about.feature.pipeline',
    defaultValue:
      'A visual hiring pipeline that drags candidates through Sourced → Screening → Interview → Offer → Hired, with stage colors that keep the board readable at a glance.',
  },
  {
    key: 'about.feature.screening',
    defaultValue:
      'AI-assisted screening that parses resumes and scores them against each job’s requirements, with explainable breakdowns by criterion.',
  },
  {
    key: 'about.feature.interviews',
    defaultValue:
      'Interview scheduling with scorecards and consolidated panel feedback, so every hiring decision is grounded in structured evidence.',
  },
  {
    key: 'about.feature.analytics',
    defaultValue:
      'Hiring analytics and a fairness pulse that surface time-to-hire trends and stage-by-stage equity gaps before they become patterns.',
  },
]

export function About() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-about"
      eyebrow={t('nav.about', {}, { defaultValue: 'About' })}
      title={t('about.title', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.intro',
        { app: APP_NAME },
        {
          defaultValue:
            '{{app}} is an applicant tracking system for recruiters and hiring managers who want signal, not noise — a clean pipeline, AI screening that explains itself, and hiring analytics, all in one place.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionHeading', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Hiring is one of the highest-stakes decisions a team makes, yet most of it still lives in scattered spreadsheets and email threads. {{app}} brings the whole loop onto one board so every candidate is tracked, every interview is structured, and every decision is fair, fast, and explainable.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
            {FEATURES.map((f) => (
              <li key={f.key} className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                {t(f.key, {}, { defaultValue: f.defaultValue })}
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactHeading', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Questions, feedback, or want a walkthrough for your hiring team? Email hello@example.com and a real person on the team will get back to you within two business days.',
              },
            )}
          </p>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
