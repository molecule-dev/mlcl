import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { LandingNav } from '../components/LandingNav.js'

const FEATURES = [
  {
    key: 'shelves',
    defaultValue:
      'Four honest shelves — reading, want to read, read, and did-not-finish — so every book you touch has a place.',
  },
  {
    key: 'progress',
    defaultValue:
      'Log the page you stopped on and watch the progress bar close; the last page finishes the book for you.',
  },
  {
    key: 'challenge',
    defaultValue:
      'A yearly reading challenge with a pace indicator that tells you, week by week, whether the goal still closes.',
  },
  {
    key: 'reviews',
    defaultValue:
      'Star ratings and short reviews captured while the book is fresh, kept in one feed worth rereading.',
  },
  {
    key: 'stats',
    defaultValue:
      'Books per month, pages logged, genre breakdown, and rating distribution — a year in one glance.',
  },
  {
    key: 'sessions',
    defaultValue:
      'Reading sessions remember how long you read and how far you got, building a log you can look back on.',
  },
] as const

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <LandingNav />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 12))}
      >
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
          {t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
        </h1>
        <div className={cm.cn('prose', cm.stack(4))}>
          <p data-mol-id="about-intro">
            {t(
              'about.intro',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} is a reading tracker built around the moment a book actually gets finished: knowing where you stopped. Shelve what you are reading, log the page, rate it at the end — and let the yearly challenge ring keep score.',
              },
            )}
          </p>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p data-mol-id="about-mission">
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'We believe reading sticks through gentle momentum, not quotas. A page count that moves, a challenge that forgives a slow month, and a shelf that never judges a did-not-finish. The goal is more finished books a year from now — not a sprint of guilt you abandon by February.',
              },
            )}
          </p>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
            {FEATURES.map((f) => (
              <li key={f.key}>
                {t(`about.feature.${f.key}`, {}, { defaultValue: f.defaultValue })}
              </li>
            ))}
          </ul>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p data-mol-id="about-contact">
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Have feedback, hit a bug, or want a feature? We read every message — reach out from your account settings and a real person on the {{app}} team will get back to you.',
              },
            )}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default About
export { About as AboutPage }
