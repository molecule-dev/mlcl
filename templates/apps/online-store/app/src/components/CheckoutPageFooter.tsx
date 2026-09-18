import { Link } from 'react-router'

import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
function CheckoutPageFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })
  return (
    <footer className={cm.cn(cm.w('full'), 'bg-foreground mt-auto border-t border-slate-800')}>
      <div
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 12),
          cm.mxAuto,
          cm.grid({ gap: 'xl' }),
          cm.maxW('[1280px]'),
          'grid grid-cols-1 md:grid-cols-4',
        )}
      >
        <div className={cm.cn('md:col-span-1')}>
          <span
            className={cm.cn(cm.textSize('xl'), cm.sp('mb', 4), 'font-black text-white block')}
            data-mol-id="footer-logo"
          >
            {t('footer.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </span>
          <p className={cm.cn(cm.textSize('sm'), 'text-foreground-tertiary leading-relaxed')}>
            {t(
              'footer.copyright',
              { year: new Date().getFullYear(), appName: APP_NAME },
              { defaultValue: '© {{year}} {{appName}}. Curating the finest digital experiences.' },
            )}
          </p>
        </div>
        <div>
          <h4 className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 4), 'text-white')}>
            {t('footer.shopHeading', {}, { defaultValue: 'Shop' })}
          </h4>
          <ul className={cm.stack(2)}>
            <li>
              <Link
                className={cm.cn(
                  'text-foreground-tertiary hover:text-green-400 transition-colors text-sm',
                )}
                data-mol-id="footer-link-1"
                to="/about"
              >
                {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
              </Link>
            </li>
            <li>
              <Link
                className={cm.cn(
                  'text-foreground-tertiary hover:text-green-400 transition-colors text-sm',
                )}
                data-mol-id="footer-link-2"
                to="/about"
              >
                {t('nav.contact', {}, { defaultValue: 'Contact' })}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 4), 'text-white')}>
            {t('footer.policyHeading', {}, { defaultValue: 'Policy' })}
          </h4>
          <ul className={cm.stack(2)}>
            <li>
              <Link
                className={cm.cn(
                  'text-foreground-tertiary hover:text-green-400 transition-colors text-sm',
                )}
                data-mol-id="footer-link-3"
                to="/help"
              >
                {t('footer.shippingPolicy', {}, { defaultValue: 'Shipping Policy' })}
              </Link>
            </li>
            <li>
              <Link
                className={cm.cn(
                  'text-foreground-tertiary hover:text-green-400 transition-colors text-sm',
                )}
                data-mol-id="footer-link-4"
                to="/help"
              >
                {t('footer.returns', {}, { defaultValue: 'Returns' })}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 4), 'text-white')}>
            {t('footer.legalHeading', {}, { defaultValue: 'Legal' })}
          </h4>
          <ul className={cm.stack(2)}>
            <li>
              <button
                type="button"
                className={cm.cn(
                  'text-foreground-tertiary hover:text-green-400 transition-colors text-sm',
                )}
                data-mol-id="footer-link-5"
                onClick={openPrivacy}
              >
                {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
              </button>
            </li>
            <li>
              <button
                type="button"
                className={cm.cn(
                  'text-foreground-tertiary hover:text-green-400 transition-colors text-sm',
                )}
                data-mol-id="footer-link-6"
                onClick={openTerms}
              >
                {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
              </button>
            </li>
          </ul>
        </div>
      </div>
      {modals}
    </footer>
  )
}

export default CheckoutPageFooter
export { CheckoutPageFooter }
