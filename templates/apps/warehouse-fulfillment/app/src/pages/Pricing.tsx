import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Public pricing page.
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
          { defaultValue: 'Choose your {{app}} plan' },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.maxOrders',
                { count: formatNum(read(limits, 'maxOrders')) },
                { defaultValue: '{{count}} orders' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.maxPacking',
                { count: formatNum(read(limits, 'maxPacking')) },
                { defaultValue: '{{count}} packing' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.maxPicks',
                { count: formatNum(read(limits, 'maxPicks')) },
                { defaultValue: '{{count}} picks' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.maxShipments',
                { count: formatNum(read(limits, 'maxShipments')) },
                { defaultValue: '{{count}} shipments' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.maxZones',
                { count: formatNum(read(limits, 'maxZones')) },
                { defaultValue: '{{count}} zones' },
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
