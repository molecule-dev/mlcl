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
        headlineFontFamily="var(--font-display)"
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
                'pricing.tasksCount',
                { count: formatNum(read(limits, 'maxTasks')) },
                { defaultValue: '{{count}} tasks' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.milestonesCount',
                { count: formatNum(read(limits, 'maxMilestones')) },
                { defaultValue: '{{count}} milestones' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.membersPerProject',
                { count: formatNum(read(limits, 'maxMembersPerProject')) },
                { defaultValue: '{{count}} members / project' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.realtime',
                { value: read(limits, 'realtimeCollaboration') ? '✓' : '—' },
                { defaultValue: 'Realtime collaboration: {{value}}' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.advancedReports',
                { value: read(limits, 'advancedReports') ? '✓' : '—' },
                { defaultValue: 'Burndown / velocity reports: {{value}}' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.calendarView',
                { value: read(limits, 'calendarView') ? '✓' : '—' },
                { defaultValue: 'Calendar / timeline: {{value}}' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.customFields',
                { value: read(limits, 'customFields') ? '✓' : '—' },
                { defaultValue: 'Custom fields: {{value}}' },
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
