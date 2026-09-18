import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { LandingTopNavBar } from '../components/LandingTopNavBar.js'

const FEATURES: ReadonlyArray<{ key: string; default: string }> = [
  {
    key: 'about.featurePets',
    default:
      'Rich pet profiles — species, breed, weight, microchip, and photos for every dog, cat, bird, or rabbit in your home.',
  },
  {
    key: 'about.featureRecords',
    default:
      'Vet records and vitals in one timeline — vaccinations, lab work, surgeries, and follow-ups with attachments you can share.',
  },
  {
    key: 'about.featureMedications',
    default:
      'Medication tracking with dosage, frequency, and refill reminders so you never run out before the next dose.',
  },
  {
    key: 'about.featureSitters',
    default:
      'A marketplace of background-checked sitters and walkers with real reviews, availability, and easy booking.',
  },
  {
    key: 'about.featureAlerts',
    default:
      'Smart health alerts and notifications tuned to each pet — checkups, vaccinations, and medication schedules.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background font-body text-on-surface')}>
      <LandingTopNavBar />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), 'pt-32 pb-20')}
      >
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'tracking-tight',
          )}
        >
          {t('about.pageTitle', {}, { defaultValue: `About ${APP_NAME}` })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), cm.sp('mb', 8), 'text-on-surface-variant')}>
          {t('about.tagline', {}, { defaultValue: APP_TAGLINE })}
        </p>

        <div className={cm.cn(cm.stack(4))}>
          <p data-mol-id="about-intro" className={cm.cn('text-on-surface-variant leading-relaxed')}>
            {t(
              'about.intro',
              {},
              {
                defaultValue: `${APP_NAME} is a calm, organized home for everything that keeps your pets healthy and happy. Pet profiles, vet records, medications, and trusted sitter bookings all live in one warm place — built for the household that never wants to miss a wag, purr, or chirp.`,
              },
            )}
          </p>

          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p
            data-mol-id="about-mission"
            className={cm.cn('text-on-surface-variant leading-relaxed')}
          >
            {t(
              'about.missionBody',
              {},
              {
                defaultValue: `Caring for an animal shouldn't mean juggling paper records, sticky notes, and a dozen reminders. ${APP_NAME} brings every pet's health history, schedule, and care team together so you can spend less time tracking and more time with the pets you love.`,
              },
            )}
          </p>

          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul
            data-mol-id="about-features"
            className={cm.cn(cm.stack(2), 'list-disc pl-6 text-on-surface-variant')}
          >
            {FEATURES.map((f) => (
              <li key={f.key}>{t(f.key, {}, { defaultValue: f.default })}</li>
            ))}
          </ul>

          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
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
                defaultValue: `Have feedback, found a bug, or want to bring ${APP_NAME} to your clinic or sitter network? We'd love to hear from you — every message reaches a real person on the team.`,
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
