/**
 * Public "About" page. App-specific content grounded in the product —
 * a voice-native AI assistant (speech-to-text, Claude reasoning,
 * text-to-speech, multi-agent personas, realtime). Wrapped in the same
 * public chrome (Header + Footer) used by Pricing / Privacy / Terms.
 * Every string flows through `t()`.
 *
 * @returns The rendered about page.
 */
import { Link } from 'react-router'

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
    id: 'voice',
    titleKey: 'about.feature.voice.title',
    titleDefault: 'Voice-first conversation',
    bodyKey: 'about.feature.voice.body',
    bodyDefault:
      'Talk the way you think. Real-time speech-to-text turns what you say into accurate transcripts, with no trigger words or rigid commands.',
  },
  {
    id: 'intelligence',
    titleKey: 'about.feature.intelligence.title',
    titleDefault: 'Reasoning that keeps up',
    bodyKey: 'about.feature.intelligence.body',
    bodyDefault:
      'Your transcript is answered by Claude, which understands context, interruptions, and the nuance of human speech — then speaks back to you with natural text-to-speech.',
  },
  {
    id: 'personas',
    titleKey: 'about.feature.personas.title',
    titleDefault: 'Multi-agent personas',
    bodyKey: 'about.feature.personas.body',
    bodyDefault:
      'Build a creative brainstormer, a strict editor, or a technical advisor — each with its own system prompt, model, and voice — and switch between them mid-flow.',
  },
  {
    id: 'history',
    titleKey: 'about.feature.history.title',
    titleDefault: 'A searchable record',
    bodyKey: 'about.feature.history.body',
    bodyDefault:
      'Every conversation is saved, transcribed, and searchable. Revisit a session, export what matters, and pick up exactly where you left off.',
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
      title={t('about.title', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.intro',
        { app: APP_NAME },
        {
          defaultValue:
            '{{app}} is a voice-native AI assistant. Speak naturally, watch your words become text, and get spoken answers back — so you can think out loud instead of typing it all in.',
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
                  'Typing is a bottleneck between your ideas and getting them out. {{app}} exists to remove it: a hands-free, conversational way to brainstorm, draft, and decide — powered by best-in-class speech and reasoning models, with your data kept private.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
            {FEATURES.map((f) => (
              <article
                key={f.id}
                data-mol-id={`about-feature-${f.id}`}
                className={cm.cn(
                  cm.stack(2),
                  cm.sp('p', 5),
                  'rounded-2xl bg-surface border border-border',
                )}
              >
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
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
              { app: APP_NAME },
              {
                defaultValue:
                  'Have feedback, a feature request, or found a bug? Reach the {{app}} team through the support link in your account menu — every message goes to a real human.',
              },
            )}
          </p>
        </section>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <Link
            to="/signup"
            data-mol-id="about-cta-signup"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary')}
          >
            {t('common.getStarted', {}, { defaultValue: 'Get started' })}
          </Link>
          <Link
            to="/"
            data-mol-id="about-back-home"
            className={cm.cn(cm.fontWeight('bold'), 'text-primary')}
          >
            {t('nav.backToHome', {}, { defaultValue: '← Back to home' })}
          </Link>
        </div>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
