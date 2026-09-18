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
                  '{{appName}} is a publishing home for human stories and intellectual writing. We make it easy to compose, share, and discover long-form work — without ads, infinite-scroll bait, or attention-stealing UI.',
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
                  "We believe writing on the open web should give writers the credit, the audience, and the income they earn — and give readers a calm place to think. {{appName}}'s editor, distribution, and pricing model are all built on that idea.",
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
                    'A focused, distraction-free editor with autosave, draft history, scheduling, and AI-assisted summaries.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureAudience',
                {},
                {
                  defaultValue:
                    'Reader analytics that surface what resonated — top posts, views over time, claps, comments — without dark patterns.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureDiscovery',
                {},
                {
                  defaultValue:
                    'Topic-based discovery with categories and tags so the right readers find your work.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featurePricing',
                {},
                {
                  defaultValue:
                    'Free for personal use; Pro for writers who need scheduling, custom domains, and detailed analytics.',
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
                  'Have feedback, found a bug, or want to write for us? Drop us a note from the Help page — every message goes to a real human on the team.',
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
