import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

const FEATURES = [
  {
    key: 'tracking',
    defaultTitle: 'Tracking across 200+ carriers',
    defaultBody:
      'One unified view of every shipment — UPS, FedEx, USPS, DHL, and regional carriers — with the same status shape, live location, and ETA for each.',
  },
  {
    key: 'alerts',
    defaultTitle: 'Exception alerts before customers ask',
    defaultBody:
      'Customs holds, weather delays, address issues, and failed-delivery attempts are flagged the moment they happen, so your team gets ahead of the support ticket.',
  },
  {
    key: 'webhooks',
    defaultTitle: 'Webhooks with replay',
    defaultBody:
      'Every status change is posted to your endpoints, and failed deliveries stay replayable so your downstream systems never miss an event.',
  },
  {
    key: 'analytics',
    defaultTitle: 'Analytics you can act on',
    defaultBody:
      'On-time rate, average dwell time, and exception rate per carrier and route — the numbers you need to spot the problem and fix it.',
  },
  {
    key: 'team',
    defaultTitle: 'A shared workspace for your team',
    defaultBody:
      'Invite teammates, set roles, and give everyone one source of truth for where every package is right now.',
  },
] as const

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p
          data-mol-id="about-intro"
          className={cm.cn(cm.prose, cm.textSize('lg'), 'text-on-surface-variant')}
        >
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a logistics operations platform for teams that ship at scale. Track every package across every carrier, catch exceptions before they become support tickets, and give your whole organization one calm, real-time picture of where every shipment is.`,
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
                  'Delivery should never be a black box. We believe operations teams deserve a single, dependable place to see what is moving, what is stuck, and what needs attention — without stitching together a dozen carrier dashboards. Every part of the product is built to turn raw tracking data into decisions you can act on.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(4))}>
            {FEATURES.map((f) => (
              <li key={f.key} data-mol-id={`about-feature-${f.key}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {t(`about.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.prose, cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(`about.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
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
              { app: APP_NAME },
              {
                defaultValue: `Questions, feedback, or want a hand wiring up your carriers? Reach the ${APP_NAME} team from your account settings — every message goes to a real person who works on the product.`,
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
