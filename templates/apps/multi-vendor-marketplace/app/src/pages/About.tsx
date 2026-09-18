import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      data-mol-id="page-about"
      className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 12))}
    >
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
        {t('about.pageTitle', { name: APP_NAME }, { defaultValue: 'About {{name}}' })}
      </h1>
      <div className={cm.cn('prose', cm.stack(4))}>
        <p data-mol-id="about-intro">
          {t(
            'about.intro',
            { name: APP_NAME },
            {
              defaultValue:
                '{{name}} is a curated marketplace where independent makers open their own shops and shoppers discover goods they cannot find anywhere else. From hand-thrown ceramics to block-printed textiles, every listing comes from a real vendor with a story behind it.',
            },
          )}
        </p>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
          {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
        </h2>
        <p data-mol-id="about-mission">
          {t(
            'about.missionBody',
            { name: APP_NAME },
            {
              defaultValue:
                'We believe makers should keep what makes their craft theirs. {{name}} charges a flat, transparent commission, pays out reliably every week, and hands each vendor a storefront they fully control — so they can stay focused on the work while we run the marketplace.',
            },
          )}
        </p>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
          <li>
            {t(
              'about.featureShop',
              {},
              {
                defaultValue:
                  'A searchable catalog spanning thousands of independent vendors, with verified shops, ratings, and reviews so you can buy with confidence.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureVendor',
              {},
              {
                defaultValue:
                  'A complete vendor toolkit: branded storefront, product and inventory management, image uploads, and order fulfilment in one dashboard.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featurePayments',
              {},
              {
                defaultValue:
                  'Secure Stripe-powered checkout, automatic commission splits, and scheduled payouts — vendors always know exactly what they have earned.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureNotifications',
              {},
              {
                defaultValue:
                  'Real-time notifications for new orders, shipping updates, and reviews, plus role-based permissions that keep shopper and vendor tools separate.',
              },
            )}
          </li>
        </ul>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
          {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
        </h2>
        <p data-mol-id="about-contact">
          {t(
            'about.contactBody',
            {},
            {
              defaultValue:
                'Want to open a shop, report an issue, or just say hello? Reach us from the Help center — every message goes to a real person on the team.',
            },
          )}
        </p>
      </div>
    </div>
  )
}

export default About
export { About as AboutPage }
