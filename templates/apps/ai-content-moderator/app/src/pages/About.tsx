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
    id: 'queue',
    titleKey: 'about.feature.queue.title',
    titleDefault: 'Unified review queue',
    bodyKey: 'about.feature.queue.body',
    bodyDefault:
      'Every flagged item from every surface lands in one prioritised, keyboard-driven queue so reviewers never hunt across tools.',
  },
  {
    id: 'ai',
    titleKey: 'about.feature.ai.title',
    titleDefault: 'AI verdicts with reasoning',
    bodyKey: 'about.feature.ai.body',
    bodyDefault:
      'Claude-powered classification returns a verdict, a confidence score, and the categories and policy violations behind it — not a black box.',
  },
  {
    id: 'rules',
    titleKey: 'about.feature.rules.title',
    titleDefault: 'Visual rule builder',
    bodyKey: 'about.feature.rules.body',
    bodyDefault:
      'Compose AND/OR moderation rules, preview matches against historical content, and ship policy changes in minutes.',
  },
  {
    id: 'analytics',
    titleKey: 'about.feature.analytics.title',
    titleDefault: 'Compliance-ready analytics',
    bodyKey: 'about.feature.analytics.body',
    bodyDefault:
      'Track verdict trends, AI accuracy, and reviewer throughput, with audit logs and exports ready for compliance review.',
  },
]

/**
 * Public About page describing what {@link APP_NAME} is and who it is for.
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
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a moderation console for trust & safety teams reviewing flagged content across community platforms. It pulls every report into one place, pairs each item with an AI-assisted verdict and reasoning, and gives reviewers the rules, context, and audit trail they need to decide fast and consistently.`,
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
                  'Online communities are drowning in content and the people who keep them safe are stretched thin. We believe moderation should be calm, transparent, and accountable — humans making the final call, AI doing the heavy lifting, and every decision explainable. That is what we build for.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 2, gap: 6 }))}>
            {FEATURES.map((feature) => (
              <article
                key={feature.id}
                data-mol-id={`about-feature-${feature.id}`}
                className={cm.cn(
                  cm.stack(2),
                  'rounded-xl bg-surface-container-lowest p-5 border border-surface-container/40',
                )}
              >
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'font-display')}>
                  {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(feature.bodyKey, {}, { defaultValue: feature.bodyDefault })}
                </p>
              </article>
            ))}
          </div>
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
                defaultValue: `Want a walkthrough, have feedback, or need help rolling ${APP_NAME} out to your team? Reach out from your account and a real person on the team will get back to you.`,
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
