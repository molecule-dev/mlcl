import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { PublicHeader } from '../components/PublicHeader.js'

/**
 * Public pricing page.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  const { t } = useTranslation()
  return (
    <ContentPageShell bare containerSize="xl" header={<PublicHeader />} footer={<Footer />}>
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
                'pricing.limits.accounts',
                { count: formatNum(read(limits, 'maxAccounts')) },
                { defaultValue: '{{count}} accounts' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.cards',
                { count: formatNum(read(limits, 'maxCards')) },
                { defaultValue: '{{count}} cards' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.statements',
                { count: formatNum(read(limits, 'maxStatements')) },
                { defaultValue: '{{count}} statements' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.transactions',
                { count: formatNum(read(limits, 'maxTransactions')) },
                { defaultValue: '{{count}} transactions' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.transfers',
                { count: formatNum(read(limits, 'maxTransfers')) },
                { defaultValue: '{{count}} transfers' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t('common.advancedFeatures', {}, { defaultValue: 'Advanced features' })}:{' '}
              {read(limits, 'advancedFeatures') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('common.dataExport', {}, { defaultValue: 'Data export' })}:{' '}
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
