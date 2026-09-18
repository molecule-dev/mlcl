import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
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
    id: 'verified',
    titleKey: 'about.feature.verified.title',
    titleDefault: 'Verified, vetted tutors',
    bodyKey: 'about.feature.verified.body',
    bodyDefault:
      'Every tutor passes identity, credential, and teaching-demo checks before their profile goes live — so you can book any subject with confidence.',
  },
  {
    id: 'booking',
    titleKey: 'about.feature.booking.title',
    titleDefault: 'Effortless booking & scheduling',
    bodyKey: 'about.feature.booking.body',
    bodyDefault:
      'Browse profiles, pick a time that fits your week, and pay securely. Rescheduling and reminders are built in, so a session never slips through the cracks.',
  },
  {
    id: 'sessions',
    titleKey: 'about.feature.sessions.title',
    titleDefault: 'Live sessions, messaging & reviews',
    bodyKey: 'about.feature.sessions.body',
    bodyDefault:
      'Meet in a real-time session room, message your tutor between lessons, and leave honest reviews that help the whole community find the right fit.',
  },
  {
    id: 'plans',
    titleKey: 'about.feature.plans.title',
    titleDefault: 'Plans that scale with you',
    bodyKey: 'about.feature.plans.body',
    bodyDefault:
      'Start free and upgrade to Pro or Team when you need more bookings, sessions, and advanced features — billing is handled securely through Stripe.',
  },
]

/**
 * Public "About" page describing the marketplace.
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
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About us' })}
      title={t('about.pageTitle', { name: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { name: APP_NAME, tagline: APP_TAGLINE },
            {
              defaultValue: `${APP_NAME} is a tutoring marketplace where students find verified experts for any subject and book one-on-one help in minutes. ${APP_TAGLINE} — we connect curious learners with great teachers and handle the search, scheduling, payments, and reminders so everyone can focus on the lesson.`,
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
              { name: APP_NAME },
              {
                defaultValue: `Great tutoring should be easy to find and easy to trust. ${APP_NAME} exists to make expert, one-on-one teaching accessible to every learner — and to give talented tutors a place to build a reputation, set their own rates, and earn doing what they love.`,
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
              { name: APP_NAME },
              {
                defaultValue: `Questions, feedback, or want to teach on ${APP_NAME}? Reach us any time from your account settings or apply through the "Become a tutor" page — a real person on the team reads every message.`,
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
