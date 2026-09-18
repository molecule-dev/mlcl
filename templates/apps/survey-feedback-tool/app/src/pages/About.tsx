import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingTopNavBar } from '../components/LandingTopNavBar.js'

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface-secondary text-on-surface')}>
      <LandingTopNavBar />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 12))}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
          {t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
        </h1>
        <div className={cm.cn('prose', cm.stack(4))}>
          <p data-mol-id="about-intro">
            {t(
              'about.intro',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} is a survey and feedback platform for teams who want to listen at scale. Design beautiful surveys, capture NPS and open feedback, and turn every response into a clear story — without the spreadsheets.',
              },
            )}
          </p>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p data-mol-id="about-mission">
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Every product decision should start with what customers actually said. {{app}} makes feedback effortless to collect and impossible to ignore — so the right voices shape what you build next.',
              },
            )}
          </p>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
            <li>
              {t(
                'about.featureBuilder',
                {},
                {
                  defaultValue:
                    'A drag-and-drop survey builder with conditional logic, reusable templates, and shareable public links.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureResponses',
                {},
                {
                  defaultValue:
                    'A unified response inbox that captures every submission, scores NPS automatically, and lets you drill into any individual answer.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureAnalytics',
                {},
                {
                  defaultValue:
                    'Live analytics — completion rates, NPS distribution, and promoter share — so you spot the shift the moment it happens.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureExport',
                {},
                {
                  defaultValue:
                    'One-click CSV export and full-text search, so your data travels wherever your team needs it.',
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
                  'Have feedback, found a bug, or want to see a feature? Reach out from your workspace settings — every message reaches a real human on the team.',
              },
            )}
          </p>
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}

export default About
export { About as AboutPage }
