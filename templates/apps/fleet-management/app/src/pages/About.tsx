import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

const FEATURES: { key: string; def: string }[] = [
  {
    key: 'about.featureLiveMap',
    def: 'A live fleet map that tracks every vehicle, driver, and route in real time, with auto-refresh so the view is never stale.',
  },
  {
    key: 'about.featureAlerts',
    def: 'Smart alerts for low fuel, excessive idling, speeding, and geofence breaches — escalated by severity, never noise.',
  },
  {
    key: 'about.featureMaintenance',
    def: 'Predictive maintenance scheduling by mileage and engine hours, so breakdowns become work orders instead of surprises.',
  },
  {
    key: 'about.featureDrivers',
    def: 'Per-driver safety scoring with trip history, hours-of-service tracking, and certification reminders.',
  },
  {
    key: 'about.featureRoutes',
    def: 'Route planning with stops, geofences, and trip telemetry — distance, duration, idle time, and fuel use captured automatically.',
  },
  {
    key: 'about.featureReports',
    def: 'Exportable reports across vehicles, drivers, and routes, with subscription tiers that scale from a single van to an entire fleet.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<AuthBrandHeader />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t('about.tagline', { tagline: APP_TAGLINE }, { defaultValue: APP_TAGLINE })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue:
                '{{appName}} is a fleet operations command center built for the dispatchers and fleet managers who keep vehicles, drivers, and deliveries moving. It pulls live telemetry, maintenance, and driver activity into one screen so you always know where every mile is going.',
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
                  'Running a fleet should not mean stitching together a dozen tools and spreadsheets. We believe every operator deserves a single, calm view of their vehicles, their people, and their costs — so decisions are made on live data, not yesterday’s guesses.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
            {FEATURES.map((f) => (
              <li key={f.key} className={'text-on-surface-variant'}>
                {t(f.key, {}, { defaultValue: f.def })}
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
              { appName: APP_NAME },
              {
                defaultValue:
                  'Have a question, found a bug, or want to see {{appName}} on your own fleet? Reach the team from the Settings page once you are signed in — every message reaches a real person who works on the product.',
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
