import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import TopNavBar from '../components/TopNavBar.js'

interface Feature {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'flows',
    titleKey: 'about.flowsTitle',
    titleDefault: 'Visual conversation flows',
    bodyKey: 'about.flows',
    bodyDefault:
      'Design branching dialogs, intent routing, and action nodes on a drag-and-drop canvas — no glue code required.',
  },
  {
    id: 'knowledge',
    titleKey: 'about.knowledgeTitle',
    titleDefault: 'Knowledge base & RAG',
    bodyKey: 'about.knowledge',
    bodyDefault:
      'Upload documents and URLs; they are embedded and indexed so your bots answer from your own content with retrieval-augmented generation.',
  },
  {
    id: 'training',
    titleKey: 'about.trainingTitle',
    titleDefault: 'Intents & training data',
    bodyKey: 'about.training',
    bodyDefault:
      'Define intents, add training examples, and continuously sharpen recognition from real conversations.',
  },
  {
    id: 'deploy',
    titleKey: 'about.deployTitle',
    titleDefault: 'Deploy to every channel',
    bodyKey: 'about.deploy',
    bodyDefault:
      'Ship to a website widget, messaging channels, and a public API, with model-provider choice baked in.',
  },
  {
    id: 'analytics',
    titleKey: 'about.analyticsTitle',
    titleDefault: 'Analytics & sentiment',
    bodyKey: 'about.analytics',
    bodyDefault:
      'Track conversations, top intents, and sentiment in real time, and tune your bots from the insights.',
  },
]

/**
 * Public "About" page for the AI Chatbot Builder.
 *
 * Mirrors the app's other public content pages (Privacy / Terms / Pricing):
 * the shared {@link ContentPageShell} wrapped in the app's own
 * {@link TopNavBar} so brand chrome stays consistent. Copy is grounded in
 * the app's real purpose — a visual chatbot builder with flows, a
 * RAG-backed knowledge base, intents/training, deployment, and analytics.
 *
 * @returns The rendered About page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<TopNavBar />}
      eyebrow={t('nav.about', {}, { defaultValue: 'About' })}
      title={t('about.title', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.intro',
        { appName: APP_NAME },
        {
          defaultValue: `${APP_NAME} is a visual chatbot builder for teams who want production-grade conversational AI without writing glue code.`,
        },
      )}
    >
      <div className={cm.cn(cm.stack(10))}>
        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.mission',
              { appName: APP_NAME },
              {
                defaultValue: `${APP_NAME} exists to make conversational AI approachable. Design branching flows, ground answers in your own knowledge base, train intents on real conversations, and deploy across every channel — all from a single workspace.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.featuresTitle', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.stack(6))}>
            {FEATURES.map((f) => (
              <div key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
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
              'about.contact',
              { appName: APP_NAME },
              {
                defaultValue: `Questions, feedback, or partnership ideas? Reach the ${APP_NAME} team from the Help center or your account settings — we'd love to hear what you're building.`,
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
