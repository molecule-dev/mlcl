import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { StorefrontTopNavBar } from '../components/StorefrontTopNavBar.js'

export function Privacy() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      header={<StorefrontTopNavBar />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
      subtitle={t(
        'privacy.intro',
        { appName: APP_NAME },
        {
          defaultValue:
            '{{appName}} collects the minimum personal information needed to process orders, deliver products, and provide customer support.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <section data-mol-id="privacy-collect" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('privacy.collectTitle', {}, { defaultValue: 'Data we collect' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'privacy.collectBody',
              {},
              {
                defaultValue:
                  'This includes contact details, shipping addresses, order history, and payment transaction metadata.',
              },
            )}
          </p>
        </section>
        <section data-mol-id="privacy-use" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('privacy.useTitle', {}, { defaultValue: 'How we use data' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'privacy.useBody',
              {},
              {
                defaultValue:
                  'Data is used for order fulfillment, fraud prevention, support operations, and to improve site performance and merchandising.',
              },
            )}
          </p>
        </section>
        <section data-mol-id="privacy-control" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('privacy.controlTitle', {}, { defaultValue: 'Your controls' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'privacy.controlBody',
              {},
              {
                defaultValue:
                  'You can update account details in Settings and contact support for data-related questions or deletion requests where applicable.',
              },
            )}
          </p>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
