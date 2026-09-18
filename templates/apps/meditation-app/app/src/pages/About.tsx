import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingNav } from '../components/LandingNav.js'

interface AboutFeature {
  icon: string
  titleKey: string
  defaultTitle: string
  bodyKey: string
  defaultBody: string
}

const FEATURES: AboutFeature[] = [
  {
    icon: 'self_improvement',
    titleKey: 'about.feature.guided.title',
    defaultTitle: 'Guided meditations',
    bodyKey: 'about.feature.guided.body',
    defaultBody:
      'Hundreds of teacher-led sessions across mindfulness, focus, stress relief, and sleep — sorted by mood and length so the right practice is one tap away.',
  },
  {
    icon: 'air',
    titleKey: 'about.feature.breath.title',
    defaultTitle: 'Breathwork',
    bodyKey: 'about.feature.breath.body',
    defaultBody:
      'Box-breath, 4-7-8, and coherent breathing exercises with a visual pacer to settle your nervous system in minutes.',
  },
  {
    icon: 'bedtime',
    titleKey: 'about.feature.sleep.title',
    defaultTitle: 'Sleep stories',
    bodyKey: 'about.feature.sleep.body',
    defaultBody:
      'Slow narratives over ambient soundscapes that quiet a busy mind and ease you into deep, restful sleep.',
  },
  {
    icon: 'auto_stories',
    titleKey: 'about.feature.courses.title',
    defaultTitle: 'Courses & journal',
    bodyKey: 'about.feature.courses.body',
    defaultBody:
      'Multi-day courses build a lasting habit, while a private reflection journal captures how each session leaves you feeling.',
  },
  {
    icon: 'local_fire_department',
    titleKey: 'about.feature.streaks.title',
    defaultTitle: 'Streaks & insights',
    bodyKey: 'about.feature.streaks.body',
    defaultBody:
      'Gentle streaks, weekly goals, and clear stats show the minutes you have meditated — progress you can feel, never pressure.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col' }),
        'bg-surface text-on-surface',
      )}
    >
      <LandingNav />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.flex1, 'max-w-3xl w-full mx-auto', cm.sp('px', 6), cm.sp('py', 12))}
      >
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.sp('mb', 3),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('about.eyebrow', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 6),
            'tracking-tight text-on-surface',
          )}
        >
          {t('about.pageTitle', {}, { defaultValue: 'A calmer 10 minutes a day' })}
        </h1>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
          <p
            data-mol-id="about-intro"
            className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant leading-relaxed')}
          >
            {t(
              'about.intro',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} is a meditation app for real life — daily guided meditations, breathwork, and sleep stories paced by teachers who feel like a friend, not a coach. No streak guilt, no noisy feed: just a quiet place to come back to your breath.',
              },
            )}
          </p>

          <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
            </h2>
            <p
              data-mol-id="about-mission"
              className={cm.cn('text-on-surface-variant leading-relaxed')}
            >
              {t(
                'about.missionBody',
                { app: APP_NAME },
                {
                  defaultValue:
                    'We believe stillness should be accessible to everyone, in any moment of the day. {{app}} exists to make a calm, consistent practice feel effortless — so that ten honest minutes can change how you meet the next ten hours.',
                },
              )}
            </p>
          </section>

          <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
            </h2>
            <ul
              data-mol-id="about-features"
              className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
            >
              {FEATURES.map((f) => (
                <li
                  key={f.icon}
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 'md' }),
                    cm.sp('p', 5),
                    'bg-surface-container-lowest rounded-2xl border border-outline/30',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'shrink-0 w-11 h-11 bg-primary-container rounded-xl text-primary material-symbols-outlined',
                    )}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {f.icon}
                  </span>
                  <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                    <h3
                      className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}
                    >
                      {t(f.titleKey, {}, { defaultValue: f.defaultTitle })}
                    </h3>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-on-surface-variant leading-relaxed',
                      )}
                    >
                      {t(f.bodyKey, {}, { defaultValue: f.defaultBody })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
            </h2>
            <p
              data-mol-id="about-contact"
              className={cm.cn('text-on-surface-variant leading-relaxed')}
            >
              {t(
                'about.contactBody',
                {},
                {
                  defaultValue:
                    'Have feedback, a session you would love to see, or found something that broke your calm? Reach the team from Settings — every message goes to a real person who meditates here too.',
                },
              )}
            </p>
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}

export default About
export { About as AboutPage }
