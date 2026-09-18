import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const headingClass = cm.cn(
    cm.textSize('xl'),
    cm.fontWeight('bold'),
    cm.sp('mt', 8),
    'font-display tracking-tight',
  )

  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(4), cm.prose)}>
        <p data-mol-id="about-intro">
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a fast, keyboard-driven database administration workspace for engineers and data teams. Connect to your PostgreSQL and remote databases, explore schemas, run SQL, browse and filter tables, and watch performance — all from one secure console, without juggling a pile of desktop tools.`,
            },
          )}
        </p>

        <h2 className={headingClass}>
          {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
        </h2>
        <p data-mol-id="about-mission">
          {t(
            'about.missionBody',
            { app: APP_NAME },
            {
              defaultValue: `Database tooling should be quick, safe, and out of your way. ${APP_NAME} stores connection credentials encrypted at rest, keeps an audit trail of what ran where, and puts every action a keystroke away — so you can move from a question to an answer without ceremony.`,
            },
          )}
        </p>

        <h2 className={headingClass}>
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
          <li>
            {t(
              'about.featureConnections',
              {},
              {
                defaultValue:
                  'A connection manager that securely stores and color-codes your databases — credentials are encrypted at rest, never in plaintext.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureQueryEditor',
              {},
              {
                defaultValue:
                  'A Monaco-powered SQL editor with query history, saved queries, and one-click CSV export of your results.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureSchema',
              {},
              {
                defaultValue:
                  'A schema explorer and table browser to navigate databases, tables, and columns, then browse, filter, and edit rows inline.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureMonitoring',
              {},
              {
                defaultValue:
                  'Live monitoring of query performance and database activity, with the keyboard shortcuts and command palette to drive it all hands-free.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featurePlans',
              {},
              {
                defaultValue:
                  'Plans that scale with you — Free for solo work, Pro and Team for more connections, longer query retention, exports, and advanced features.',
              },
            )}
          </li>
        </ul>

        <h2 className={headingClass}>
          {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
        </h2>
        <p data-mol-id="about-contact">
          {t(
            'about.contactBody',
            { app: APP_NAME },
            {
              defaultValue: `Have feedback, found a bug, or want a driver we don't support yet? Reach the ${APP_NAME} team from your account settings — every message goes to a real engineer.`,
            },
          )}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
