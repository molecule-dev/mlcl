import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { AppShell } from '../components/AppShell.js'

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
  return (
    <AppShell sidebar={false}>
      <ContentPageShell bare containerSize="xl">
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
                {formatNum(read(limits, 'maxBots'))}{' '}
                {t('pricing.bots', {}, { defaultValue: 'bots' })}
              </LimitsItem>
              <LimitsItem>
                {formatNum(read(limits, 'maxAiMessagesPerMonth'))}{' '}
                {t('pricing.aiMessagesPerMonth', {}, { defaultValue: 'AI messages / month' })}
              </LimitsItem>
              <LimitsItem>
                {formatNum(read(limits, 'maxIntents'))}{' '}
                {t('pricing.intents', {}, { defaultValue: 'intents' })}
              </LimitsItem>
              <LimitsItem>
                {formatNum(read(limits, 'maxTrainingDocsMb'))}{' '}
                {t('pricing.trainingDocsMb', {}, { defaultValue: 'MB training docs' })}
              </LimitsItem>
              <LimitsItem>
                {t('pricing.sentiment', {}, { defaultValue: 'Sentiment analysis' })}:{' '}
                {read(limits, 'sentiment') ? '✓' : '—'}
              </LimitsItem>
              <LimitsItem>
                {t('pricing.multilingual', {}, { defaultValue: 'Multilingual' })}:{' '}
                {read(limits, 'multilingual') ? '✓' : '—'}
              </LimitsItem>
              <LimitsItem>
                {t('pricing.integrations', {}, { defaultValue: 'Third-party integrations' })}:{' '}
                {read(limits, 'integrations') ? '✓' : '—'}
              </LimitsItem>
              <LimitsItem>
                {t('pricing.advancedAnalytics', {}, { defaultValue: 'Advanced analytics' })}:{' '}
                {read(limits, 'advancedAnalytics') ? '✓' : '—'}
              </LimitsItem>
            </LimitsList>
          )}
        />
      </ContentPageShell>
    </AppShell>
  )
}

export default Pricing

const formatNum = (n: number): string => (n >= 999_999 ? '∞' : n.toLocaleString())

const read = (limits: unknown, key: string): never => {
  if (limits != null && typeof limits === 'object' && key in (limits as Record<string, unknown>)) {
    return (limits as Record<string, unknown>)[key] as never
  }
  return 0 as never
}
