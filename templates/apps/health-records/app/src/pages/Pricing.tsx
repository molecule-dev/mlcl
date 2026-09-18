import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { t } from '@molecule/app-i18n'
import { ContentPageShell } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

/**
 * Public pricing page.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  return (
    <ContentPageShell bare containerSize="xl" header={<AuthBrandHeader />} footer={<Footer />}>
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
              {formatNum(read(limits, 'maxAllergies'))}{' '}
              {t('pricing.allergies', undefined, { defaultValue: 'allergies' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxConditions'))}{' '}
              {t('pricing.conditions', undefined, { defaultValue: 'conditions' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxDocuments'))}{' '}
              {t('pricing.documents', undefined, { defaultValue: 'documents' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxImmunizations'))}{' '}
              {t('pricing.immunizations', undefined, { defaultValue: 'immunizations' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxLabs'))}{' '}
              {t('pricing.labs', undefined, { defaultValue: 'labs' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxMedications'))}{' '}
              {t('pricing.medications', undefined, { defaultValue: 'medications' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxVitals'))}{' '}
              {t('pricing.vitals', undefined, { defaultValue: 'vitals' })}
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
