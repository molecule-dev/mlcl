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
    id: 'compose',
    titleKey: 'about.featureCompose.title',
    titleDefault: 'Compose every loop',
    bodyKey: 'about.featureCompose.body',
    bodyDefault:
      'Wire prompts, tools, and providers into deterministic agent graphs in the builder. Swap models — Claude, GPT, and more — without touching the downstream contract.',
  },
  {
    id: 'trace',
    titleKey: 'about.featureTrace.title',
    titleDefault: 'Watch every step',
    bodyKey: 'about.featureTrace.body',
    bodyDefault:
      'Inspect tool calls, token spend, and latency live in the execution trace. Debug failures with a full step-by-step log instead of an opaque stack trace.',
  },
  {
    id: 'evaluate',
    titleKey: 'about.featureEvaluate.title',
    titleDefault: 'Evaluate with evidence',
    bodyKey: 'about.featureEvaluate.body',
    bodyDefault:
      'Datasets, knowledge bases, and run history ride alongside your agents. Replay against fixtures and promote a build only when the trace is green.',
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
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.subtitle',
        {},
        { defaultValue: 'The workbench for building, testing, and observing AI agents.' },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is an agent-development workbench. Compose tool graphs, swap providers, and ship traceable production agents — all in one place. Instead of stringing together scripts and guessing at what your agent did, you wire intelligence and watch it run.`,
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-headline')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'Agents should be observable, reproducible, and provider-agnostic. We believe every tool call, every token, and every decision an agent makes should be inspectable — so you can trust what you ship and swap models freely as the frontier moves.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-headline')}>
            {t('about.whatYouGetTitle', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.stack(4))}>
            {FEATURES.map((feature) => (
              <div
                key={feature.id}
                data-mol-id={`about-feature-${feature.id}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-low rounded-lg border border-outline-variant/15',
                )}
              >
                <h3
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('lg'),
                    cm.sp('mb', 2),
                    'font-headline text-on-surface',
                  )}
                >
                  {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(feature.bodyKey, {}, { defaultValue: feature.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-headline')}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue: `Have feedback, hit a bug, or want to see ${APP_NAME} support a new provider? Reach out from your account settings — every message reaches a real person on the team.`,
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
