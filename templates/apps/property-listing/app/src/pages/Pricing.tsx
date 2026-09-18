import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

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
    <ContentPageShell bare containerSize="xl" header={<Header />} footer={<Footer />}>
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
              {t(
                'pricing.limits.listings',
                { value: formatNum(read(limits, 'maxListings')) },
                { defaultValue: `${formatNum(read(limits, 'maxListings'))} listings` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.photos',
                { value: formatNum(read(limits, 'maxPhotosPerListing')) },
                {
                  defaultValue: `${formatNum(read(limits, 'maxPhotosPerListing'))} photos / listing`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.storage',
                { value: formatNum(read(limits, 'maxStorageMb')) },
                { defaultValue: `${formatNum(read(limits, 'maxStorageMb'))} MB storage` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.agents',
                { value: formatNum(read(limits, 'agentAccounts')) },
                { defaultValue: `${formatNum(read(limits, 'agentAccounts'))} agent accounts` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.virtualTours',
                { v: read(limits, 'virtualTours') ? '✓' : '—' },
                { defaultValue: `Virtual tours: ${read(limits, 'virtualTours') ? '✓' : '—'}` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.mortgageCalculator',
                { v: read(limits, 'mortgageCalculator') ? '✓' : '—' },
                {
                  defaultValue: `Mortgage calculator: ${read(limits, 'mortgageCalculator') ? '✓' : '—'}`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.leadCapture',
                { v: read(limits, 'leadCapture') ? '✓' : '—' },
                { defaultValue: `Lead capture: ${read(limits, 'leadCapture') ? '✓' : '—'}` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.customBranding',
                { v: read(limits, 'customBranding') ? '✓' : '—' },
                { defaultValue: `Custom branding: ${read(limits, 'customBranding') ? '✓' : '—'}` },
              )}
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
