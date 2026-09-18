import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { t } from '@molecule/app-i18n'
import { ContentPageShell } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Public pricing page.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
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
                'pricing.alerts',
                { count: formatNum(read(limits, 'maxAlerts')) },
                { defaultValue: '{{count}} alerts' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.products',
                { count: formatNum(read(limits, 'maxProducts')) },
                { defaultValue: '{{count}} products' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.stock',
                { count: formatNum(read(limits, 'maxStock')) },
                { defaultValue: '{{count}} stock records' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.transfers',
                { count: formatNum(read(limits, 'maxTransfers')) },
                { defaultValue: '{{count}} transfers' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.warehouses',
                { count: formatNum(read(limits, 'maxWarehouses')) },
                { defaultValue: '{{count}} warehouses' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.advancedFeatures',
                { value: read(limits, 'advancedFeatures') ? '✓' : '—' },
                { defaultValue: 'Advanced features: {{value}}' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.dataExport',
                { value: read(limits, 'canExport') ? '✓' : '—' },
                { defaultValue: 'Data export: {{value}}' },
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
