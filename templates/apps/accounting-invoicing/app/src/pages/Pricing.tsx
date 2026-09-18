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
                'pricing.maxAccounts',
                { count: formatNum(read(limits, 'maxAccounts')) },
                { defaultValue: '{{count}} accounts' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.maxExpenses',
                { count: formatNum(read(limits, 'maxExpenses')) },
                { defaultValue: '{{count}} expenses' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.maxInvoices',
                { count: formatNum(read(limits, 'maxInvoices')) },
                { defaultValue: '{{count}} invoices' },
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
