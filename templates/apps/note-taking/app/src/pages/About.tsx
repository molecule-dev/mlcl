import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <>
      <Header />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 12))}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
          {t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
        </h1>
        <div className={cm.cn(cm.prose, cm.stack(4))}>
          <p data-mol-id="about-intro">
            {t(
              'about.intro',
              { appName: APP_NAME },
              {
                defaultValue: `${APP_NAME} is a structured note-taking workspace for knowledge workers, students, and writers. A quiet block editor, nested notebooks, backlinks, a knowledge graph, lightweight databases, and reusable templates — all behind a typography-first reading experience.`,
              },
            )}
          </p>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p data-mol-id="about-mission">
            {t(
              'about.missionBody',
              { appName: APP_NAME },
              {
                defaultValue: `We believe your notes should compound into a real second brain, not scatter across a dozen apps. ${APP_NAME} keeps the writing surface calm and gets out of the way, while quietly threading every page, tag, and backlink together so your thinking stays connected and searchable.`,
              },
            )}
          </p>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
            <li>
              {t(
                'about.featureEditor',
                {},
                {
                  defaultValue:
                    'A quiet block editor — headings, lists, code, callouts, and to-dos — with slash-commands when you want them and out of the way when you do not.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureNotebooks',
                {},
                {
                  defaultValue:
                    'Nested notebooks and pages so projects, topics, and daily notes stay organized exactly the way you think.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureGraph',
                {},
                {
                  defaultValue:
                    'Backlinks and a knowledge graph: type [[ to link a note and watch how your ideas connect over time.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureDatabases',
                {},
                {
                  defaultValue:
                    'Lightweight databases and reusable templates to turn loose notes into structured, repeatable workflows.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureSearch',
                {},
                {
                  defaultValue:
                    'Sub-50ms full-text search across every notebook, plus tags that compose with notebooks instead of fighting them.',
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
              {},
              {
                defaultValue:
                  'Have feedback, found a bug, or want to suggest a feature? Reach out from your account settings — every message goes to a real human on the team.',
              },
            )}
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}

export default About
export { About as AboutPage }
