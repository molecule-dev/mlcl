import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

const FEATURES = [
  {
    key: 'schedule',
    defaultValue:
      'Today’s schedule with subject-coloured period cards, room numbers, teachers, and bell timing.',
  },
  {
    key: 'grades',
    defaultValue:
      'A live grade book that stays in sync with the teacher’s rubric — letter and percentage grades, plus printable report cards.',
  },
  {
    key: 'assignments',
    defaultValue:
      'A smart assignment queue you can sort by due date, status, or class, with detail views and submission tracking.',
  },
  {
    key: 'attendance',
    defaultValue:
      'Attendance records and daily status at a glance, so nothing slips through the cracks.',
  },
  {
    key: 'messages',
    defaultValue:
      'Threaded messages between students, families, and teachers, with optional email notifications.',
  },
  {
    key: 'calendar',
    defaultValue:
      'A unified calendar and announcement feed that ties the whole school day together.',
  },
] as const

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.about', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(4))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a modern student portal that pulls every class, grade, assignment, message, and attendance record into one calm dashboard. Built for middle and high schoolers — and the families who follow along — it turns the scattered pieces of the school day into a single, clear place to learn.`,
            },
          )}
        </p>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('semibold'),
            cm.sp('mt', 8),
            'font-display',
          )}
        >
          {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
        </h2>
        <p data-mol-id="about-mission" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.missionBody',
            { app: APP_NAME },
            {
              defaultValue: `We believe students do their best work when they spend less time hunting for information and more time learning. ${APP_NAME} keeps schedules, grades, and deadlines transparent and up to date, with FERPA-minded privacy and tier-controlled visibility so schools, students, and parents all see exactly what they should.`,
            },
          )}
        </p>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('semibold'),
            cm.sp('mt', 8),
            'font-display',
          )}
        >
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
          {FEATURES.map((f) => (
            <li key={f.key} className={cm.cn('text-on-surface-variant')}>
              {t(`about.feature.${f.key}`, {}, { defaultValue: f.defaultValue })}
            </li>
          ))}
        </ul>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('semibold'),
            cm.sp('mt', 8),
            'font-display',
          )}
        >
          {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
        </h2>
        <p data-mol-id="about-contact" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.contactBody',
            {},
            {
              defaultValue:
                'Have feedback, found a bug, or want to bring your school on board? Reach out from your account settings or message your school administrator — every note reaches a real person on the team.',
            },
          )}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
