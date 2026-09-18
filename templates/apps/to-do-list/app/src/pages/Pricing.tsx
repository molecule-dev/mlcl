import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

/**
 * Public pricing page — renders plan cards from the api-entitlements
 * tier registry and routes the chosen plan into the Stripe checkout
 * flow exposed by `/billing/checkout`.
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
                'pricing.limit.labels',
                { count: formatNum(read(limits, 'maxLabels')) },
                { defaultValue: '{{count}} labels' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limit.projects',
                { count: formatNum(read(limits, 'maxProjects')) },
                { defaultValue: '{{count}} projects' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limit.tasks',
                { count: formatNum(read(limits, 'maxTasks')) },
                { defaultValue: '{{count}} tasks' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limit.advanced',
                { value: read(limits, 'advancedFeatures') ? '✓' : '—' },
                { defaultValue: 'Advanced features: {{value}}' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limit.export',
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
