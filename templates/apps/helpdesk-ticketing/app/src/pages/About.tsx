/**
 * Public "About" page. App-specific content grounded in what this
 * helpdesk actually does (tickets, SLA tracking, knowledge base,
 * macros, email notifications). Wrapped in the same public chrome
 * (Header + Footer + ContentPageShell) as the Pricing / Privacy /
 * Terms pages so the brand stays consistent. Every string flows
 * through `t()`.
 *
 * @returns The rendered about page.
 */
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
    id: 'tickets',
    titleKey: 'about.featureTickets.title',
    titleDefault: 'Shared ticket inbox',
    bodyKey: 'about.featureTickets.body',
    bodyDefault:
      'Every customer request becomes a ticket with status, priority, category, and assignee — so nothing slips through the cracks and the whole team sees who is working on what.',
  },
  {
    id: 'sla',
    titleKey: 'about.featureSla.title',
    titleDefault: 'SLA tracking',
    bodyKey: 'about.featureSla.body',
    bodyDefault:
      'First-response and resolution targets per priority keep your team accountable, with at-a-glance compliance so you can act before a deadline is breached.',
  },
  {
    id: 'knowledgeBase',
    titleKey: 'about.featureKb.title',
    titleDefault: 'Knowledge base',
    bodyKey: 'about.featureKb.body',
    bodyDefault:
      'Publish help articles your customers and agents can search, so common questions are answered once and deflected from the queue.',
  },
  {
    id: 'macros',
    titleKey: 'about.featureMacros.title',
    titleDefault: 'Macros & automation',
    bodyKey: 'about.featureMacros.body',
    bodyDefault:
      'Reusable reply templates and one-click actions cut repetitive work, while AI classification and summarization help triage incoming tickets fast.',
  },
  {
    id: 'notifications',
    titleKey: 'about.featureNotifications.title',
    titleDefault: 'Email notifications',
    bodyKey: 'about.featureNotifications.body',
    bodyDefault:
      'Customers and agents stay in the loop with transactional email on new replies and status changes, plus reports that show ticket volume and team performance over time.',
  },
]

export function About() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.title', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
      subtitle={t(
        'about.intro',
        { app: APP_NAME },
        {
          defaultValue:
            '{{app}} is a helpdesk and ticketing platform for support teams — turning email, chat, and form requests into organized tickets so your team can resolve issues faster and keep customers happy.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Great support is about responding quickly, never dropping a request, and learning from every conversation. {{app}} brings tickets, SLAs, a knowledge base, and automation into one place so support is measurable, consistent, and humane — for both your agents and your customers.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.stack(4))}>
            {FEATURES.map((f) => (
              <div key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
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
                defaultValue:
                  'Questions about {{app}}, feedback, or want a demo? Email hello@{{app}}.example or open a ticket from your workspace — every message reaches a real person on the team.',
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
