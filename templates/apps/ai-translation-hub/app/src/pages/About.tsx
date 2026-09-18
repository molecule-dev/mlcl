import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
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
    id: 'ai',
    titleKey: 'about.feature.ai.title',
    titleDefault: 'AI-assisted segments',
    bodyKey: 'about.feature.ai.body',
    bodyDefault:
      'Claude and DeepL pre-fill every target segment with confidence scores, so your linguists spend their time on nuance instead of boilerplate.',
  },
  {
    id: 'memory',
    titleKey: 'about.feature.memory.title',
    titleDefault: 'Translation memory & glossary',
    bodyKey: 'about.feature.memory.body',
    bodyDefault:
      'Reuse past translations with fuzzy and exact matches, and lock terminology with an approved-term glossary scoped per client and project — quality compounds over time.',
  },
  {
    id: 'projects',
    titleKey: 'about.feature.projects.title',
    titleDefault: 'Projects & document upload',
    bodyKey: 'about.feature.projects.body',
    bodyDefault:
      'Organize work into projects, drop in .docx and other documents, and track segments, due dates, and status across your whole localization pipeline.',
  },
  {
    id: 'review',
    titleKey: 'about.feature.review.title',
    titleDefault: 'Diff-aware review & export',
    bodyKey: 'about.feature.review.body',
    bodyDefault:
      'Side-by-side diffs, inline comments, and accept/reject give reviewers the workflow they wish they had — then export clean results to CSV or DOCX.',
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
      eyebrow={t('nav.about', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.intro',
        { app: APP_NAME, tagline: APP_TAGLINE },
        {
          defaultValue:
            '{{app}} is the translation workspace for high-performing localization teams — document and website translation with AI review and project management. {{tagline}}.',
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
                  'We believe great localization should combine AI precision with editorial craft. {{app}} brings AI-assisted translation, translation memory, a domain glossary, and a reviewer-ready workflow into one workspace, so teams ship accurate, on-brand content in every market — faster.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
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
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Have feedback, found a bug, or want a guided walkthrough? Visit the Help page or start a free trial — every message reaches a real human on the team.',
              },
            )}
          </p>
        </section>

        <Link
          to="/"
          data-mol-id="about-back-home"
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'text-primary hover:underline',
          )}
        >
          {t('auth.backToHomeArrow', {}, { defaultValue: '← Back to home' })}
        </Link>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
