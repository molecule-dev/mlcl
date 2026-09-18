import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { LandingTopNavBar } from '../components/LandingTopNavBar.js'

const FEATURES = [
  {
    key: 'spaced',
    icon: 'schedule',
    titleDefault: 'Spaced repetition that respects your time',
    bodyDefault:
      'A proven SM-2 scheduling algorithm decides exactly when each card should resurface — cards you struggle with come back tomorrow, cards you have mastered wait weeks. Five focused minutes a day beat hours of cramming.',
  },
  {
    key: 'decks',
    icon: 'style',
    titleDefault: 'Decks, streaks, and real statistics',
    bodyDefault:
      'Organize cards into decks by subject, keep a daily review streak alive, and watch retention rate, reviews, and due counts trend over time — so you always know what to study next.',
  },
  {
    key: 'authoring',
    icon: 'edit_note',
    titleDefault: 'Markdown and cloze authoring',
    bodyDefault:
      'Write cards in plain markdown and hide any phrase with {{cloze::word}} so the back fills itself in. Add images to make abstract concepts concrete.',
  },
  {
    key: 'open',
    icon: 'unfold_more',
    titleDefault: 'Your knowledge, your data',
    bodyDefault:
      'Import existing decks from Anki .apkg or CSV and export anytime. Nothing is locked in — what you learn belongs to you.',
  },
] as const

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
      <LandingTopNavBar />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.maxW('3xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 16))}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
          {t('about.eyebrow', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
        </p>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.sp('mt', 3),
            'text-4xl md:text-5xl tracking-tight font-extrabold',
          )}
        >
          {t('about.pageTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' })}
        </h1>

        <div
          className={cm.cn(
            cm.sp('mt', 8),
            cm.stack(6),
            'text-lg text-on-surface-variant leading-relaxed',
          )}
        >
          <p data-mol-id="about-intro">
            {t(
              'about.intro',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} is a spaced-repetition flashcard app for people who want knowledge to actually stick. Whether you are learning a language, memorizing formulas, or drilling concepts for an exam, it schedules each card at the exact moment you are about to forget it — the most efficient way the science of memory has found to move facts into long-term recall.',
              },
            )}
          </p>
        </div>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 12),
            'tracking-tight',
          )}
        >
          {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
        </h2>
        <p
          data-mol-id="about-mission"
          className={cm.cn(cm.sp('mt', 3), 'text-on-surface-variant leading-relaxed')}
        >
          {t(
            'about.missionBody',
            { app: APP_NAME },
            {
              defaultValue:
                'Most study tools optimize for time spent, not knowledge retained. {{app}} optimizes for the opposite: the fewest reviews that keep what matters in your head. We believe learning should be calm, measurable, and yours — open data, no dark patterns, and a habit you can sustain for years.',
            },
          )}
        </p>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 12),
            'tracking-tight',
          )}
        >
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <div
          data-mol-id="about-features"
          className={cm.cn(cm.sp('mt', 6), 'grid md:grid-cols-2 gap-6')}
        >
          {FEATURES.map((f) => (
            <div
              key={f.key}
              className={cm.cn(
                cm.sp('p', 6),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/20',
              )}
            >
              <span
                className={cm.cn(
                  'flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-container/60 text-primary',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
                  {f.icon}
                </span>
              </span>
              <h3
                className={cm.cn(cm.fontWeight('bold'), cm.sp('mt', 5), 'text-lg tracking-tight')}
              >
                {t(`about.feature.${f.key}.title`, {}, { defaultValue: f.titleDefault })}
              </h3>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 2),
                  'text-on-surface-variant leading-relaxed',
                )}
              >
                {t(`about.feature.${f.key}.body`, {}, { defaultValue: f.bodyDefault })}
              </p>
            </div>
          ))}
        </div>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 12),
            'tracking-tight',
          )}
        >
          {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
        </h2>
        <p
          data-mol-id="about-contact"
          className={cm.cn(cm.sp('mt', 3), 'text-on-surface-variant leading-relaxed')}
        >
          {t(
            'about.contactBody',
            { app: APP_NAME },
            {
              defaultValue:
                'Have feedback, found a bug, or want to suggest a feature? Every message reaches a real person on the {{app}} team — we would love to hear what you are learning.',
            },
          )}
        </p>
      </main>
      <Footer />
    </div>
  )
}

export default About
export { About as AboutPage }
