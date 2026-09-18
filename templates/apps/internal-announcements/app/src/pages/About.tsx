import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

const FEATURES: { key: string; def: string }[] = [
  {
    key: 'about.featurePriority',
    def: 'Priority levels — Urgent, Pinned, Normal, and FYI — with colored accents and pills so importance is readable at a glance, never by color alone.',
  },
  {
    key: 'about.featureAcks',
    def: 'Explicit acknowledgments with a visible progress bar and a full audit trail, so you always know who has — and has not — seen the message.',
  },
  {
    key: 'about.featureThreads',
    def: 'Threaded discussion attached to each announcement, keeping questions and context next to the post instead of scattered across chat.',
  },
  {
    key: 'about.featureAnalytics',
    def: 'Read analytics — acknowledgment rates, time-to-ack, and view events — to measure whether your most important messages actually landed.',
  },
  {
    key: 'about.featureAudience',
    def: 'Audience targeting by team and category, plus search, notifications, and a team directory to reach exactly the right people.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', {}, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is the internal announcement layer for mid-to-large companies — a company town hall where the messages that have to land actually do. Priority levels, explicit acknowledgments, and threaded discussion keep signal above the noise.`,
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'Too many critical internal messages drown in chat backchannels and crowded inboxes. We believe important company communication deserves a dedicated home — one with proof of receipt, clear priority, and a place for the conversation that follows.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6 text-on-surface-variant')}>
            {FEATURES.map((f) => (
              <li key={f.key}>{t(f.key, {}, { defaultValue: f.def })}</li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue: `Have feedback, a feature request, or want to roll ${APP_NAME} out across your company? Reach the team from your workspace settings — every message goes to a real human.`,
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
