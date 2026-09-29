import { ContentPageShell, LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { StorefrontTopNavBar } from '../components/StorefrontTopNavBar.js'
import { loadContent } from '../config.js'

export function Help() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-help"
      header={<StorefrontTopNavBar />}
      footer={<Footer />}
      eyebrow={t('nav.support', {}, { defaultValue: 'Support' })}
      title={t('help.title', {}, { defaultValue: 'Help' })}
      subtitle={t(
        'help.intro',
        {},
        {
          defaultValue:
            'We are here to help with orders, shipping updates, returns, and account issues.',
        },
      )}
    >
      <div className={cm.cn(cm.prose, cm.stack(5))}>
        <section className={cm.stack(2)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'))}>
            {t('help.ordersTitle', {}, { defaultValue: 'Orders and shipping' })}
          </h2>
          <p>
            {t(
              'help.ordersBody',
              {},
              {
                defaultValue:
                  'Track your order from the Orders page. Shipping estimates are shown at checkout and in order details once your purchase is confirmed.',
              },
            )}
          </p>
        </section>
        <section className={cm.stack(2)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'))}>
            {t('help.returnsTitle', {}, { defaultValue: 'Returns and refunds' })}
          </h2>
          <p>
            {t(
              'help.returnsBody',
              {},
              {
                defaultValue:
                  'If an item arrives damaged or does not match expectations, start a return request within your account order history and include photos when possible.',
              },
            )}
          </p>
        </section>
        <section className={cm.stack(2)}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'))}>
            {t('help.policyTitle', {}, { defaultValue: 'Policies' })}
          </h2>
          <div className={cm.flex({ gap: 4, align: 'center' })}>
            <LegalModalLinks
              linkClassName={cm.cn('text-primary hover:underline transition-colors')}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
              termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            />
          </div>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default Help
export { Help as HelpPage }
