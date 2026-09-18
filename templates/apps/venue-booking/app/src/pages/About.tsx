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
          {t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
        </h1>
        <div className={cm.cn(cm.prose, cm.stack(4))}>
          <p data-mol-id="about-intro">
            {t(
              'about.intro',
              { app: APP_NAME },
              {
                defaultValue: `${APP_NAME} is a marketplace for curated, character-rich venues — daylight studios, skylit lofts, rooftops, walled gardens, restored banquet halls, and industrial workshops. Every space is personally walked through by our editorial team, transparently priced, and instantly bookable for meetings, photoshoots, workshops, and gatherings.`,
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
                  'We believe finding the right space should feel like discovery, not paperwork. No aggregator inventory, no bait-and-switch listings, no opaque fees — just real venues with honest photography, clear availability, and pricing you can trust. And for the people behind those spaces, we make hosting effortless and rewarding.',
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
                    'Map-based search across studios, lofts, rooftops, gardens, banquet halls, and workshops — filter by category, capacity, location, and date.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureBooking',
                {},
                {
                  defaultValue:
                    'Real-time availability and instant confirmation on most venues, with transparent hourly pricing and secure checkout.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureReviews',
                {},
                {
                  defaultValue:
                    'Verified reviews and photo galleries from people who actually booked, so you know exactly what to expect.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureMessaging',
                {},
                {
                  defaultValue:
                    'Direct messaging with hosts, saved favorites, and a reservation dashboard that keeps every booking in one place.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureHosting',
                {},
                {
                  defaultValue:
                    'A host dashboard with editorial photography support, a calendar that protects your downtime, and metrics that grow your bookings.',
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
              { app: APP_NAME },
              {
                defaultValue:
                  'Have feedback, found a bug, or want to list your space? Reach out from your account settings — every message goes to a real human on the team.',
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
