import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Public pricing page. Limits + headings are rendered through `t()` so
 * they participate in the regular i18n pipeline.
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
          { defaultValue: `Choose your ${APP_NAME} plan` },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.maxArtifacts',
                { count: formatNum(read(limits, 'maxArtifacts')) },
                { defaultValue: '{{count}} artifacts' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.maxBuilds',
                { count: formatNum(read(limits, 'maxBuilds')) },
                { defaultValue: '{{count}} builds' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.maxPipelines',
                { count: formatNum(read(limits, 'maxPipelines')) },
                { defaultValue: '{{count}} pipelines' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.advancedFeatures',
                { mark: read(limits, 'advancedFeatures') ? '✓' : '—' },
                { defaultValue: 'Advanced features: {{mark}}' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.canExport',
                { mark: read(limits, 'canExport') ? '✓' : '—' },
                { defaultValue: 'Data export: {{mark}}' },
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
