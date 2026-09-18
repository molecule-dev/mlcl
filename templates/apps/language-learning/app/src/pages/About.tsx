import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

const FEATURES = [
  {
    key: 'lessons',
    defaultValue:
      'Five-minute daily lessons built around your goal, with spaced repetition that keeps every word in earshot.',
  },
  {
    key: 'speaking',
    defaultValue:
      'Native-quality speech playback plus pronunciation checks, so you practise saying every new phrase out loud.',
  },
  {
    key: 'vocabulary',
    defaultValue:
      'A living vocabulary that resurfaces the words you stumble on — tomorrow, next week, then never, until you own them.',
  },
  {
    key: 'streaks',
    defaultValue:
      'Streaks, XP, and a friends leaderboard that reward showing up every day instead of cramming once a month.',
  },
] as const

/**
 * Public "About" page describing what {@link APP_NAME} is and why it exists.
 *
 * @returns The rendered about page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<AuthBrandHeader />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About us' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(6))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a daily language-learning app for adults who want real fluency without the busywork. Five-minute lessons, vocabulary drills, and speaking practice fit into a coffee break — all wrapped in a streak you'll actually keep.`,
            },
          )}
        </p>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 4),
            'font-display',
          )}
        >
          {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
        </h2>
        <p data-mol-id="about-mission" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.missionBody',
            { appName: APP_NAME },
            {
              defaultValue: `We believe consistency beats cramming. ${APP_NAME} is built around a simple practice loop — learn a little, review what's fading, then say it out loud — so a new language sticks for life, not just until the next test.`,
            },
          )}
        </p>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 4),
            'font-display',
          )}
        >
          {t('about.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <ul
          data-mol-id="about-features"
          className={cm.cn(cm.stack(2), cm.prose, 'list-disc pl-6 text-on-surface-variant')}
        >
          {FEATURES.map((f) => (
            <li key={f.key} data-mol-id={`about-feature-${f.key}`}>
              {t(`about.feature.${f.key}`, {}, { defaultValue: f.defaultValue })}
            </li>
          ))}
        </ul>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 4),
            'font-display',
          )}
        >
          {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
        </h2>
        <p data-mol-id="about-contact" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.contactBody',
            {},
            {
              defaultValue:
                'Questions, feedback, or a bug to report? Reach the team from your account settings — every message goes to a real human who learns languages too.',
            },
          )}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
