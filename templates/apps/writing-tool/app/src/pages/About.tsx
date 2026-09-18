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
    id: 'editor',
    titleKey: 'about.featureEditor.title',
    titleDefault: 'A distraction-free editor',
    bodyKey: 'about.featureEditor.body',
    bodyDefault:
      'A calm, serif writing surface with Markdown when you want it and out of the way when you don’t. No toolbars crowding the page — just you and the line you’re on.',
  },
  {
    id: 'focus',
    titleKey: 'about.featureFocus.title',
    titleDefault: 'Typewriter focus mode',
    bodyKey: 'about.featureFocus.body',
    bodyDefault:
      'The chrome disappears, the active line stays centered, and a soft frame holds your attention on the words — the rest of the app waits quietly until you come back.',
  },
  {
    id: 'goals',
    titleKey: 'about.featureGoals.title',
    titleDefault: 'Word goals and streaks',
    bodyKey: 'about.featureGoals.body',
    bodyDefault:
      'Set a daily goal and let the count live in the margin. Streaks keep you honest without turning writing into a leaderboard.',
  },
  {
    id: 'library',
    titleKey: 'about.featureLibrary.title',
    titleDefault: 'A library, not an inbox',
    bodyKey: 'about.featureLibrary.body',
    bodyDefault:
      'Group manuscripts into folders, tag drafts, keep full version history, and export to Markdown, HTML, or plain text. Your work reads like a bookshelf, not a list of unread items.',
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
      eyebrow={t('about.eyebrow', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      title={t('about.title', {}, { defaultValue: 'A writing room you can keep in your pocket' })}
    >
      <div data-mol-id="about-body" className={cm.cn(cm.stack(8))}>
        <p
          data-mol-id="about-intro"
          className={cm.cn(cm.prose, cm.textSize('lg'), 'text-on-surface-variant')}
        >
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue: `${APP_NAME} is an iA Writer-like, distraction-free writing tool for novelists, essayists, and working journalists. Markdown, typewriter focus mode, and a sparing but well-thought-out document library keep the page — not the interface — at the center of your work.`,
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
              { appName: APP_NAME },
              {
                defaultValue: `We believe long-form writing deserves a calm place to happen. ${APP_NAME} strips away the busywork — no nagging notifications, no infinite formatting menus — so the only thing competing for your attention is the next sentence.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(4))}>
            {FEATURES.map((feature) => (
              <li
                key={feature.id}
                data-mol-id={`about-feature-${feature.id}`}
                className={cm.cn(cm.stack(1))}
              >
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
                </h3>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(feature.bodyKey, {}, { defaultValue: feature.bodyDefault })}
                </p>
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
              { appName: APP_NAME },
              {
                defaultValue: `Found a bug, have a feature request, or just want to tell us what you’re writing? Reach the ${APP_NAME} team from Settings — every message goes to a real human.`,
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
