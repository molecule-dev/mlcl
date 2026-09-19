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
          { name: APP_NAME },
          { defaultValue: `Choose your ${APP_NAME} plan` },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.limits.recipes',
                { value: formatNum(read(limits, 'maxRecipes')) },
                { defaultValue: '{{value}} personal recipes' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.planWeeks',
                { value: formatNum(read(limits, 'maxPlanWeeks')) },
                { defaultValue: '{{value}} planned weeks' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.pantry',
                { value: formatNum(read(limits, 'maxPantryItems')) },
                { defaultValue: '{{value}} pantry items' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.advanced',
                { enabled: read(limits, 'advancedFeatures') ? '✓' : '—' },
                { defaultValue: 'Advanced features: {{enabled}}' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.export',
                { enabled: read(limits, 'canExport') ? '✓' : '—' },
                { defaultValue: 'Data export: {{enabled}}' },
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
