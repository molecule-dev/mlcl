import { useEffect } from 'react'

import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

/**
 * Public pricing page. Renders the tier ladder declared in the API's
 * `tiers.ts` (Free / Pro / Team) with month-or-yearly variants and a
 * Stripe-Checkout-backed upgrade CTA.
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
    <ContentPageShell bare containerSize="xl" header={<AuthBrandHeader />} footer={<Footer />}>
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-headline)"
        headingDefault={t(
          'pricing.heading',
          { appName: APP_NAME },
          { defaultValue: `Choose your ${APP_NAME} plan` },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.limits.episodes',
                { count: formatNum(read(limits, 'maxEpisodes')) },
                { defaultValue: '{{count}} episodes' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.shows',
                { count: formatNum(read(limits, 'maxShows')) },
                { defaultValue: '{{count}} shows' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.subscriptions',
                { count: formatNum(read(limits, 'maxSubscriptions')) },
                { defaultValue: '{{count}} subscriptions' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.advancedFeatures',
                {
                  value: read(limits, 'advancedFeatures')
                    ? t('common.yes', {}, { defaultValue: '✓' })
                    : t('common.no', {}, { defaultValue: '—' }),
                },
                { defaultValue: 'Advanced features: {{value}}' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.canExport',
                {
                  value: read(limits, 'canExport')
                    ? t('common.yes', {}, { defaultValue: '✓' })
                    : t('common.no', {}, { defaultValue: '—' }),
                },
                { defaultValue: 'Data export: {{value}}' },
              )}
            </LimitsItem>
          </LimitsList>
        )}
      />
    </ContentPageShell>
  )
}

const formatNum = (n: number): string =>
  typeof n !== 'number' ? '—' : n >= 999_999 ? '∞' : n.toLocaleString()

const read = (limits: unknown, key: string): never => {
  if (limits != null && typeof limits === 'object' && key in (limits as Record<string, unknown>)) {
    return (limits as Record<string, unknown>)[key] as never
  }
  return 0 as never
}
