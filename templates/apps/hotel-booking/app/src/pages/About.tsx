import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Public "About" page describing what {@link APP_NAME} is and why it exists.
 *
 * @returns The rendered About page.
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
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.subtitle',
        {},
        { defaultValue: 'A curated, transparent way to find and book the right hotel.' },
      )}
    >
      <div className={cm.cn(cm.stack(6))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} is a hotel-booking platform for travelers who care about quality. Every property is personally vetted by our editorial team — no aggregator inventory, no bait-and-switch listings. Search real availability, compare rooms, rates, and amenities side by side, then book in a few taps with a clear, all-in price.',
            },
          )}
        </p>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 4),
            'font-display',
          )}
        >
          {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
        </h2>
        <p data-mol-id="about-mission" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.missionBody',
            {},
            {
              defaultValue:
                'Booking a place to stay should feel calm and honest. We show transparent rates with taxes and resort fees up front, reward loyal guests instead of nickel-and-diming them, and put the stays worth your money first — so you can spend less time comparing tabs and more time on the trip itself.',
            },
          )}
        </p>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 4),
            'font-display',
          )}
        >
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
          <li>
            {t(
              'about.featureSearch',
              {},
              {
                defaultValue:
                  'Real-time search across vetted hotels with live availability, map view, and rich photo galleries.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureRooms',
              {},
              {
                defaultValue:
                  'Side-by-side rooms, rates, and amenities with transparent, all-in pricing — taxes and resort fees included before you pay.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureReviews',
              {},
              {
                defaultValue:
                  'Verified guest reviews and editorial picks so you can trust the stay before you arrive.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureLoyalty',
              {},
              {
                defaultValue:
                  'Members-only rates and a loyalty program that earns points, late checkouts, and room upgrades on every booking.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureTrips',
              {},
              {
                defaultValue:
                  'Saved favorites and a Trips dashboard that keeps every reservation, itinerary, and confirmation in one place.',
              },
            )}
          </li>
        </ul>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 4),
            'font-display',
          )}
        >
          {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
        </h2>
        <p data-mol-id="about-contact" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.contactBody',
            { app: APP_NAME },
            {
              defaultValue:
                'Questions about a booking, feedback, or a property you think belongs on {{app}}? Reach our team from your account — every message goes to a real human who can help.',
            },
          )}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
