import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { t } from '@molecule/app-i18n'
import { ContentPageShell } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

/**
 * Public pricing page.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  return (
    <ContentPageShell bare containerSize="xl" header={<AuthBrandHeader />} footer={<Footer />}>
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-display)"
        headingDefault={t(
          'pricing.headingDefault',
          { name: APP_NAME },
          { defaultValue: `Choose your ${APP_NAME} plan` },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.deliveryLabel',
                { count: formatNum(read(limits, 'maxDelivery')) },
                { defaultValue: `${formatNum(read(limits, 'maxDelivery'))} delivery` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.menuLabel',
                { count: formatNum(read(limits, 'maxMenu')) },
                { defaultValue: `${formatNum(read(limits, 'maxMenu'))} menu` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.ordersLabel',
                { count: formatNum(read(limits, 'maxOrders')) },
                { defaultValue: `${formatNum(read(limits, 'maxOrders'))} orders` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.restaurantsLabel',
                { count: formatNum(read(limits, 'maxRestaurants')) },
                { defaultValue: `${formatNum(read(limits, 'maxRestaurants'))} restaurants` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.advancedFeatures', {}, { defaultValue: 'Advanced features:' })}{' '}
              {read(limits, 'advancedFeatures') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.dataExport', {}, { defaultValue: 'Data export:' })}{' '}
              {read(limits, 'canExport') ? '✓' : '—'}
            </LimitsItem>
          </LimitsList>
        )}
      />
    </ContentPageShell>
  )
}

const formatNum = (n: number): string => (n >= 999_999 ? '∞' : n.toLocaleString())

const read = (limits: unknown, key: string): never => {
  if (limits != null && typeof limits === 'object' && key in (limits as Record<string, unknown>)) {
    return (limits as Record<string, unknown>)[key] as never
  }
  return 0 as never
}
