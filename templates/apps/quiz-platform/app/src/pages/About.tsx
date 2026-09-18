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
    id: 'live',
    titleKey: 'about.feature.live.title',
    titleDefault: 'Live multiplayer games',
    bodyKey: 'about.feature.live.body',
    bodyDefault:
      'Host a lobby, share a join code, and run timed questions while every player races the clock — scores update in real time as the leaderboard climbs.',
  },
  {
    id: 'builder',
    titleKey: 'about.feature.builder.title',
    titleDefault: 'A fast quiz builder',
    bodyKey: 'about.feature.builder.body',
    bodyDefault:
      'Author multiple-choice question banks with answer keys, point values, per-question timers, cover images, and explanations — then publish to your audience.',
  },
  {
    id: 'discover',
    titleKey: 'about.feature.discover.title',
    titleDefault: 'Discover & search',
    bodyKey: 'about.feature.discover.body',
    bodyDefault:
      'Browse quizzes by category and tag, and find the right pack in seconds with full-text search across every published quiz.',
  },
  {
    id: 'leaderboards',
    titleKey: 'about.feature.leaderboards.title',
    titleDefault: 'Scoring & leaderboards',
    bodyKey: 'about.feature.leaderboards.body',
    bodyDefault:
      'Speed-weighted scoring rewards quick, correct answers, and global plus per-session leaderboards keep the competition lively long after the buzzer.',
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
                '{{app}} is a live quiz platform for classrooms, game nights, and team events. Build playful question packs, host real-time games with a join code, and watch the room light up with timed questions, scoring, and leaderboards.',
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
                    'Learning sticks when it feels like play. We make it effortless for anyone to turn a topic into a fast, competitive game — so hosts can teach by doing and players stay on a streak.',
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
