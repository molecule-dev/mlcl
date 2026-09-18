import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'

const FEATURES = [
  {
    key: 'availability',
    defaultTitle: 'Timezone-aware availability',
    defaultBody:
      'Set weekly hours, buffers between meetings, and one-off overrides. {{app}} does the timezone math so invitees only ever see slots you can actually take.',
  },
  {
    key: 'booking',
    defaultTitle: 'Polished booking links',
    defaultBody:
      'Share a clean link to each of your event types and let invitees self-serve a time — no more back-and-forth emails trying to find a slot.',
  },
  {
    key: 'sync',
    defaultTitle: 'Two-way calendar sync',
    defaultBody:
      'Connect Google, Outlook, and Apple Calendar so {{app}} writes confirmed meetings back and blocks any time you are already busy.',
  },
  {
    key: 'reminders',
    defaultTitle: 'Considerate reminders',
    defaultBody:
      'Automatic email reminders and reschedule links keep both sides on time, with confirmations that respect everyone’s time zone.',
  },
] as const

/**
 * Public About page for Meridian — the app's story, mission, and what users get.
 *
 * @returns The rendered about page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About us' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t('about.subtitle', { tagline: APP_TAGLINE }, { defaultValue: APP_TAGLINE })}
      containerSize="lg"
    >
      <div className={cm.cn(cm.stack(10))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} is scheduling software for people whose time is their product. Share a booking link, set your availability once, and let us handle the calendar math across every timezone — so meetings get booked without the back-and-forth.',
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'We believe scheduling should disappear into the background. Founders, recruiters, consultants, and support teams shouldn’t lose hours to email tag — they should send a link and get back to work. {{app}} is built to make every booking feel effortless and on-brand.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.whatYouGetTitle', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(4))}>
            {FEATURES.map((f) => (
              <li key={f.key} data-mol-id={`about-feature-${f.key}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {t(`about.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(
                    `about.feature.${f.key}.body`,
                    { app: APP_NAME },
                    { defaultValue: f.defaultBody },
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Questions, feedback, or a feature you wish {{app}} had? We read every message — reach out from your account settings and a real person on the team will get back to you.',
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
