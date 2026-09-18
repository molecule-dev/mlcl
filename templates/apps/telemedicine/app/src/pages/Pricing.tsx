import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

/**
 * Public pricing page.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  const { t } = useTranslation()
  return (
    <ContentPageShell bare containerSize="xl" footer={<Footer />}>
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-display)"
        headingDefault={t(
          'pricing.headingDefault',
          { appName: APP_NAME },
          { defaultValue: 'Choose your {{appName}} plan' },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.appointmentsLimit',
                { count: formatNum(read(limits, 'maxAppointments')) },
                { defaultValue: '{{count}} appointments' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.consultationsLimit',
                { count: formatNum(read(limits, 'maxConsultations')) },
                { defaultValue: '{{count}} consultations' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.prescriptionsLimit',
                { count: formatNum(read(limits, 'maxPrescriptions')) },
                { defaultValue: '{{count}} prescriptions' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.providersLimit',
                { count: formatNum(read(limits, 'maxProviders')) },
                { defaultValue: '{{count}} providers' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.recordsLimit',
                { count: formatNum(read(limits, 'maxRecords')) },
                { defaultValue: '{{count}} records' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t('common.advancedFeatures', {}, { defaultValue: 'Advanced features' })}:{' '}
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
