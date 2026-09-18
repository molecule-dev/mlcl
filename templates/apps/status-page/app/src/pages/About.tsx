import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Public "About" page describing what the status page app does, wrapped in
 * the app's own header/footer chrome (the same chrome the Pricing page uses).
 *
 * @returns The rendered about page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div data-mol-id="about-body" className={cm.cn(cm.stack(6))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a status page for teams who refuse to let an outage surprise their users. It broadcasts public service health, incident timelines, and uptime history the moment anything changes — so your customers hear it from you first, not from social media.`,
            },
          )}
        </p>

        <section className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p data-mol-id="about-mission" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue: `Trust is built in the minutes after something breaks. ${APP_NAME} exists to make incident communication fast, honest, and effortless — a single public page that monitors every component, narrates each incident as it unfolds, and keeps an uptime record you can stand behind.`,
              },
            )}
          </p>
        </section>

        <section className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul
            data-mol-id="about-features"
            className={cm.cn(cm.stack(2), 'list-disc pl-6 text-on-surface-variant')}
          >
            <li>
              {t(
                'about.featureMonitoring',
                {},
                {
                  defaultValue:
                    'Component monitoring with automatic uptime checks and at-a-glance operational, degraded, and outage states.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureIncidents',
                {},
                {
                  defaultValue:
                    'Incident timelines that capture every update — investigating, identified, monitoring, resolved — with timestamps your team and your users can rely on.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureUptime',
                {},
                {
                  defaultValue:
                    'Ninety-day uptime history and maintenance windows, so planned work never looks like an outage.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureSubscribers',
                {},
                {
                  defaultValue:
                    'Subscriber notifications over email, SMS, webhooks, and RSS — per-component subscriptions keep the signal high and the noise low.',
                },
              )}
            </li>
          </ul>
        </section>

        <section className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p data-mol-id="about-contact" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Have feedback, found a bug, or want to roll this out for your team? We would love to hear from you — every message reaches a real human on the team.',
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
