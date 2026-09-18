import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Feature {
  id: string
  key: string
  defaultValue: string
}

const FEATURES: Feature[] = [
  {
    id: 'discover',
    key: 'about.feature.discover',
    defaultValue:
      'Discovery that feels curated — concerts, festivals, and conferences near you, with on-sale events front and center.',
  },
  {
    id: 'qr',
    key: 'about.feature.qr',
    defaultValue:
      'Instant QR tickets — tap, scan, and you’re in. Add to Apple/Google Wallet, transfer to friends, or print a PDF.',
  },
  {
    id: 'protection',
    key: 'about.feature.protection',
    defaultValue:
      'Buyer protection — every purchase is escrowed, and if an event is cancelled your refund happens automatically.',
  },
  {
    id: 'host',
    key: 'about.feature.host',
    defaultValue:
      'Host in minutes — set multi-tier pricing, accept Stripe payments, and run attendee check-in right from your phone.',
  },
  {
    id: 'analytics',
    key: 'about.feature.analytics',
    defaultValue:
      'Real-time analytics — track sales, payouts, and attendance from a single organizer dashboard.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} is the friendliest way to discover concerts, festivals, and conferences — and to host your own. Buy tickets in two taps, walk in with a single QR pass, and run check-in straight from your phone.',
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'We think live events should be effortless on both sides of the turnstile. Fans deserve a calm, honest way to find what’s on near them and get in without friction. Organizers deserve to sell their first ticket in 60 seconds — with fair fees, fast payouts, and the tools to run the door themselves.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6 text-on-surface-variant')}>
            {FEATURES.map((f) => (
              <li key={f.id} className={cm.cn(cm.prose)}>
                {t(f.key, {}, { defaultValue: f.defaultValue })}
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Questions, feedback, or want to host with us? Reach the team from your account settings — every message goes to a real person who works on {{app}}.',
              },
            )}
          </p>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
