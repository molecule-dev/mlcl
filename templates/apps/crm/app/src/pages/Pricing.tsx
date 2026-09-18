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
          { app: APP_NAME },
          { defaultValue: `Choose your ${APP_NAME} plan` },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.limitContacts',
                { n: formatNum(read(limits, 'maxContacts')) },
                { defaultValue: '{{n}} contacts' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limitDeals',
                { n: formatNum(read(limits, 'maxDeals')) },
                { defaultValue: '{{n}} open deals' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limitPipelines',
                { n: formatNum(read(limits, 'maxPipelines')) },
                { defaultValue: '{{n}} pipelines' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limitCompanies',
                { n: formatNum(read(limits, 'maxCompanies')) },
                { defaultValue: '{{n}} companies' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limitAnalytics',
                { mark: read(limits, 'advancedAnalytics') ? '✓' : '—' },
                { defaultValue: 'Advanced analytics: {{mark}}' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limitExport',
                { mark: read(limits, 'dataExport') ? '✓' : '—' },
                { defaultValue: 'Data export: {{mark}}' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limitCustomFields',
                { mark: read(limits, 'customFields') ? '✓' : '—' },
                { defaultValue: 'Custom fields: {{mark}}' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limitIntegrations',
                { mark: read(limits, 'integrations') ? '✓' : '—' },
                { defaultValue: 'Third-party integrations: {{mark}}' },
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
