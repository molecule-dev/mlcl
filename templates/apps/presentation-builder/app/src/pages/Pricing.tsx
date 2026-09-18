import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { t } from '@molecule/app-i18n'
import { ContentPageShell } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Public pricing page.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
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
                'pricing.limits.exports',
                { count: formatNum(read(limits, 'maxExports')) },
                {
                  defaultValue: `${formatNum(read(limits, 'maxExports'))} exports`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.presentations',
                { count: formatNum(read(limits, 'maxPresentations')) },
                {
                  defaultValue: `${formatNum(read(limits, 'maxPresentations'))} presentations`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.slides',
                { count: formatNum(read(limits, 'maxSlides')) },
                {
                  defaultValue: `${formatNum(read(limits, 'maxSlides'))} slides`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.themes',
                { count: formatNum(read(limits, 'maxThemes')) },
                {
                  defaultValue: `${formatNum(read(limits, 'maxThemes'))} themes`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.advancedFeatures',
                { value: read(limits, 'advancedFeatures') ? '✓' : '—' },
                {
                  defaultValue: `Advanced features: ${read(limits, 'advancedFeatures') ? '✓' : '—'}`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.dataExport',
                { value: read(limits, 'canExport') ? '✓' : '—' },
                {
                  defaultValue: `Data export: ${read(limits, 'canExport') ? '✓' : '—'}`,
                },
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
