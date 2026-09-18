import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

/**
 * Public pricing page.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  const { t } = useTranslation()
  return (
    <ContentPageShell bare containerSize="xl" footer={<Footer />}>
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
                'pricing.limit.connections',
                { count: formatNum(read(limits, 'maxConnections')) },
                { defaultValue: '{{count}} connections' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limit.maps',
                { count: formatNum(read(limits, 'maxMaps')) },
                { defaultValue: '{{count}} maps' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limit.nodes',
                { count: formatNum(read(limits, 'maxNodes')) },
                { defaultValue: '{{count}} nodes' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limit.advanced',
                { state: read(limits, 'advancedFeatures') ? '✓' : '—' },
                { defaultValue: 'Advanced features: {{state}}' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limit.export',
                { state: read(limits, 'canExport') ? '✓' : '—' },
                { defaultValue: 'Data export: {{state}}' },
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
