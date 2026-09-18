import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingNav } from '../components/LandingNav.js'

const FEATURES = [
  {
    key: 'stages',
    defaultValue:
      'Stage-level tracking — deep, light and REM stacked into a hypnogram for every night, synced from your wearable.',
  },
  {
    key: 'recovery',
    defaultValue:
      'A single 0–100 recovery score each morning, rolled up from heart rate, HRV, and the balance of your sleep stages.',
  },
  {
    key: 'alarm',
    defaultValue:
      'A smart alarm that wakes you during light sleep inside your chosen window, with custom sounds and gentle haptics.',
  },
  {
    key: 'coaching',
    defaultValue:
      'Coaching programs and sleep-hygiene tips that adapt to your chronotype and the patterns we spot in your data.',
  },
  {
    key: 'trends',
    defaultValue:
      'Long-term trends, nightly history, and CSV export so you can see how your sleep is really changing over time.',
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
        className={cm.cn(cm.mxAuto, cm.maxW('3xl'), cm.sp('px', 6), cm.sp('py', 16))}
      >
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('extrabold'),
            cm.sp('mb', 6),
            'tracking-tight',
          )}
        >
          {t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
        </h1>
        <div className={cm.cn(cm.stack(6))}>
          <p
            data-mol-id="about-intro"
            className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}
          >
            {t(
              'about.intro',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} is a restorative sleep tracker that turns every night into clear, actionable insight. It pairs with your wearable to chart each stage of your sleep, score your recovery, and wake you at the right moment in your cycle — so you can build nights that actually leave you rested.',
              },
            )}
          </p>

          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 8),
              'tracking-tight',
            )}
          >
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p data-mol-id="about-mission" className={cm.cn('text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Most sleep apps stop at a number on a dashboard. We believe better sleep comes from understanding the why behind the score, then changing one small thing at a time. {{app}} is built to be calm, never noisy — it surfaces what matters from your data and stays out of your way the rest of the night.',
              },
            )}
          </p>

          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 8),
              'tracking-tight',
            )}
          >
            {t('about.whatYouGetTitle', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul
            data-mol-id="about-features"
            className={cm.cn(cm.stack(3), 'list-disc pl-6 text-on-surface-variant')}
          >
            {FEATURES.map((f) => (
              <li key={f.key}>
                {t(`about.feature.${f.key}`, {}, { defaultValue: f.defaultValue })}
              </li>
            ))}
          </ul>

          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 8),
              'tracking-tight',
            )}
          >
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p data-mol-id="about-contact" className={cm.cn('text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Have feedback, a feature request, or found a bug? We read every message — reach out any time and a real human on the team will get back to you.',
              },
            )}
          </p>
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}

export default About
export { About as AboutPage }
