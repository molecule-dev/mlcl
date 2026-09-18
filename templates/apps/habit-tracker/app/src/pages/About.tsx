import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { LandingNav } from '../components/LandingNav.js'

const FEATURES = [
  {
    key: 'streaks',
    defaultValue:
      'Daily streak counters that reward consistency and reset on a miss — loss aversion turned into momentum.',
  },
  {
    key: 'heatmap',
    defaultValue:
      'A GitHub-style consistency heatmap so you can watch a whole year fill in green, one day at a time.',
  },
  {
    key: 'achievements',
    defaultValue:
      'Milestone trophies at 7, 30, 90, 180, and 365 days — unlock new badges and never lose what you have earned.',
  },
  {
    key: 'freezes',
    defaultValue:
      'Streak freezes for the days life gets in the way, so one off day never erases weeks of progress.',
  },
  {
    key: 'reminders',
    defaultValue:
      'Smart reminders and streak-at-risk alerts that nudge you before the day slips away.',
  },
  {
    key: 'stats',
    defaultValue:
      'Statistics and reports that surface completion rates, best streaks, and where to focus next.',
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
                  '{{app}} is a habit tracker built around the one thing that actually changes behavior: an unbroken chain. Check in each day, watch your streak grow, and let the visceral pleasure of a long run keep you coming back.',
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
                  'We believe habits stick through small daily commitments and gentle, persistent feedback — not guilt or rigid perfection. Streaks reward showing up, freezes forgive the inevitable off day, and milestones make progress feel earned. The goal is consistency you can keep for years, not a sprint you abandon in a week.',
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
