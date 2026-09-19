import { useEffect } from 'react'

import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import LandingFooter from '../components/LandingFooter.js'
import LandingTopNavBar from '../components/LandingTopNavBar.js'

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
  const pageTitle = t('pricing.pageTitle', {}, { defaultValue: `${APP_NAME} Pricing` })
  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])
  return (
    <ContentPageShell
      bare
      containerSize="xl"
      header={<LandingTopNavBar />}
      footer={<LandingFooter />}
    >
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-display)"
        headingDefault={`Choose your ${APP_NAME} plan`}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>{formatNum(read(limits, 'maxIssues'))} issues</LimitsItem>
            <LimitsItem>{formatNum(read(limits, 'maxSubscribers'))} subscribers</LimitsItem>
            <LimitsItem>
              Schedule future issues: {read(limits, 'canScheduleIssues') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>Paid tiers: {read(limits, 'paidTiers') ? '✓' : '—'}</LimitsItem>
            <LimitsItem>
              Advanced analytics: {read(limits, 'advancedAnalytics') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>Export subscriber list: {read(limits, 'canExport') ? '✓' : '—'}</LimitsItem>
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
