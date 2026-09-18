import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
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
    id: 'inbox',
    titleKey: 'about.feature.inbox.title',
    titleDefault: 'A shared, real-time inbox',
    bodyKey: 'about.feature.inbox.body',
    bodyDefault:
      'Every live chat lands in one collaborative inbox. Assign conversations, leave private notes for teammates, and watch replies stream in as they happen — no refreshing, no lost threads.',
  },
  {
    id: 'bot',
    titleKey: 'about.feature.bot.title',
    titleDefault: 'An AI chatbot that triages',
    bodyKey: 'about.feature.bot.body',
    bodyDefault:
      'The built-in bot answers common questions, pulls up account context, and hands off to a human the moment a conversation needs one — so your agents spend their time where it matters.',
  },
  {
    id: 'canned',
    titleKey: 'about.feature.canned.title',
    titleDefault: 'Canned responses on tap',
    bodyKey: 'about.feature.canned.body',
    bodyDefault:
      'Save your best replies and drop them in with a keyboard shortcut. Consistent, on-brand answers in a keystroke — without copy-pasting from a doc.',
  },
  {
    id: 'contacts',
    titleKey: 'about.feature.contacts.title',
    titleDefault: 'Contacts with full history',
    bodyKey: 'about.feature.contacts.body',
    bodyDefault:
      'Every customer has a profile that follows them across conversations — tags, company, and the complete back-and-forth — so you always know who you are talking to.',
  },
  {
    id: 'reports',
    titleKey: 'about.feature.reports.title',
    titleDefault: 'Reports and automations',
    bodyKey: 'about.feature.reports.body',
    bodyDefault:
      'Track CSAT, response times, and resolution rates on a live dashboard, and set automation rules that route, tag, and follow up on conversations for you.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About us' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.intro',
        { appName: APP_NAME },
        {
          defaultValue: `${APP_NAME} is the empathetic support workspace built for modern teams — live chat, an AI chatbot, canned responses, and an agent dashboard in one place, so you can talk to customers like humans, not tickets.`,
        },
      )}
    >
      <div data-mol-id="about-body" className={cm.cn(cm.stack(10))}>
        <section data-mol-id="about-mission" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { appName: APP_NAME },
              {
                defaultValue: `Support should feel like a conversation, not a queue. ${APP_NAME} gives small teams the same caliber of tooling the biggest help desks rely on — real-time chat, smart automation, and a single source of truth for every customer — without the bloat or the per-seat sticker shock.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(6))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.stack(6))}>
            {FEATURES.map((feature) => (
              <div
                key={feature.id}
                data-mol-id={`about-feature-${feature.id}`}
                className={cm.cn(cm.stack(2))}
              >
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
                </h3>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(feature.bodyKey, {}, { defaultValue: feature.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { appName: APP_NAME },
              {
                defaultValue: `Questions, feedback, or want a demo? Start a chat from your ${APP_NAME} inbox or create a free account and reach us the same way your customers reach you — every message goes to a real person on the team.`,
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
