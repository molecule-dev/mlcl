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
  const yes = t('common.yes', {}, { defaultValue: '✓' })
  const no = t('common.no', {}, { defaultValue: '—' })
  return (
    <ContentPageShell bare containerSize="xl">
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-display)"
        headingDefault={t(
          'pricing.heading',
          { app: APP_NAME },
          {
            defaultValue: `Choose your ${APP_NAME} plan`,
          },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {formatNum(read(limits, 'maxHoldings'))}{' '}
              {t('pricing.holdingsLabel', {}, { defaultValue: 'holdings' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxWatchlist'))}{' '}
              {t('pricing.watchlistLabel', {}, { defaultValue: 'watchlist items' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxTransactions'))}{' '}
              {t('pricing.transactionsLabel', {}, { defaultValue: 'transactions' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxNews'))}{' '}
              {t('pricing.newsLabel', {}, { defaultValue: 'news articles' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxPerformance'))}{' '}
              {t('pricing.performanceLabel', {}, { defaultValue: 'performance reports' })}
            </LimitsItem>
            <LimitsItem>
              {t('common.advancedFeatures', {}, { defaultValue: 'Advanced features' })}:{' '}
              {read(limits, 'advancedFeatures') ? yes : no}
            </LimitsItem>
            <LimitsItem>
              {t('common.dataExport', {}, { defaultValue: 'Data export' })}:{' '}
              {read(limits, 'canExport') ? yes : no}
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
