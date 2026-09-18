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
          { appName: APP_NAME },
          {
            defaultValue: `Choose your ${APP_NAME} plan`,
          },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.limits.maxCatalog',
                { count: formatNum(read(limits, 'maxCatalog')) },
                { defaultValue: '{{count}} catalog' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.maxCertificates',
                { count: formatNum(read(limits, 'maxCertificates')) },
                { defaultValue: '{{count}} certificates' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.maxEnrollments',
                { count: formatNum(read(limits, 'maxEnrollments')) },
                { defaultValue: '{{count}} enrollments' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.maxInstructors',
                { count: formatNum(read(limits, 'maxInstructors')) },
                { defaultValue: '{{count}} instructors' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.maxLessons',
                { count: formatNum(read(limits, 'maxLessons')) },
                { defaultValue: '{{count}} lessons' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'common.countReviews',
                { count: formatNum(read(limits, 'maxReviews')) },
                { defaultValue: '{{count}} reviews' },
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
