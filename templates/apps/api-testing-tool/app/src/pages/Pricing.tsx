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
                'pricing.maxCollections',
                { count: formatNum(read(limits, 'maxCollections')) },
                { defaultValue: '{{count}} collections' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.maxEnvironments',
                { count: formatNum(read(limits, 'maxEnvironments')) },
                { defaultValue: '{{count}} environments' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.maxHistory',
                { count: formatNum(read(limits, 'maxHistory')) },
                { defaultValue: '{{count}} history entries' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.maxRequests',
                { count: formatNum(read(limits, 'maxRequests')) },
                { defaultValue: '{{count}} requests' },
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
