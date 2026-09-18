import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { PublicFooter } from '../components/PublicFooter.js'
import { PublicTopNav } from '../components/PublicTopNav.js'

/**
 * Public pricing page — wraps the shared `PricingPage` and supplies an
 * app-specific limits renderer so the per-tier maxima for analyses,
 * datasets, and advanced features show up under each plan card. Shares
 * `PublicTopNav` + `PublicFooter` with the other public pages (Landing,
 * About, Terms, Privacy) so the marketing chrome stays consistent.
 */
export function Pricing() {
  const { t } = useTranslation()
  return (
    <ContentPageShell bare containerSize="xl" header={<PublicTopNav />} footer={<PublicFooter />}>
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
                'pricing.limits.analyses',
                { count: formatNum(read(limits, 'maxAnalysis')) },
                { defaultValue: `${formatNum(read(limits, 'maxAnalysis'))} analyses` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.datasets',
                { count: formatNum(read(limits, 'maxDatasets')) },
                { defaultValue: `${formatNum(read(limits, 'maxDatasets'))} datasets` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.limits.advanced', {}, { defaultValue: 'Advanced features' })}:{' '}
              {read(limits, 'advancedFeatures')
                ? t('common.yes', {}, { defaultValue: '✓' })
                : t('common.no', {}, { defaultValue: '—' })}
            </LimitsItem>
            <LimitsItem>
              {t('common.dataExport', {}, { defaultValue: 'Data export' })}:{' '}
              {read(limits, 'canExport')
                ? t('common.yes', {}, { defaultValue: '✓' })
                : t('common.no', {}, { defaultValue: '—' })}
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
