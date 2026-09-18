/**
 * Storefront footer. The brand block + Shop/Support route columns are plain
 * `<Link>`s; the Legal column's Privacy/Terms open IN-PLACE modals
 * (`useLegalModals`, bonded legal HTML pre-loaded via `loadContent`) instead
 * of navigating, while Contact Us stays a route. The standalone `/privacy`
 * and `/terms` routes still exist for direct/deep links.
 *
 * Rendered inline rather than via the shared `@molecule/app-storefront-chrome-react`
 * `StorefrontFooter` because that component renders every column link as a
 * navigating `<Link>` with no onClick/modal hook — and editing the shared
 * package is out of scope here. The markup/classes mirror it exactly so the
 * footer stays visually identical.
 */
import { Link } from 'react-router'

import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

function StoreFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })

  const linkClass = cm.cn(
    cm.textSize('sm'),
    'text-slate-400 hover:text-green-400 transition-colors',
  )
  const headingClass = cm.cn(cm.fontWeight('bold'), cm.sp('mb', 4), cm.textSize('sm'), 'text-white')

  const shopLinks = [
    { to: '/search?q=all', label: t('storeFooter.categories', {}, { defaultValue: 'Categories' }) },
    {
      to: '/search?q=new',
      label: t('storeFooter.newArrivals', {}, { defaultValue: 'New Arrivals' }),
    },
    { to: '/search?q=sale', label: t('storeFooter.deals', {}, { defaultValue: 'Deals' }) },
  ]
  const supportLinks = [
    { to: '/help', label: t('storeFooter.customerCare', {}, { defaultValue: 'Customer Care' }) },
    {
      to: '/help',
      label: t('storeFooter.shippingPolicy', {}, { defaultValue: 'Shipping Policy' }),
    },
    { to: '/help', label: t('storeFooter.returns', {}, { defaultValue: 'Returns' }) },
    { to: '/pricing', label: t('storeFooter.pricing', {}, { defaultValue: 'Seller Plans' }) },
  ]

  return (
    <footer
      className={cm.cn(
        cm.w('full'),
        cm.sp('pt', 16),
        cm.sp('pb', 8),
        'bg-slate-900 dark:bg-black border-t border-slate-800 mt-20',
      )}
    >
      <div
        className={cm.cn(
          cm.maxW('[1280px]'),
          cm.mxAuto,
          cm.sp('px', 6),
          cm.grid({ cols: 1, gap: 'xl' }),
          'md:grid-cols-4',
        )}
      >
        <div className={cm.cn('col-span-1 md:col-span-1')}>
          <div className={cm.cn(cm.textSize('xl'), cm.sp('mb', 4), 'font-black text-white')}>
            {t('storeFooter.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </div>
          <p className={cm.cn(cm.textSize('sm'), 'text-slate-400 font-sans leading-relaxed')}>
            {t(
              'storeFooter.tagline',
              {},
              {
                defaultValue:
                  'Curating the finest digital experiences and premium products for the modern lifestyle.',
              },
            )}
          </p>
        </div>
        <div>
          <h4 className={headingClass}>
            {t('storeFooter.shopHeading', {}, { defaultValue: 'Shop' })}
          </h4>
          <ul className={cm.stack(2)}>
            {shopLinks.map((link, i) => (
              <li key={i}>
                <Link className={linkClass} to={link.to}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className={headingClass}>
            {t('storeFooter.supportHeading', {}, { defaultValue: 'Support' })}
          </h4>
          <ul className={cm.stack(2)}>
            {supportLinks.map((link, i) => (
              <li key={i}>
                <Link className={linkClass} to={link.to}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className={headingClass}>
            {t('storeFooter.legalHeading', {}, { defaultValue: 'Legal' })}
          </h4>
          <ul className={cm.stack(2)}>
            <li>
              <button type="button" className={linkClass} onClick={openPrivacy}>
                {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
              </button>
            </li>
            <li>
              <button type="button" className={linkClass} onClick={openTerms}>
                {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
              </button>
            </li>
            <li>
              <Link className={linkClass} to="/about">
                {t('storeFooter.contactUs', {}, { defaultValue: 'Contact Us' })}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.maxW('[1280px]'),
          cm.mxAuto,
          cm.sp('px', 6),
          cm.sp('pt', 12),
          cm.sp('mt', 12),
          'border-t border-slate-800',
        )}
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-slate-400')}>
          {t(
            'storeFooter.copyright',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}}. Curating the finest digital experiences.' },
          )}
        </p>
      </div>
      {modals}
    </footer>
  )
}

export default StoreFooter
export { StoreFooter }
