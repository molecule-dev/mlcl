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
          { defaultValue: `Choose your ${APP_NAME} plan` },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.exports',
                { count: formatNum(read(limits, 'maxExports')) },
                {
                  defaultValue: `${formatNum(read(limits, 'maxExports'))} exports`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.keyframes',
                { count: formatNum(read(limits, 'maxKeyframes')) },
                {
                  defaultValue: `${formatNum(read(limits, 'maxKeyframes'))} keyframes`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.projects',
                { count: formatNum(read(limits, 'maxProjects')) },
                {
                  defaultValue: `${formatNum(read(limits, 'maxProjects'))} projects`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.states',
                { count: formatNum(read(limits, 'maxStates')) },
                {
                  defaultValue: `${formatNum(read(limits, 'maxStates'))} states`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.advancedFeatures', {}, { defaultValue: 'Advanced features' })}:{' '}
              {read(limits, 'advancedFeatures')
                ? t('pricing.yes', {}, { defaultValue: '✓' })
                : t('pricing.no', {}, { defaultValue: '—' })}
            </LimitsItem>
            <LimitsItem>
              {t('common.dataExport', {}, { defaultValue: 'Data export' })}:{' '}
              {read(limits, 'canExport')
                ? t('pricing.yes', {}, { defaultValue: '✓' })
                : t('pricing.no', {}, { defaultValue: '—' })}
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
