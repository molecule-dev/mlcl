import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Public pricing page.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  const { t } = useTranslation()
  return (
    <ContentPageShell bare containerSize="xl" header={<Header />} footer={<Footer />}>
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
                'pricing.limits.applications',
                { count: formatNum(read(limits, 'maxApplications')) },
                { defaultValue: '{{count}} applications' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.categories',
                { count: formatNum(read(limits, 'maxCategories')) },
                { defaultValue: '{{count}} categories' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.companies',
                { count: formatNum(read(limits, 'maxCompanies')) },
                { defaultValue: '{{count}} companies' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.jobs',
                { count: formatNum(read(limits, 'maxJobs')) },
                { defaultValue: '{{count}} jobs' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.advancedFeatures',
                { value: read(limits, 'advancedFeatures') ? '✓' : '—' },
                { defaultValue: 'Advanced features: {{value}}' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.canExport',
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
