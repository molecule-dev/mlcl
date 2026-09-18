import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

/**
 * Public pricing page.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  const { t } = useTranslation()
  return (
    <ContentPageShell bare containerSize="xl" header={<AuthBrandHeader />} footer={<Footer />}>
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-headline)"
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
                'pricing.limits.maxAdherence',
                { count: read(limits, 'maxAdherence') },
                {
                  defaultValue: '{{count}} adherence',
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.maxDoses',
                { count: read(limits, 'maxDoses') },
                {
                  defaultValue: '{{count}} doses',
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.maxMedications',
                { count: read(limits, 'maxMedications') },
                {
                  defaultValue: '{{count}} medications',
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.maxRefills',
                { count: read(limits, 'maxRefills') },
                {
                  defaultValue: '{{count}} refills',
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.maxSchedules',
                { count: read(limits, 'maxSchedules') },
                {
                  defaultValue: '{{count}} schedules',
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.limits.advancedFeatures', {}, { defaultValue: 'Advanced features:' })}{' '}
              {read(limits, 'advancedFeatures')
                ? t('pricing.yes', {}, { defaultValue: '✓' })
                : t('pricing.no', {}, { defaultValue: '—' })}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.limits.canExport', {}, { defaultValue: 'Data export:' })}{' '}
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

const read = (limits: unknown, key: string): never => {
  if (limits != null && typeof limits === 'object' && key in (limits as Record<string, unknown>)) {
    const value = (limits as Record<string, unknown>)[key]
    if (typeof value === 'number' && value >= 999_999) {
      return '∞' as never
    }
    return value as never
  }
  return 0 as never
}
