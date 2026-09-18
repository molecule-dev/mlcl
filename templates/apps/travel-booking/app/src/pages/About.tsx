import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const features = [
    {
      id: 'discover',
      title: t('about.featureDiscover.title', {}, { defaultValue: 'Inspiration, hand-picked' }),
      body: t(
        'about.featureDiscover.body',
        {},
        {
          defaultValue:
            'Editor-curated destinations and field guides surface the places worth packing for — no aggregator noise, no sponsored clutter.',
        },
      ),
    },
    {
      id: 'stays',
      title: t('about.featureStays.title', {}, { defaultValue: 'Trustworthy stays' }),
      body: t(
        'about.featureStays.body',
        { app: APP_NAME },
        {
          defaultValue: `Every property on ${APP_NAME} is personally vetted — accurate photos, honest reviews, and no bait-and-switch listings.`,
        },
      ),
    },
    {
      id: 'booking',
      title: t('about.featureBooking.title', {}, { defaultValue: 'Search, compare, and book' }),
      body: t(
        'about.featureBooking.body',
        {},
        {
          defaultValue:
            'Compare rooms, rates, and amenities side by side, then book in a few taps with free cancellation on every itinerary.',
        },
      ),
    },
    {
      id: 'itineraries',
      title: t(
        'about.featureItineraries.title',
        {},
        { defaultValue: 'Itineraries that stay organized' },
      ),
      body: t(
        'about.featureItineraries.body',
        {},
        {
          defaultValue:
            'Keep flights, stays, and plans in one place, save destinations for later, and pick up your trip exactly where you left off.',
        },
      ),
    },
  ]

  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.about', {}, { defaultValue: 'About' })}
      title={t('about.title', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.subtitle',
        {},
        {
          defaultValue:
            'Inspiration, trustworthy stays, and a frictionless path from daydream to booked.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a travel-booking platform for people who want to wander without worry. We bring discovery, vetted accommodations, and itinerary management together so the leap from daydream to booked feels effortless — and so every trip you plan with us is one you can trust.`,
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue: `Booking travel should be exciting, not exhausting. ${APP_NAME} exists to make every stay trustworthy and every booking transparent — members-only rates, free cancellation, and a 24/7 trip concierge, with none of the dark patterns that make travel sites stressful.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.whatYouGetTitle', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(4))}>
            {features.map((feature) => (
              <li key={feature.id} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {feature.title}
                </h3>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>{feature.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Questions about a stay, feedback, or a partnership idea? Reach the team from your account or the in-app concierge — every message goes to a real human who travels too.',
              },
            )}
          </p>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
