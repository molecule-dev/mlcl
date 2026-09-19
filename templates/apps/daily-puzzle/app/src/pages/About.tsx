import { Link } from 'react-router'

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
    id: 'daily',
    titleKey: 'about.feature.daily.title',
    titleDefault: 'The daily word',
    bodyKey: 'about.feature.daily.body',
    bodyDefault:
      'One five-letter word per calendar day, the same for every player, chosen deterministically — no spoilers, no second chances, six tries.',
  },
  {
    id: 'feedback',
    titleKey: 'about.feature.feedback.title',
    titleDefault: 'Tile feedback you can read at a glance',
    bodyKey: 'about.feature.feedback.body',
    bodyDefault:
      'Green, amber, gray — every guess tells you exactly which letters are in the word and where, with fair handling of doubled letters.',
  },
  {
    id: 'stats',
    titleKey: 'about.feature.stats.title',
    titleDefault: 'Streaks & stats',
    bodyKey: 'about.feature.stats.body',
    bodyDefault:
      'Win rate, current and max streak, and a full guess distribution. The Archive lets you replay any past day as streak-safe practice.',
  },
  {
    id: 'share',
    titleKey: 'about.feature.share.title',
    titleDefault: 'Spoiler-free share cards',
    bodyKey: 'about.feature.share.body',
    bodyDefault:
      'Copy your emoji grid to the clipboard in one tap — the colors say everything without revealing the word.',
  },
  {
    id: 'leaderboards',
    titleKey: 'about.feature.leaderboards.title',
    titleDefault: 'A global daily leaderboard',
    bodyKey: 'about.feature.leaderboards.body',
    bodyDefault:
      'Because everyone plays the same word, the leaderboard shows how the whole field fared today — solve distribution included — plus the longest standing streaks.',
  },
]

export function About() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-on-surface font-body',
      )}
    >
      <Header />
      <main
        data-mol-id="page-about"
        data-testid="about-page"
        className={cm.cn(cm.flex1, cm.mxAuto, 'w-full max-w-3xl', cm.sp('px', 6), cm.sp('py', 12))}
      >
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 3),
            'font-label uppercase tracking-widest text-primary',
          )}
        >
          {t('about.eyebrow', {}, { defaultValue: 'About' })}
        </p>
        <h1
          className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mb-3 font-display')}
        >
          {t('about.title', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
        </h1>
        <p
          data-mol-id="about-intro"
          className={cm.cn(cm.sp('mb', 8), 'text-sm text-on-surface-variant')}
        >
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} is a daily word puzzle. Guess the five-letter word in six tries, keep your streak alive, share your emoji grid, and see how the whole field fared on today’s word.',
            },
          )}
        </p>

        <div className={cm.cn(cm.stack(8))}>
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
                    'A good puzzle is a small daily win. {{app}} is built around one shared word a day — quick enough for a coffee break, sharp enough to come back for tomorrow.',
                },
              )}
            </p>
          </section>

          <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
              {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
            </h2>
            <ul className={cm.cn(cm.stack(4))}>
              {FEATURES.map((f) => (
                <li key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.cn(cm.stack(1))}>
                  <p className={cm.cn(cm.fontWeight('bold'))}>
                    {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                  </p>
                  <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                    {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
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
                { app: APP_NAME },
                {
                  defaultValue:
                    'Have feedback, found a bug, or want to bring {{app}} to your school or team? We read every message — reach out from your account settings and a real human will reply.',
                },
              )}
            </p>
          </section>
        </div>

        <p className={cm.cn(cm.sp('mt', 8), 'text-xs')}>
          <Link to="/" className={cm.cn('text-primary font-bold')}>
            {t('auth.backToHomeArrow', {}, { defaultValue: '← Back to home' })}
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  )
}

export default About
export { About as AboutPage }
