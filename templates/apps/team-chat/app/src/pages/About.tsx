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
    cm.fontWeight('semibold'),
    cm.sp('mt', 8),
    cm.sp('mb', 3),
  )
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.about', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(4))}>
        <p data-mol-id="about-intro">
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} is where your team gets work done together — organized channels, focused threads, reactions, file sharing, and search, all in one fast, real-time workspace.',
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
              defaultValue:
                'Email buries decisions and scattered chat tools fracture context. {{app}} keeps every conversation in the open, searchable, and tied to the channel it belongs to — so your team stays aligned without the noise.',
            },
          )}
        </p>

        <h2 className={headingClass}>
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
          <li>
            {t(
              'about.featureChannels',
              {},
              {
                defaultValue:
                  'Public and private channels that keep every project, team, and topic organized.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureThreads',
              {},
              {
                defaultValue:
                  'Threaded replies and emoji reactions so side conversations stay tidy and feedback is fast.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureFiles',
              {},
              {
                defaultValue:
                  'Drag-and-drop file sharing with rich previews, right where the discussion happens.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureRealtime',
              {},
              {
                defaultValue:
                  'Real-time messaging with instant notifications, plus full-text search across everything your team has said.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featurePlans',
              {},
              {
                defaultValue:
                  'Free to start, with Pro and Team plans that unlock more channels, members, retention, and external integrations as you grow.',
              },
            )}
          </li>
        </ul>

        <h2 className={headingClass}>
          {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
        </h2>
        <p data-mol-id="about-contact">
          {t(
            'about.contactBody',
            { app: APP_NAME },
            {
              defaultValue:
                'Questions, feedback, or want a demo for your team? Reach us from your workspace settings — a real person on the {{app}} team reads every message.',
            },
          )}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
