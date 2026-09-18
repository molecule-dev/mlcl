import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

const FEATURES: Array<{ key: string; defaultValue: string }> = [
  {
    key: 'about.feature.live',
    defaultValue:
      'Live whole-home draw — watt-by-watt readings that refresh every few seconds, down to the circuit, room, or device.',
  },
  {
    key: 'about.feature.solar',
    defaultValue:
      'Solar and battery flow — track production, self-consumption, and grid export so you know exactly where every kilowatt goes.',
  },
  {
    key: 'about.feature.cost',
    defaultValue:
      'Time-of-use cost analysis — peak and off-peak rate plans tell you what today will cost before the day is over.',
  },
  {
    key: 'about.feature.alerts',
    defaultValue:
      'Alerts that catch spikes — high-usage, low-production, and peak-demand thresholds you set, delivered by push, email, or both.',
  },
  {
    key: 'about.feature.trends',
    defaultValue:
      'Consumption trends and reports — daily and monthly summaries that turn raw readings into decisions you can act on.',
  },
]

/**
 * Public "About" page for Voltrace.
 *
 * Mirrors the public chrome used by Pricing (ContentPageShell + the app's
 * own Header/Footer) so brand stays consistent. Content is grounded in the
 * app's purpose: realtime energy monitoring with solar, cost, and alerts.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <ContentPageShell
      dataMolId="page-about"
      containerSize="md"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
      subtitle={t('about.tagline', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue:
                '{{appName}} is realtime power monitoring for solar homes and facility teams. We turn the firehose of meter, inverter, and battery data into a calm control-room view — live wattage, solar production, time-of-use cost, and alerts, all in one shell.',
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
                  'Energy you can see is energy you can manage. We believe everyone running a meter — a household with rooftop solar or a team watching a building — deserves utility-grade insight without a utility-grade contract. Every feature is built to make the next kilowatt-hour an informed choice, not a surprise on the bill.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.featuresTitle', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(3))}>
            {FEATURES.map((f) => (
              <li key={f.key} className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }), cm.prose)}>
                <span
                  className={cm.cn('material-symbols-outlined text-primary')}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                <span className={cm.cn('flex-1', 'text-on-surface-variant')}>
                  {t(f.key, {}, { defaultValue: f.defaultValue })}
                </span>
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
                  'Questions, feature requests, or a meter we should support? Reach the {{appName}} team from your account settings — every message goes to a real person.',
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
