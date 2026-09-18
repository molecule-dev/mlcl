import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingTopNavBar } from '../components/LandingTopNavBar.js'

interface Feature {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'transcription',
    titleKey: 'about.featureTranscription.title',
    titleDefault: 'Live transcription with speaker labels',
    bodyKey: 'about.featureTranscription.body',
    bodyDefault:
      'Record or upload a meeting and get an accurate, speaker-labeled transcript. Every voice is colored so the conversation reads like a script you can scan in seconds.',
  },
  {
    id: 'summaries',
    titleKey: 'about.featureSummaries.title',
    titleDefault: 'AI summaries the moment the call ends',
    bodyKey: 'about.featureSummaries.body',
    bodyDefault:
      'A TL;DR, the decisions made, and the open follow-ups are extracted automatically — ready to share before the next standup, no manual note-taking required.',
  },
  {
    id: 'actions',
    titleKey: 'about.featureActions.title',
    titleDefault: 'Action items with owners and due dates',
    bodyKey: 'about.featureActions.body',
    bodyDefault:
      '{{app}} pulls every commitment out of the conversation, assigns an owner and a due date, and rolls them up across meetings so nothing slips between the cracks.',
  },
  {
    id: 'search',
    titleKey: 'about.featureSearch.title',
    titleDefault: 'A searchable timeline of every meeting',
    bodyKey: 'about.featureSearch.body',
    bodyDefault:
      'Full-text search across transcripts, decisions, and follow-ups, plus calendar and integration hooks that keep your meeting history in one place.',
  },
]

/**
 * Public About page describing what Murmur is and what it does for teams.
 * Wrapped in the shared public marketing chrome (top nav + footer).
 *
 * @returns The rendered About page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <LandingTopNavBar />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.maxW('3xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 16), cm.stack(10))}
      >
        <header className={cm.cn(cm.stack(4))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'self-start uppercase tracking-widest rounded-full bg-primary/10 text-primary border border-primary/20',
            )}
          >
            {t('about.eyebrow', {}, { defaultValue: 'About us' })}
          </span>
          <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
          </h1>
          <p
            data-mol-id="about-intro"
            className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant leading-relaxed')}
          >
            {t(
              'about.intro',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} is meeting intelligence for teams that would rather make decisions than take notes. It joins your calls, transcribes every word with speaker labels, and ships an AI summary plus owned action items the moment the meeting ends.',
              },
            )}
          </p>
        </header>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Meetings are where teams decide things — and where those decisions get lost. {{app}} exists to make sure the work that happens in a conversation outlives the conversation: a faithful record, a clear recap, and accountable next steps, automatically.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(4))}>
            {FEATURES.map((f) => (
              <li
                key={f.id}
                data-mol-id={`about-feature-${f.id}`}
                className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(2))}
              >
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(f.bodyKey, { app: APP_NAME }, { defaultValue: f.bodyDefault })}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Questions, feedback, or a feature request? Email the team at hello@murmur.app — every message reaches a real human who works on the product.',
              },
            )}
          </p>
        </section>
      </main>
      <LandingFooter />
    </div>
  )
}

export default About
export { About as AboutPage }
