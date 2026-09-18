import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Feature {
  icon: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    icon: 'cloud_upload',
    titleKey: 'about.feature.upload.title',
    titleDefault: 'Instant digital delivery',
    bodyKey: 'about.feature.upload.body',
    bodyDefault:
      'Upload ZIPs, PDFs, Figma files, or audio and we host, version, and serve them. Buyers download the moment they pay — no manual fulfillment.',
  },
  {
    icon: 'vpn_key',
    titleKey: 'about.feature.licenses.title',
    titleDefault: 'License keys & activations',
    bodyKey: 'about.feature.licenses.body',
    bodyDefault:
      'Every sale generates a unique license key with activation limits, so you can protect your work and let customers manage their own devices.',
  },
  {
    icon: 'insights',
    titleKey: 'about.feature.analytics.title',
    titleDefault: 'Clear revenue analytics',
    bodyKey: 'about.feature.analytics.body',
    bodyDefault:
      'A real dashboard for sales, downloads, and top products — so you always know what is working and where your next payout is coming from.',
  },
  {
    icon: 'payments',
    titleKey: 'about.feature.payouts.title',
    titleDefault: 'Stripe-backed payouts',
    bodyKey: 'about.feature.payouts.body',
    bodyDefault:
      'Secure checkout and fast payouts through Stripe. We never hold your money — buyers download, you get paid.',
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
      containerSize="lg"
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.subtitle',
        {},
        {
          defaultValue:
            'A branded storefront that lets indie creators sell digital products — without the marketplace fees.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(10))}>
        <section data-mol-id="about-intro" className={cm.cn(cm.stack(3))}>
          <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'about.intro',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} is a Gumroad-style storefront for makers who sell digital goods — UI kits, icon sets, ebooks, templates, samples, and presets. We turn a file and a price into a polished, instantly fulfilled shop with license keys, secure download links, and revenue analytics built in.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(3))}>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'font-display text-on-surface',
            )}
          >
            {t('about.missionTitle', {}, { defaultValue: 'Why we built it' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant leading-relaxed')}>
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'Marketplaces take a big cut and bury your work next to everyone else’s. We believe independent creators should own their storefront, keep their margins, and get paid fast. Everything in this app — from instant delivery to license enforcement to the payout dashboard — exists to keep selling simple and the revenue yours.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(5))}>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'font-display text-on-surface',
            )}
          >
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2')}>
            {FEATURES.map((feature) => (
              <div
                key={feature.icon}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface border border-border-light shadow-sm',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.roundedFull,
                    cm.sp('mb', 4),
                    'bg-primary-light text-primary w-12 h-12',
                  )}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                    {feature.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 2),
                    'text-on-surface',
                  )}
                >
                  {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(feature.bodyKey, {}, { defaultValue: feature.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(3))}>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'font-display text-on-surface',
            )}
          >
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant leading-relaxed')}>
            {t(
              'about.contactBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Questions, feedback, or want to bring your catalog to {{appName}}? Reach out from your account settings — every message goes to a real person on our team.',
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
