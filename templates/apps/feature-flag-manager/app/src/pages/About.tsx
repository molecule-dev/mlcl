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
    id: 'targeting',
    titleKey: 'about.feature.targeting.title',
    titleDefault: 'Surgical targeting',
    bodyKey: 'about.feature.targeting.body',
    bodyDefault:
      'Roll out by user, segment, plan tier, or country with attribute-based rules — so the right people see the right code, exactly when you decide.',
  },
  {
    id: 'rollouts',
    titleKey: 'about.feature.rollouts.title',
    titleDefault: 'Gradual rollouts & instant kill',
    bodyKey: 'about.feature.rollouts.body',
    bodyDefault:
      'Move a flag from 0 → 100% on a slider with sticky bucketing, then flip the killswitch the moment something looks wrong — no redeploy required.',
  },
  {
    id: 'environments',
    titleKey: 'about.feature.environments.title',
    titleDefault: 'First-class environments',
    bodyKey: 'about.feature.environments.body',
    bodyDefault:
      'Promote flag configuration across development, staging, and production with their own SDK keys, so what you test is what you ship.',
  },
  {
    id: 'audit',
    titleKey: 'about.feature.audit.title',
    titleDefault: 'Full audit trail',
    bodyKey: 'about.feature.audit.body',
    bodyDefault:
      'Every toggle, targeting-rule change, and rollout tweak is recorded — who, what, when, and why — with retention that scales with your plan.',
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
      subtitle={t('about.subtitle', {}, { defaultValue: 'Ship fearlessly, toggle instantly.' })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a feature-flag platform for teams that ship continuously. Toggle, target, and audit feature flags across every environment — decoupling deploys from releases so you can launch, experiment, and roll back without touching production code.`,
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
                  'Releasing software should be calm, reversible, and observable. We built a flag system where a risky change is one slider away from 1% of traffic and one click away from off — so engineers can move fast without betting the whole user base on every deploy.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(4), 'list-disc pl-6')}>
            {FEATURES.map((f) => (
              <li key={f.id} className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                <strong className={cm.cn('text-on-surface')}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </strong>{' '}
                — {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue: `Have feedback, found a bug, or want a deeper look at how ${APP_NAME} fits your release process? Reach the team from your account settings — every message goes to a real human.`,
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
