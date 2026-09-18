import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

/**
 * Public About page — app-specific story for the AI code-review tool,
 * wrapped in the same public chrome (ContentPageShell + Footer) the
 * Privacy/Terms/Pricing pages use so brand stays consistent.
 */

interface Feature {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'scoring',
    titleKey: 'about.feature.scoring.title',
    titleDefault: 'AI quality scoring',
    bodyKey: 'about.feature.scoring.body',
    bodyDefault:
      'Every pull request gets a 0–10 score with security, performance, maintainability, and style breakdowns — each finding cited back to the exact offending line.',
  },
  {
    id: 'github',
    titleKey: 'about.feature.github.title',
    titleDefault: 'GitHub-native reviews',
    bodyKey: 'about.feature.github.body',
    bodyDefault:
      'Connect a repository in seconds. We review every push via webhooks and post inline comments and suggested patches on the PR your team already works in.',
  },
  {
    id: 'rules',
    titleKey: 'about.feature.rules.title',
    titleDefault: 'Your rules, your guardrails',
    bodyKey: 'about.feature.rules.body',
    bodyDefault:
      'Author custom rules per language, tune severities by category, and pin must-fix-before-merge guardrails so standards are enforced automatically.',
  },
  {
    id: 'reports',
    titleKey: 'about.feature.reports.title',
    titleDefault: 'Reports your team reads',
    bodyKey: 'about.feature.reports.body',
    bodyDefault:
      'Trend charts on code quality, hotspots by file and contributor, and review history — exportable on paid plans, with no source code ever stored.',
  },
]

export function About() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-about"
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.subtitle',
        { app: APP_NAME },
        {
          defaultValue:
            '{{app}} reads every pull request like a senior engineer would — flagging security holes, suggesting rewrites, and grading the diff so teams ship faster without shipping regressions.',
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
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Code review is where quality is won or lost — but thorough review does not scale with the volume of pull requests modern teams ship. {{app}} brings AI-assisted review into the GitHub flow you already use, catching the bug-prone diff before it merges while keeping every human in the loop.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.whatYouGetTitle', {}, { defaultValue: 'What you get' })}
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
              { app: APP_NAME },
              {
                defaultValue:
                  'Questions about {{app}}, want a demo for your team, or have feedback? Email hello@example.com and a real engineer on the team will get back to you.',
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
