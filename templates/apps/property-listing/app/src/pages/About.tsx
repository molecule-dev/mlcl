import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Public "About" page for PropertyHub. Wrapped in the same public chrome
 * (Header + Footer + ContentPageShell) used by Pricing / Privacy / Terms so
 * the brand stays consistent. Copy is grounded in the app's real purpose: a
 * Zillow-like property marketplace with map search, filters, a mortgage
 * calculator, saved properties, agent profiles, and an agent dashboard.
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
      bare
    >
      <div className={cm.cn(cm.prose, cm.stack(4))}>
        <p data-mol-id="about-intro">
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a modern real-estate marketplace for buying, renting, and listing homes. Search by city, neighborhood, or ZIP, explore listings on an interactive map, filter by price, bedrooms, and bathrooms, and run the numbers with a built-in mortgage calculator — all in one place.`,
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
              defaultValue: `We believe finding a home should be transparent and stress-free. ${APP_NAME} connects buyers and renters with trusted agents, surfaces every detail that matters, and gives real-estate professionals the tools to showcase listings, capture leads, and close with confidence.`,
            },
          )}
        </p>

        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
          <li>
            {t(
              'about.featureSearch',
              {},
              {
                defaultValue:
                  'Map-based search with rich filters for price, bedrooms, bathrooms, and property type.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureMortgage',
              {},
              {
                defaultValue:
                  'A built-in mortgage calculator so you know what a home really costs before you tour it.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureSaved',
              {},
              {
                defaultValue: 'Saved properties and favorites that sync across your devices.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureAgents',
              {},
              {
                defaultValue:
                  'Detailed agent profiles, reviews, and a direct line to schedule showings.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureDashboard',
              {},
              {
                defaultValue:
                  'An agent dashboard for managing listings, leads, showings, and performance analytics.',
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
              defaultValue: `Questions, feedback, or need a hand? Visit our Help Center — every message reaches a real person on the ${APP_NAME} team.`,
            },
          )}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
