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
        <div className={cm.cn('prose', cm.stack(4))}>
          <p data-mol-id="about-intro">
            {t(
              'about.intro',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} is a community-first discussion platform — Reddit-style threads, voting, and reputation, built for people who would rather have one good conversation than chase a feed. Every voice counts, and the best ideas rise on merit, not volume.',
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
                defaultValue:
                  'We believe online discussion should reward thoughtfulness, not outrage. {{appName}} gives every community the tools to stay civil and self-governing — transparent voting, earned reputation, and moderation that puts trusted members in control — so threads compound into something worth coming back to.',
              },
            )}
          </p>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
            <li>
              {t(
                'about.featureThreads',
                {},
                {
                  defaultValue:
                    'Organized communities and categories with threaded, markdown-rich discussions that are easy to follow and search.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureVoting',
                {},
                {
                  defaultValue:
                    'Up/down voting and an earned reputation system that surfaces the most helpful contributors and the best answers.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureModeration',
                {},
                {
                  defaultValue:
                    'A built-in moderation queue and reporting tools so each community can stay healthy and self-governing.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featurePricing',
                {},
                {
                  defaultValue:
                    'Free to join and participate; Pro and Team plans unlock higher limits, advanced moderation, and data export.',
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
              { appName: APP_NAME },
              {
                defaultValue:
                  'Have feedback, found a bug, or want to start a community on {{appName}}? Open your Settings to reach the team — every message goes to a real human who reads it.',
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
