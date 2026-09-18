import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'

/**
 * Public pricing page.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  const { t } = useTranslation()
  return (
    <ContentPageShell bare containerSize="xl">
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-display)"
        headingDefault={t(
          'pricing.heading',
          { app: APP_NAME },
          { defaultValue: 'Choose your {{app}} plan' },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.maxCategories',
                { count: formatNum(read(limits, 'maxCategories')) },
                { defaultValue: '{{count}} categories' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.maxDeals',
                { count: formatNum(read(limits, 'maxDeals')) },
                { defaultValue: '{{count}} deals' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.maxMerchants',
                { count: formatNum(read(limits, 'maxMerchants')) },
                { defaultValue: '{{count}} merchants' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.maxRedemptions',
                { count: formatNum(read(limits, 'maxRedemptions')) },
                { defaultValue: '{{count}} redemptions' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.advancedFeatures',
                { yes: read(limits, 'advancedFeatures') ? '✓' : '—' },
                { defaultValue: 'Advanced features: {{yes}}' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.canExport',
                { yes: read(limits, 'canExport') ? '✓' : '—' },
                { defaultValue: 'Data export: {{yes}}' },
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
