/**
 * About — public "about" page for Rapport. App-specific copy grounded in the
 * product (AI-first customer support console with knowledge base, escalation,
 * and analytics). Wrapped in the shared public chrome so brand stays consistent
 * with Landing / Privacy / Terms.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingTopNavBar } from '../components/LandingTopNavBar.js'

const FEATURES: { key: string; def: string }[] = [
  {
    key: 'about.featureTriage',
    def: 'AI-first triage that classifies intent, searches your knowledge base, and drafts a grounded reply before an agent ever opens the ticket.',
  },
  {
    key: 'about.featureKnowledge',
    def: 'A living knowledge base the bot learns from — articles, tags, and embeddings keep answers accurate and on-brand as your product changes.',
  },
  {
    key: 'about.featureEscalation',
    def: 'Warm escalation to humans mid-thread, with full conversation context and sentiment so nothing gets lost in the handoff.',
  },
  {
    key: 'about.featureAnalytics',
    def: 'Honest analytics: what the bot resolved, what it escalated, CSAT, and where it misread — in plain language, not vanity charts.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      data-mol-id="page-about"
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-on-background antialiased',
      )}
    >
      <LandingTopNavBar />
      <main
        className={cm.cn(cm.mxAuto, cm.w('full'), 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 16))}
      >
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.sp('mb', 6),
            'text-4xl md:text-5xl tracking-tight text-on-background',
          )}
        >
          {t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
        </h1>
        <div className={cm.cn(cm.stack(4), 'text-on-surface-variant leading-relaxed')}>
          <p data-mol-id="about-intro" className={cm.textSize('lg')}>
            {t(
              'about.intro',
              { appName: APP_NAME },
              {
                defaultValue: `${APP_NAME} is an AI-first customer support console. It resolves the routine questions on its own, hands the nuanced ones to your team with full context, and gets sharper every day by learning from real conversations.`,
              },
            )}
          </p>

          <h2
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.sp('mt', 8),
              'text-2xl tracking-tight text-on-surface',
            )}
          >
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p data-mol-id="about-mission">
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'Support teams should never have to choose between fast and human. We build tooling that automates the repetitive work so your people can spend their time where empathy and judgment actually matter — and so every customer feels heard, not handled.',
              },
            )}
          </p>

          <h2
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.sp('mt', 8),
              'text-2xl tracking-tight text-on-surface',
            )}
          >
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul data-mol-id="about-features" className={cm.cn(cm.stack(3), 'list-disc pl-6')}>
            {FEATURES.map((f) => (
              <li key={f.key}>{t(f.key, {}, { defaultValue: f.def })}</li>
            ))}
          </ul>

          <h2
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.sp('mt', 8),
              'text-2xl tracking-tight text-on-surface',
            )}
          >
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p data-mol-id="about-contact">
            {t(
              'about.contactBody',
              { appName: APP_NAME },
              {
                defaultValue: `Questions, feedback, or want a walkthrough? Start a free trial and message us right from your ${APP_NAME} dashboard — a real human on the team reads every note.`,
              },
            )}
          </p>
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}

export default About
export { About as AboutPage }
