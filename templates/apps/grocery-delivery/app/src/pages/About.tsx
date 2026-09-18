import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

const FEATURES = [
  {
    key: 'aisles',
    icon: 'storefront',
    defaultTitle: 'Every aisle, online',
    defaultBody:
      'Browse thousands of fresh items across produce, dairy, bakery, meat, pantry, frozen, beverages, and household — sorted by category and department.',
  },
  {
    key: 'slots',
    icon: 'event',
    defaultTitle: 'Delivery slots that fit your day',
    defaultBody:
      'Pick a same-day or scheduled window with live capacity, set up recurring weekly deliveries, and smart-reorder the staples you always run out of.',
  },
  {
    key: 'substitutions',
    icon: 'swap_horiz',
    defaultTitle: 'Substitutions on your terms',
    defaultBody:
      'Set per-item substitution preferences so your shopper knows exactly what to do when something is out of stock — no surprises at the door.',
  },
  {
    key: 'tracking',
    icon: 'local_shipping',
    defaultTitle: 'Real-time order tracking',
    defaultBody:
      'Follow your order from picking to packed to out-for-delivery, with live driver location and arrival updates until the bushel reaches your door.',
  },
] as const

/**
 * Public About page for the app — app-specific story, mission, and
 * feature highlights, wrapped in the app's public chrome.
 *
 * @returns The rendered About page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <ContentPageShell
      dataMolId="page-about"
      containerSize="lg"
      header={<AuthBrandHeader />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About us' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t('about.tagline', {}, { defaultValue: APP_TAGLINE })}
    >
      <div className={cm.cn(cm.stack(4))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} is a grocery delivery service that brings the whole store to your door. Shop fresh produce, pantry staples, and household essentials from local stores, choose a delivery window that works for you, and let a dedicated shopper hand-pick and deliver your order in hours.',
            },
          )}
        </p>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 8),
            'font-display',
          )}
        >
          {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
        </h2>
        <p data-mol-id="about-mission" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.missionBody',
            {},
            {
              defaultValue:
                'We believe getting groceries should give you time back, not take it away. From smart reorder of the staples you buy every week to live driver tracking, every part of the experience is built to make weekly shopping effortless, transparent, and genuinely fresh.',
            },
          )}
        </p>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 8),
            'font-display',
          )}
        >
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <ul data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          {FEATURES.map((feature) => (
            <li
              key={feature.key}
              data-mol-id={`about-feature-${feature.key}`}
              className={cm.cn(cm.flex({ align: 'start', gap: 'md' }))}
            >
              <span
                className={
                  'inline-flex shrink-0 items-center justify-center w-11 h-11 rounded-xl text-primary-dark'
                }
                style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}
                aria-hidden="true"
              >
                <span className={'material-symbols-outlined text-2xl'}>{feature.icon}</span>
              </span>
              <div className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                  {t(
                    `about.feature.${feature.key}.title`,
                    {},
                    { defaultValue: feature.defaultTitle },
                  )}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    `about.feature.${feature.key}.body`,
                    {},
                    { defaultValue: feature.defaultBody },
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 8),
            'font-display',
          )}
        >
          {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
        </h2>
        <p data-mol-id="about-contact" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.contactBody',
            { app: APP_NAME },
            {
              defaultValue:
                'Questions about an order, a delivery slot, or a substitution? Reach the {{app}} team from your account settings — a real person will help you sort it out.',
            },
          )}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
