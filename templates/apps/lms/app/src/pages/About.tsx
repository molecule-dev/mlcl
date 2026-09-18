import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function About() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.about', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.intro',
        { appName: APP_NAME },
        {
          defaultValue: `${APP_NAME} is a learning management system that brings courses, assignments, grades, and discussions together in one calm, focused place — for students and instructors alike.`,
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { appName: APP_NAME },
              {
                defaultValue: `We believe learning works best when the tools get out of the way. ${APP_NAME} gives instructors a clear place to build courses and grade work, and gives students a calm view of what to learn next — without the clutter and busywork that fights real understanding.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), cm.prose, 'list-disc pl-6 text-on-surface-variant')}>
            <li data-mol-id="about-feature-courses">
              {t(
                'about.featureCourses',
                {},
                {
                  defaultValue:
                    'Courses organized into modules and lessons — video, readings, and resources in one structured path.',
                },
              )}
            </li>
            <li data-mol-id="about-feature-assignments">
              {t(
                'about.featureAssignments',
                {},
                {
                  defaultValue:
                    'Assignments with due dates, file-upload submissions, and clear submission tracking.',
                },
              )}
            </li>
            <li data-mol-id="about-feature-grades">
              {t(
                'about.featureGrades',
                {},
                {
                  defaultValue:
                    'A gradebook with scores, letter grades, GPA, instructor feedback, and grade-trend insights.',
                },
              )}
            </li>
            <li data-mol-id="about-feature-discussions">
              {t(
                'about.featureDiscussions',
                {},
                {
                  defaultValue:
                    'Threaded course discussions and replies so questions and ideas stay with the right class.',
                },
              )}
            </li>
            <li data-mol-id="about-feature-extras">
              {t(
                'about.featureExtras',
                {},
                {
                  defaultValue:
                    'Calendar deadlines, search across courses, and push and email notifications — with Free, Pro, and Team plans as you grow.',
                },
              )}
            </li>
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Have feedback, found a bug, or need a hand getting started? Reach out from the Help page — every message goes to a real person on the team.',
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
