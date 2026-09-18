import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface Feature {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'deals',
    titleKey: 'about.featureDealsTitle',
    titleDefault: 'Local & online deals, every morning',
    bodyKey: 'about.featureDeals',
    bodyDefault:
      'Hand-picked merchant offers in your city plus exclusive online promo codes — restaurants, beauty, fitness and more, refreshed every morning.',
  },
  {
    id: 'redeem',
    titleKey: 'about.featureRedeemTitle',
    titleDefault: 'Scan-and-go redemption',
    bodyKey: 'about.featureRedeem',
    bodyDefault:
      'Every coupon carries a single-use redemption code and QR. Show it at the counter and the merchant marks it redeemed in real time — no paper, no awkward "is this still valid?".',
  },
  {
    id: 'savings',
    titleKey: 'about.featureSavingsTitle',
    titleDefault: 'Never miss an expiry',
    bodyKey: 'about.featureSavings',
    bodyDefault:
      'Saved coupons and hot deals ping you before they vanish, and your dashboard tracks lifetime savings and your top-saving merchants.',
  },
  {
    id: 'nearby',
    titleKey: 'about.featureNearbyTitle',
    titleDefault: 'Deals near you, and room to grow',
    bodyKey: 'about.featureNearby',
    bodyDefault:
      'Location-aware search surfaces the best nearby offers, and Pro and Team plans unlock higher limits, data export, and advanced features.',
  },
]

export function About() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={
        <p className={cm.cn(cm.container({ size: 'md' }), cm.sp('px', 6), cm.sp('pt', 6))}>
          <Link to="/" data-mol-id="about-back" className={cm.cn('text-primary hover:underline')}>
            {t('about.back', { app: APP_NAME }, { defaultValue: '← Back to {{app}}' })}
          </Link>
        </p>
      }
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.title', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
      subtitle={t(
        'about.intro',
        { app: APP_NAME },
        {
          defaultValue:
            '{{app}} is a deals platform that connects you with local and online merchant offers — grab a coupon, redeem it with a tap, and watch your savings add up.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'We started {{app}} to make saving money effortless and trustworthy. Verified merchants commit to honouring every coupon, redemptions happen in seconds, and you always know exactly how much you have saved.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.whatYouGetTitle', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.stack(4))}>
            {FEATURES.map((f) => (
              <div key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Questions, feedback, or want to list your business on {{app}}? Email support@snagr.app — a real person on the team reads every message.',
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
