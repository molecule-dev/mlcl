import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'

/**
 * Public pricing page.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  const { t } = useTranslation()
  return (
    <ContentPageShell bare containerSize="xl">
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-display)"
        headingDefault={t(
          'pricing.chooseHeading',
          { appName: APP_NAME },
          { defaultValue: `Choose your ${APP_NAME} plan` },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.contracts',
                { count: formatNum(read(limits, 'maxContracts')) },
                { defaultValue: `${formatNum(read(limits, 'maxContracts'))} contracts` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.signatures',
                { count: formatNum(read(limits, 'maxSignatures')) },
                { defaultValue: `${formatNum(read(limits, 'maxSignatures'))} signatures` },
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
              {t('pricing.advancedFeatures', {}, { defaultValue: 'Advanced features' })}
              {`: ${
                read(limits, 'advancedFeatures')
                  ? t('pricing.enabled', {}, { defaultValue: 'Yes' })
                  : t('pricing.disabled', {}, { defaultValue: 'No' })
              }`}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.dataExport', {}, { defaultValue: 'Data export' })}
              {`: ${
                read(limits, 'canExport')
                  ? t('pricing.enabled', {}, { defaultValue: 'Yes' })
                  : t('pricing.disabled', {}, { defaultValue: 'No' })
              }`}
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
