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
                  '{{appName}} is a product-feedback platform — public boards where customers post requests, vote for what they need, and follow each idea from planned to shipped. Teams stop guessing what to build next because the demand ranks itself.',
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
                  'We believe the best product decisions are made in the open. {{appName}} gives every team a public board of voted requests, an official roadmap with target quarters, and a changelog that closes the loop — so customers see their impact and teams see their mandate.',
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
                    'Public feedback boards organized by topic, with duplicate merging that pools votes into one honest demand signal.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureVoting',
                {},
                {
                  defaultValue:
                    'One-vote-per-user upvoting with a full status workflow — open, planned, in progress, shipped, or declined — and an official response on every decision.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureModeration',
                {},
                {
                  defaultValue:
                    'A public roadmap with quarter labels, a changelog that turns shipped work into release notes, and a dashboard that shows what the crowd wants most.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featurePricing',
                {},
                {
                  defaultValue:
                    'Free to run a couple of boards; Pro and Team plans unlock more boards, higher limits, and data export.',
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
                  'Have feedback, found a bug, or want a board of your own on {{appName}}? Open your Settings to reach the team — every message goes to a real human who reads it.',
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
