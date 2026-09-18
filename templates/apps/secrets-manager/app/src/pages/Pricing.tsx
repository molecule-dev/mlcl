import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Public pricing page — Free / Pro / Team tier ladder backed by
 * /api/billing/tiers + /api/billing/checkout.
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
              {formatNum(read(limits, 'maxSecrets'))}{' '}
              {t('pricing.limits.secrets', {}, { defaultValue: 'secrets' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxAccessPolicies'))}{' '}
              {t('pricing.limits.accessPolicies', {}, { defaultValue: 'access policies' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxAuditLog'))}{' '}
              {t('pricing.limits.auditLog', {}, { defaultValue: 'audit-log entries' })}
            </LimitsItem>
            <LimitsItem>
              {t('common.advancedFeatures', {}, { defaultValue: 'Advanced features' })}:{' '}
              {read(limits, 'advancedFeatures') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('common.dataExport', {}, { defaultValue: 'Data export' })}:{' '}
              {read(limits, 'canExport') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {readNum(limits, 'retentionDays', 0)}{' '}
              {t('pricing.limits.retentionDays', {}, { defaultValue: 'days retention' })}
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

const readNum = (limits: unknown, key: string, fallback: number): number => {
  const v = read(limits, key) as unknown
  return typeof v === 'number' ? v : fallback
}

export default Pricing
