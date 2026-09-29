import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { StorefrontTopNavBar } from '../components/StorefrontTopNavBar.js'

/**
 * Public pricing page. Renders the tier ladder declared in the API's
 * `tiers.ts` (Free / Pro / Team) with month-or-yearly variants and a
 * Stripe-Checkout-backed upgrade CTA.
 *
 * The limits object comes back from `/api/billing/tiers` typed as
 * `unknown` here — we read fields by name so this app-side page does
 * not have to import across the api/app stack boundary at compile time.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  const { t } = useTranslation()
  return (
    <ContentPageShell bare containerSize="xl" header={<StorefrontTopNavBar />} footer={<Footer />}>
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-display)"
        headingDefault={t(
          'pricing.heading',
          { appName: APP_NAME },
          { defaultValue: `Choose your ${APP_NAME} plan` },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {formatNum(read(limits, 'maxProducts'))}{' '}
              {t('pricing.products', {}, { defaultValue: 'products' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxOrdersPerMonth'))}{' '}
              {t('pricing.ordersPerMonth', {}, { defaultValue: 'orders / month' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxSkuVariantsPerProduct'))}{' '}
              {t('pricing.variantsPerProduct', {}, { defaultValue: 'variants / product' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxStorageMb'))}{' '}
              {t('pricing.storageMb', {}, { defaultValue: 'MB image storage' })}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.customDomain', {}, { defaultValue: 'Custom domain' })}:{' '}
              {read(limits, 'customDomain') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.abandonedCartRecovery', {}, { defaultValue: 'Abandoned-cart recovery' })}:{' '}
              {read(limits, 'abandonedCartRecovery') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.advancedAnalytics', {}, { defaultValue: 'Advanced analytics' })}:{' '}
              {read(limits, 'advancedAnalytics') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'transactionFeePercent'))}{' '}
              {t('pricing.transactionFee', {}, { defaultValue: '% transaction fee' })}
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
