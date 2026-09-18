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
              {formatNum(read(limits, 'maxLeases'))}{' '}
              {t('pricing.leases', undefined, { defaultValue: 'leases' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxMaintenance'))}{' '}
              {t('pricing.maintenance', undefined, { defaultValue: 'maintenance' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxPayments'))}{' '}
              {t('pricing.payments', undefined, { defaultValue: 'payments' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxProperties'))}{' '}
              {t('pricing.properties', undefined, { defaultValue: 'properties' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxTenants'))}{' '}
              {t('pricing.tenants', undefined, { defaultValue: 'tenants' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxUnits'))}{' '}
              {t('pricing.units', undefined, { defaultValue: 'units' })}
            </LimitsItem>
            <LimitsItem>
              {t('common.advancedFeatures', undefined, { defaultValue: 'Advanced features' })}:{' '}
              {read(limits, 'advancedFeatures') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('common.dataExport', undefined, { defaultValue: 'Data export' })}:{' '}
              {read(limits, 'canExport') ? '✓' : '—'}
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
