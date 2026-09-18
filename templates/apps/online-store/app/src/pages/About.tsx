import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { StorefrontTopNavBar } from '../components/StorefrontTopNavBar.js'

export function About() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<StorefrontTopNavBar />}
      footer={<Footer />}
      eyebrow={t('nav.about', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t(
        'about.intro',
        { appName: APP_NAME },
        {
          defaultValue:
            '{{appName}} is a modern online store focused on thoughtfully curated products, transparent policies, and a reliable checkout experience.',
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
              {},
              {
                defaultValue:
                  'We help customers discover high-quality goods faster by combining editorial curation, clear product information, and dependable fulfillment.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6', 'text-on-surface-variant')}>
            <li>
              {t(
                'about.featureCatalog',
                {},
                {
                  defaultValue:
                    'A fast, image-rich product catalog with categories, search, and trending and new-arrival collections.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureCheckout',
                {},
                {
                  defaultValue:
                    'A secure cart and Stripe-backed checkout, with saved wishlists for the items you want to come back to.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureOrders',
                {},
                {
                  defaultValue:
                    'Order history and status tracking so you always know where every purchase stands.',
                },
              )}
            </li>
            <li>
              {t(
                'about.featureAdmin',
                {},
                {
                  defaultValue:
                    'For sellers: product, inventory, and order management with tiered plans that scale as the store grows.',
                },
              )}
            </li>
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Have a question about an order, a product, or selling on {{appName}}? Reach us from the Help page — every message goes to a real person on the team.',
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
