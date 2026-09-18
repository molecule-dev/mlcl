import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { LoginFooter } from '../components/LoginFooter.js'

/**
 * Public pricing page.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  const { t } = useTranslation()
  return (
    <ContentPageShell bare containerSize="xl" header={<AuthBrandHeader />} footer={<LoginFooter />}>
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-headline)"
        headingDefault={t(
          'pricing.heading',
          { app: APP_NAME },
          { defaultValue: 'Choose your {{app}} plan' },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.monthlyRequests',
                { count: formatNum(read(limits, 'monthlyRequests')) },
                { defaultValue: '{{count}} API requests / month' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.rateLimit',
                { rate: String(read(limits, 'rateLimit') ?? '60 req/min') },
                { defaultValue: 'Rate limit: {{rate}}' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.teamSeats',
                { count: formatNum(read(limits, 'teamSeats')) },
                { defaultValue: '{{count}} team seats' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.advancedFeatures',
                { yes: read(limits, 'advancedFeatures') ? '✓' : '—' },
                { defaultValue: 'Advanced features: {{yes}}' },
              )}
            </LimitsItem>
          </LimitsList>
        )}
      />
    </ContentPageShell>
  )
}

const formatNum = (n: unknown): string => {
  const num = typeof n === 'number' ? n : 0
  return num >= 999_999 ? '∞' : num.toLocaleString()
}

const read = (limits: unknown, key: string): unknown => {
  if (limits != null && typeof limits === 'object' && key in (limits as Record<string, unknown>)) {
    return (limits as Record<string, unknown>)[key]
  }
  return null
}
