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
          { defaultValue: 'Choose your {{app}} plan' },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.blocks',
                { count: formatNum(read(limits, 'maxBlocks')) },
                { defaultValue: `${formatNum(read(limits, 'maxBlocks'))} blocks` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.databases',
                { count: formatNum(read(limits, 'maxDatabases')) },
                { defaultValue: `${formatNum(read(limits, 'maxDatabases'))} databases` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.pages',
                { count: formatNum(read(limits, 'maxPages')) },
                { defaultValue: `${formatNum(read(limits, 'maxPages'))} pages` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.templates',
                { count: formatNum(read(limits, 'maxTemplates')) },
                { defaultValue: `${formatNum(read(limits, 'maxTemplates'))} templates` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.workspaces',
                { count: formatNum(read(limits, 'maxWorkspaces')) },
                { defaultValue: `${formatNum(read(limits, 'maxWorkspaces'))} workspaces` },
              )}
            </LimitsItem>
            <LimitsItem included={Boolean(read(limits, 'advancedFeatures'))}>
              {t('pricing.advancedFeatures', {}, { defaultValue: 'Advanced features' })}
            </LimitsItem>
            <LimitsItem included={Boolean(read(limits, 'canExport'))}>
              {t('common.dataExport', {}, { defaultValue: 'Data export' })}
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
