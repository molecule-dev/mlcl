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
 * The limits object comes back from `/api/billing/tiers` typed as
 * `unknown` — we read fields by name so this app-side page does not
 * have to import across the api/app stack boundary at compile time.
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
        headlineFontFamily="var(--font-display)"
        headingDefault={t(
          'pricing.heading',
          { appName: APP_NAME },
          {
            defaultValue: `Choose your ${APP_NAME} plan`,
          },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.limits.articles',
                { count: formatNum(read(limits, 'maxArticles')) },
                {
                  defaultValue: '{{count}} articles',
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.bookmarks',
                { count: formatNum(read(limits, 'maxBookmarks')) },
                {
                  defaultValue: '{{count}} bookmarks',
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.categories',
                { count: formatNum(read(limits, 'maxCategories')) },
                {
                  defaultValue: '{{count}} categories',
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.sources',
                { count: formatNum(read(limits, 'maxSources')) },
                {
                  defaultValue: '{{count}} sources',
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t('common.advancedFeatures', undefined, { defaultValue: 'Advanced features' })}:{' '}
              {read(limits, 'advancedFeatures') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('common.dataExport', undefined, { defaultValue: 'Data export' })}:{' '}
              {read(limits, 'canExport') ? '✓' : '—'}
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
