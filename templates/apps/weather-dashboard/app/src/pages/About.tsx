import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { LandingNav } from '../components/LandingNav.js'

const FEATURES = [
  {
    key: 'forecasts',
    defaultValue:
      'Forecasts that read the sky — hourly precision and 10-day outlooks in a single editorial strip, with no tap-and-pinch pop-ups.',
  },
  {
    key: 'radar',
    defaultValue:
      'Radar that scrubs — drag the time scrubber across rain, snow, and lightning layers, then swap to satellite when a front is on the way.',
  },
  {
    key: 'alerts',
    defaultValue:
      'Alerts that respect quiet — per-location watches, warnings, and emergencies, so your phone only buzzes when it really matters.',
  },
  {
    key: 'trends',
    defaultValue:
      'Trends with context — compare today against the 30-year climatology and see whether this season is actually worse than last.',
  },
  {
    key: 'locations',
    defaultValue:
      'Unlimited saved locations — pin every place you care about and {{appName}} keeps each radar warm and each forecast fresh.',
  },
] as const

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <LandingNav />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 16))}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
          {t('about.pageTitle', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
        </h1>
        <div className={cm.cn(cm.stack(4), 'text-on-surface-variant leading-relaxed')}>
          <p data-mol-id="about-intro">
            {t(
              'about.intro',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} turns scattered weather sources into one calm dashboard. Pin every place you care about and get hourly precision, 10-day outlooks, scrub-able radar, severity-tinted alerts, and historical trends — all in a single glanceable view.',
              },
            )}
          </p>

          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('semibold'),
              cm.sp('mt', 8),
              'text-on-surface',
            )}
          >
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p data-mol-id="about-mission">
            {t(
              'about.missionBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'We believe checking the weather should feel calm, not chaotic. {{appName}} is built for outdoor planners, commuters, and anyone who wants real atmospheric depth without pop-ups, ad clutter, or fiddly maps. Every screen is designed to answer one question fast: what is the sky about to do?',
              },
            )}
          </p>

          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('semibold'),
              cm.sp('mt', 8),
              'text-on-surface',
            )}
          >
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
            {FEATURES.map((f) => (
              <li key={f.key}>
                {t(
                  `about.feature.${f.key}`,
                  { appName: APP_NAME },
                  { defaultValue: f.defaultValue },
                )}
              </li>
            ))}
          </ul>

          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('semibold'),
              cm.sp('mt', 8),
              'text-on-surface',
            )}
          >
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p data-mol-id="about-contact">
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Have feedback, found a bug, or want a forecast source we do not cover yet? Reach the team from Settings — every message goes to a real person on the team.',
              },
            )}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default About
export { About as AboutPage }
