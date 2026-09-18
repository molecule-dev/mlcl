import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface FeatureSpec {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: ReadonlyArray<FeatureSpec> = [
  {
    id: 'tutor',
    titleKey: 'about.featureTutor.title',
    titleDefault: 'A patient AI tutor',
    bodyKey: 'about.featureTutor.body',
    bodyDefault:
      'Ask anything about any subject and learn through Socratic dialogue. Explanations are grounded in your own study materials with RAG-powered citations, so answers stay accurate and relevant.',
  },
  {
    id: 'quizzes',
    titleKey: 'about.featureQuizzes.title',
    titleDefault: 'Quizzes that teach',
    bodyKey: 'about.featureQuizzes.body',
    bodyDefault:
      'Generate practice quizzes from any topic and get instant, detailed feedback. Every question explains the reasoning so you correct misconceptions early.',
  },
  {
    id: 'flashcards',
    titleKey: 'about.featureFlashcards.title',
    titleDefault: 'Smart flashcards',
    bodyKey: 'about.featureFlashcards.body',
    bodyDefault:
      'Spaced-repetition decks schedule reviews at the moment you are about to forget, so knowledge moves into long-term memory with the least effort.',
  },
  {
    id: 'progress',
    titleKey: 'about.featureProgress.title',
    titleDefault: 'Progress & streaks',
    bodyKey: 'about.featureProgress.body',
    bodyDefault:
      'Watch your mastery grow with visual progress tracking, and keep momentum with daily study streaks that make consistency feel rewarding.',
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
        { app: APP_NAME, tagline: APP_TAGLINE },
        {
          defaultValue:
            '{{app}} is your patient AI tutor for flashcards, quizzes, and Socratic dialogue. {{tagline}} — build deep, lasting understanding of any subject at your own pace.',
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
                  'Real learning comes from understanding, not memorizing. {{app}} brings together adaptive tutoring, spaced repetition, and honest progress tracking so every learner has a knowledgeable guide that meets them where they are — and never loses patience.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.whatYouGetTitle', {}, { defaultValue: 'What you get' })}
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
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Questions, feedback, or ideas for {{app}}? We would love to hear from you — every message reaches a real person on the team.',
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
