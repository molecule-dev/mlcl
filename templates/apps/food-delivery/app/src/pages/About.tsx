import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

interface Feature {
  key: string
  defaultValue: string
}

const FEATURES: Feature[] = [
  {
    key: 'about.featureDiscover',
    defaultValue:
      'Discover hundreds of local restaurants by cuisine, rating, and delivery time — every menu with photos, prices, and dietary tags up front.',
  },
  {
    key: 'about.featureOrder',
    defaultValue:
      'Build your cart with item modifiers and special instructions, then check out securely with saved addresses and payment methods.',
  },
  {
    key: 'about.featureTrack',
    defaultValue:
      'Watch your order from kitchen to doorstep with live driver tracking and a real-time ETA on the map.',
  },
  {
    key: 'about.featureReorder',
    defaultValue:
      'Save your favorites, browse your full order history, and reorder the meals you love in a single tap.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      containerSize="lg"
      header={<AuthBrandHeader />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { name: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { name: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a food-delivery platform that connects you with the local restaurants you love. Browse menus, order in a few taps, and follow every bite from the kitchen to your door — hot, fresh, and fast.`,
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { name: APP_NAME },
              {
                defaultValue: `We believe great food should be a few taps away and that the restaurants and drivers who make it possible deserve a fair, transparent platform. ${APP_NAME} pairs a delightful ordering experience with real-time tracking so you always know exactly when your meal will arrive.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.whatYouGetTitle', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6 text-on-surface-variant')}>
            {FEATURES.map((f) => (
              <li key={f.key}>{t(f.key, {}, { defaultValue: f.defaultValue })}</li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Questions, feedback, or want to list your restaurant? Reach out from your account settings — every message goes to a real person on the team.',
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
