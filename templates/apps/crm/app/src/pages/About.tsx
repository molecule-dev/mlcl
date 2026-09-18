import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Feature {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'contacts',
    titleKey: 'about.featureContacts.title',
    titleDefault: 'Contacts & companies',
    bodyKey: 'about.featureContacts.body',
    bodyDefault:
      'Keep every person and organisation in one searchable place — titles, sources, phone, email, and the full history of who works where.',
  },
  {
    id: 'pipeline',
    titleKey: 'about.featurePipeline.title',
    titleDefault: 'Deals & pipeline',
    bodyKey: 'about.featurePipeline.body',
    bodyDefault:
      'Drag deals across a visual kanban pipeline, track value, probability, and expected close dates, and always know what is about to land.',
  },
  {
    id: 'activities',
    titleKey: 'about.featureActivities.title',
    titleDefault: 'Activities & follow-ups',
    bodyKey: 'about.featureActivities.body',
    bodyDefault:
      'Log calls, emails, and tasks against any contact, company, or deal, and let the activity timeline keep your team on the same page.',
  },
  {
    id: 'reports',
    titleKey: 'about.featureReports.title',
    titleDefault: 'Reports & insights',
    bodyKey: 'about.featureReports.body',
    bodyDefault:
      'See revenue by source, conversion rates, and top performers at a glance, with import/export so your data is never locked in.',
  },
]

/**
 * Public "About" page for the CRM. Reuses the app's own header/footer
 * chrome and the shared {@link ContentPageShell} so the brand, palette,
 * and typography stay consistent with Privacy, Terms, and Pricing.
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
      eyebrow={t('nav.about', {}, { defaultValue: 'About' })}
      title={t('about.title', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.subtitle',
        { app: APP_NAME },
        {
          defaultValue: `${APP_NAME} is a CRM for teams who want to grow relationships, not wrestle with software.`,
        },
      )}
    >
      <div data-mol-id="about-body" className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} brings your contacts, companies, deals, and day-to-day activities together in a single, fast workspace — so every conversation, follow-up, and won deal is captured in one place your whole team can trust.`,
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
                  'We believe a CRM should get out of the way. Selling is about people — so we obsess over a clean pipeline, honest reporting, and zero busywork, giving sales teams the clarity to focus on the next right conversation.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.featuresTitle', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(4))}>
            {FEATURES.map((f) => (
              <li key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </p>
              </li>
            ))}
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
                defaultValue: `Questions about ${APP_NAME}, pricing, or a plan that fits your team? We would love to hear from you — reach out any time and a real human will reply.`,
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
