import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { LandingTopNavBar } from '../components/LandingTopNavBar.js'

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface-container-low text-on-surface')}>
      <LandingTopNavBar />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 12))}
      >
        <h1
          className={cm.cn(
            'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
            cm.sp('mb', 6),
          )}
        >
          {t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
        </h1>
        <div className={cm.cn(cm.stack(4))}>
          <p
            data-mol-id="about-intro"
            className={cm.cn('text-lg text-on-surface-variant leading-relaxed')}
          >
            {t(
              'about.intro',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} is a curated subscription-box service that delivers a hand-picked, small-batch box of joy to your door every month. Every edition is assembled by working makers — independent artists, chefs, and small brands — not an algorithm.',
              },
            )}
          </p>

          <h2
            className={cm.cn(
              'text-xl font-extrabold tracking-tight text-on-surface',
              cm.sp('mt', 8),
            )}
          >
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
                  'We believe a subscription should feel like a gift, not a trap. {{app}} is built so you stay because you love what arrives — pause anytime, swap what you want, and cancel in a click. No retention scripts, ever.',
              },
            )}
          </p>

          <h2
            className={cm.cn(
              'text-xl font-extrabold tracking-tight text-on-surface',
              cm.sp('mt', 8),
            )}
          >
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul
            data-mol-id="about-features"
            className={cm.cn(cm.stack(2), 'list-disc pl-6 text-on-surface-variant leading-relaxed')}
          >
            <li>
              {t(
                'about.feature1',
                {},
                {
                  defaultValue:
                    'Curated monthly editions hand-picked by independent makers, with the story behind every item.',
                },
              )}
            </li>
            <li>
              {t(
                'about.feature2',
                {},
                {
                  defaultValue:
                    'Full control over every box — customize the contents, swap or exclude items, skip a month, or change your cadence.',
                },
              )}
            </li>
            <li>
              {t(
                'about.feature3',
                {},
                {
                  defaultValue:
                    'End-to-end shipment tracking from pickup to porch, with plastic-free packaging and live carrier updates.',
                },
              )}
            </li>
            <li>
              {t(
                'about.feature4',
                {},
                {
                  defaultValue:
                    'Flexible plans and transparent billing — upgrade, downgrade, pause, or cancel from your dashboard at any time.',
                },
              )}
            </li>
          </ul>

          <h2
            className={cm.cn(
              'text-xl font-extrabold tracking-tight text-on-surface',
              cm.sp('mt', 8),
            )}
          >
            {t('about.contactTitle', {}, { defaultValue: 'Talk to a curator' })}
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
                  'Questions about an edition, a shipment, or your subscription? Reach a real human on the team at hello@crate.example — we read every message.',
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
