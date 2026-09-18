import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { t } from '@molecule/app-i18n'
import { ContentPageShell } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

/**
 * Public pricing page. Renders the tier ladder declared in the API's
 * `tiers.ts` (Free / Pro / Team) with month-or-yearly variants and a
 * Stripe-Checkout-backed upgrade CTA.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  return (
    <ContentPageShell bare containerSize="xl" footer={<Footer />}>
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-display)"
        headingDefault={t(
          'pricing.heading',
          { app: APP_NAME },
          {
            defaultValue: `Choose your ${APP_NAME} plan`,
          },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {formatNum(read(limits, 'maxCarriers'))}{' '}
              {t('pricing.carriersLabel', {}, { defaultValue: 'carriers' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxShipments'))}{' '}
              {t('pricing.shipmentsLabel', {}, { defaultValue: 'shipments' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxNotifications'))}{' '}
              {t('pricing.notificationsLabel', {}, { defaultValue: 'notifications' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxTracking'))}{' '}
              {t('pricing.trackingLabel', {}, { defaultValue: 'tracking events' })}
            </LimitsItem>
            <LimitsItem>
              {t('common.advancedFeatures', {}, { defaultValue: 'Advanced features' })}:{' '}
              {read(limits, 'advancedFeatures') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('common.dataExport', {}, { defaultValue: 'Data export' })}:{' '}
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
