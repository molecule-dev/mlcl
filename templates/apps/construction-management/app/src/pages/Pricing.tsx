import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'

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
  const heading = t(
    'pricing.headingTemplate',
    { appName: APP_NAME },
    { defaultValue: `Choose your ${APP_NAME} plan` },
  )

  return (
    <ContentPageShell bare containerSize="xl">
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-headline)"
        headingDefault={heading}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.projectsCount',
                { count: formatNum(read(limits, 'maxProjects')) },
                { defaultValue: '{{count}} projects' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.rfisCount',
                { count: formatNum(read(limits, 'maxRfis')) },
                { defaultValue: '{{count}} RFIs' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.punchCount',
                { count: formatNum(read(limits, 'maxPunchItems')) },
                { defaultValue: '{{count}} punch-list items' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.subsCount',
                { count: formatNum(read(limits, 'maxSubcontractors')) },
                { defaultValue: '{{count}} subcontractors' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.photoDocumentation',
                { value: read(limits, 'photoDocumentation') ? '✓' : '—' },
                { defaultValue: 'Punch-list photos: {{value}}' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.advancedReports',
                { value: read(limits, 'advancedReports') ? '✓' : '—' },
                { defaultValue: 'RFI aging + cost reports: {{value}}' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.logRetention',
                { days: formatNum(read(limits, 'dailyLogRetentionDays')) },
                { defaultValue: '{{days}}-day daily-log retention' },
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

export default Pricing
