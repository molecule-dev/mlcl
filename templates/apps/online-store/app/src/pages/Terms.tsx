import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { StorefrontTopNavBar } from '../components/StorefrontTopNavBar.js'

export function Terms() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<StorefrontTopNavBar />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('nav.terms', {}, { defaultValue: 'Terms' })}
      subtitle={t(
        'terms.intro',
        { appName: APP_NAME },
        {
          defaultValue:
            'By shopping with {{appName}}, you agree to these terms covering orders, account usage, and acceptable platform behavior.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <section data-mol-id="terms-orders" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('terms.ordersTitle', {}, { defaultValue: 'Orders and payment' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'terms.ordersBody',
              {},
              {
                defaultValue:
                  'Orders are confirmed after successful payment authorization. Pricing, taxes, and shipping costs are shown at checkout before you place your order.',
              },
            )}
          </p>
        </section>
        <section data-mol-id="terms-returns" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('terms.returnsTitle', {}, { defaultValue: 'Returns and cancellations' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'terms.returnsBody',
              {},
              {
                defaultValue:
                  'Eligibility for cancellation or return depends on product type and fulfillment state. Digital goods may be non-refundable once delivered.',
              },
            )}
          </p>
        </section>
        <section data-mol-id="terms-account" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('terms.accountTitle', {}, { defaultValue: 'Account use' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'terms.accountBody',
              {},
              {
                defaultValue:
                  'Keep your credentials secure and provide accurate account information to ensure orders and support requests are processed correctly.',
              },
            )}
          </p>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
