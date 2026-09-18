import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

interface Feature {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'telemetry',
    titleKey: 'about.feature.telemetry.title',
    titleDefault: 'Live fleet telemetry',
    bodyKey: 'about.feature.telemetry.body',
    bodyDefault:
      'Ingest MQTT and HTTP signals from thousands of devices and watch metrics, status, and last-seen update in real time — with charts and a console for drilling into any device.',
  },
  {
    id: 'commands',
    titleKey: 'about.feature.commands.title',
    titleDefault: 'Remote commands',
    bodyKey: 'about.feature.commands.body',
    bodyDefault:
      'Send one-shot commands or scheduled campaigns to a single device or a whole fleet, with acknowledgement tracking, priorities, and timeout retries built in.',
  },
  {
    id: 'firmware',
    titleKey: 'about.feature.firmware.title',
    titleDefault: 'Firmware orchestration',
    bodyKey: 'about.feature.firmware.body',
    bodyDefault:
      'Manage firmware versions across stable, beta, and canary channels, then roll them out in phases with per-cohort failure cutoffs that automatically pause a bad release.',
  },
  {
    id: 'alerts',
    titleKey: 'about.feature.alerts.title',
    titleDefault: 'Smart alerts and reporting',
    bodyKey: 'about.feature.alerts.body',
    bodyDefault:
      'Threshold breaches, signal drift, geofence, and battery alerts are escalated by severity, while built-in reports turn raw telemetry into fleet-health summaries you can export.',
  },
]

/**
 * Public "About" page for the IoT device-management platform.
 *
 * @returns The rendered about page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<AuthBrandHeader />}
      footer={<Footer />}
      containerSize="lg"
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(6))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is an IoT device-management platform for teams that run fleets of connected hardware. It brings a device registry, live telemetry ingestion, remote commands, and firmware update management together in one operations console — so a single screen can watch thousands of devices.`,
            },
          )}
        </p>

        <h2
          className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mt', 4))}
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
        </h2>
        <p data-mol-id="about-mission" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.missionBody',
            { app: APP_NAME },
            {
              defaultValue: `Connected fleets fail quietly: a sensor drifts, a firmware push bricks a cohort, an alert is buried in noise. We believe ops teams should see every signal and act on it before customers feel it. ${APP_NAME} is built so that connecting a broker, shipping a firmware campaign, and triaging an alert all take minutes — no agents to install, no firmware to rebuild.`,
            },
          )}
        </p>

        <h2
          className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mt', 4))}
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <div data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          {FEATURES.map((f) => (
            <div key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.cn(cm.stack(1))}>
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
              </h3>
              <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
              </p>
            </div>
          ))}
        </div>

        <h2
          className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mt', 4))}
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
        </h2>
        <p data-mol-id="about-contact" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.contactBody',
            {},
            {
              defaultValue:
                'Have feedback, hit a bug, or want to onboard a new fleet? Reach the team from your account settings — every message goes to a real person who works on the platform.',
            },
          )}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
