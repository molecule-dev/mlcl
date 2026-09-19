import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import LandingFooter from '../components/LandingFooter.js'
import LandingTopNavBar from '../components/LandingTopNavBar.js'

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <>
      <LandingTopNavBar />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 12))}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
          {t('about.pageTitle', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
        </h1>
        <div className={cm.cn('prose', cm.stack(4))}>
          <p data-mol-id="about-intro">
            {t(
              'about.intro',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} is a newsletter platform for writers who own their audience. Compose issues, deliver them to your subscribers, and see what actually gets opened — without an algorithm deciding who sees your work.',
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
                  "We believe a writer's relationship with readers belongs to the writer — not to a feed. {{appName}}'s editor, subscriber list, and delivery analytics are all built on that idea.",
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
                    'A focused editor for issues: subject, preview text, markdown body, drafts, and scheduled sends.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureAudience',
                {},
                {
                  defaultValue:
                    'Delivery analytics that tell the truth — delivered, opened, clicked, per issue and over time — without dark patterns.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureDiscovery',
                {},
                {
                  defaultValue:
                    'A public archive and subscribe form so new readers find the publication and join the list on their own.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featurePricing',
                {},
                {
                  defaultValue:
                    'Free to start; Pro for publishers who need scheduling, paid tiers, and detailed open-rate analytics.',
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
                  'Have feedback, found a bug, or want a feature? Drop us a note from the Help page — every message goes to a real human on the team.',
              },
            )}
          </p>
        </div>
      </main>
      <LandingFooter />
    </>
  )
}

export default About
export { About as AboutPage }
