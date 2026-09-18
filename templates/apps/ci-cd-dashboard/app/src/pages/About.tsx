import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

const FEATURES = [
  {
    key: 'pipelines',
    titleDefault: 'Pipelines that finish fast',
    bodyDefault:
      'Parallel build and deploy pipelines per repository and branch, with structured stage timing and exit codes — so a red build is obvious in seconds, not after a long scroll.',
  },
  {
    key: 'logs',
    titleDefault: 'Readable, real-time logs',
    bodyDefault:
      'Stream build logs live with ANSI colour and per-step grouping, then keep them around for as long as your plan’s retention window allows.',
  },
  {
    key: 'environments',
    titleDefault: 'First-class environments',
    bodyDefault:
      'Promote a build across staging, preview, and production, track traffic splits, and see the current and recent deploys for every environment at a glance.',
  },
  {
    key: 'artifacts',
    titleDefault: 'Artifacts & DORA insights',
    bodyDefault:
      'Store build artifacts in your own S3 bucket and watch the metrics that matter — lead time, deploy frequency, MTTR, and change-failure rate — trend over time.',
  },
] as const

export function About() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.title', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.subtitle',
        { app: APP_NAME },
        {
          defaultValue:
            '{{app}} is a CI/CD dashboard for teams who want to monitor builds, deployments, and environments across every repository — and ship with certainty.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <section data-mol-id="about-intro" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.introHeading', { app: APP_NAME }, { defaultValue: 'What {{app}} is' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.introBody',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} brings GitHub Actions-style continuous delivery into one fast dashboard: pipelines, build logs, artifacts, status badges, and deployment environments for all of your repositories in a single place. No tab-hopping, no guessing which build broke — every run, log line, and deploy is one click away.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionHeading', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'Shipping software should be calm and predictable, not a source of dread. We build the pipelines, logs, and deploy tooling so the path from commit to production is fast, visible, and trustworthy — the first green build in five minutes, and every build after it just as clear.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.featuresHeading', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(4))}>
            {FEATURES.map((f) => (
              <li key={f.key} data-mol-id={`about-feature-${f.key}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t(`about.feature.${f.key}.title`, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(`about.feature.${f.key}.body`, {}, { defaultValue: f.bodyDefault })}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactHeading', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Questions, feedback, or want a demo for your team? Email us at hello@conduit.dev — every message reaches a real person on the team.',
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
