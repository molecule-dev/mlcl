import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Public "About" page for the virtual classroom app.
 *
 * @returns The rendered about page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About us' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a live virtual classroom that brings video, an infinite whiteboard, class chat, breakout rooms, assignments, and grading together in one focused place. It is built for instructors and students who want fewer tabs and more attention — a calm, scholarly home for teaching that actually feels like being in the room.`,
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'We believe remote and hybrid learning should feel as present and human as a seminar table. So we put live presence first — real faces, a shared canvas, and small-group breakouts — and we keep the grading and logistics quietly out of the way until you need them.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6 text-on-surface-variant')}>
            <li>
              {t(
                'about.featureVideo',
                {},
                {
                  defaultValue:
                    'Cinematic live video with active-speaker focus, gallery and spotlight layouts, and a draggable picture-in-picture for instructors.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureWhiteboard',
                {},
                {
                  defaultValue:
                    'An infinite whiteboard with a laser pointer and a full color palette, with each session saved per course so work carries between classes.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureBreakouts',
                {},
                {
                  defaultValue:
                    'One-tap breakout rooms — auto-shuffle students, broadcast announcements, and pull everyone back together when time is up.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureAssignments',
                {},
                {
                  defaultValue:
                    'Assignments, file submissions, rubrics, inline feedback, and a calm gradebook that keeps students and parents informed.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureChat',
                {},
                {
                  defaultValue:
                    'Threaded class chat with pinned summaries and instructor-only side channels for quiet coaching during a session.',
                },
              )}
            </li>
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { appName: APP_NAME },
              {
                defaultValue: `Have a question, found a bug, or want a demo for your school? Email us at hello@aula.school — every message reaches a real person on the ${APP_NAME} team.`,
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
