import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

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
        { defaultValue: 'A rental marketplace built around real homes and real hosts.' },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a rental marketplace for travelers who want a stay that feels like home — and for hosts who want a simple, fair way to open their doors. Browse verified listings, message hosts directly, book with free cancellation, and leave honest reviews when you get back.`,
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
              {},
              {
                defaultValue:
                  'Travel should connect you to a place, not a chain. We help independent hosts list unique homes and help travelers find them — with transparent pricing, no hidden fees, and payouts, taxes, and traveler vetting handled for the host so they can focus on hospitality.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6 text-on-surface-variant')}>
            <li>
              {t(
                'about.featureSearch',
                {},
                {
                  defaultValue:
                    'Map-based search across verified listings, with filters for price, amenities, and dates.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureBooking',
                {},
                {
                  defaultValue:
                    'Instant or request-to-book reservations with secure Stripe payments and free cancellation up to 48 hours before check-in.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureMessaging',
                {},
                {
                  defaultValue:
                    'Direct messaging with hosts before and during your stay, plus wishlists to save the places you love.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureReviews',
                {},
                {
                  defaultValue:
                    'Honest two-way reviews so travelers and hosts both build a trusted reputation.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureHosting',
                {},
                {
                  defaultValue:
                    'A full host dashboard to publish listings, manage availability, track reservations, and get paid.',
                },
              )}
            </li>
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue: `Questions about a booking, hosting, or anything else? Reach the ${APP_NAME} team from your account messages — every note goes to a real person who can help.`,
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
