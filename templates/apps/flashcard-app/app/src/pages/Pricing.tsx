import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { LandingTopNavBar } from '../components/LandingTopNavBar.js'

/**
 * Public pricing page.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  const { t } = useTranslation()
  return (
    <ContentPageShell bare containerSize="xl" header={<LandingTopNavBar />} footer={<Footer />}>
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-display)"
        headingDefault={t(
          'pricing.heading',
          { app: APP_NAME },
          { defaultValue: `Choose your ${APP_NAME} plan` },
        )}
        renderLimits={(limits) => {
          const retentionDays = read(limits, 'retentionDays') as number
          return (
            <LimitsList>
              <LimitsItem>
                {formatNum(read(limits, 'maxCards'))}{' '}
                {t('pricing.limits.cards', undefined, { defaultValue: 'cards' })}
              </LimitsItem>
              <LimitsItem>
                {formatNum(read(limits, 'maxDecks'))}{' '}
                {t('pricing.limits.decks', undefined, { defaultValue: 'decks' })}
              </LimitsItem>
              <LimitsItem>
                {retentionDays > 0
                  ? t(
                      'pricing.limits.historyDays',
                      { days: retentionDays },
                      { defaultValue: '{{days}}-day review history' },
                    )
                  : t('pricing.limits.historyUnlimited', undefined, {
                      defaultValue: 'Unlimited review history',
                    })}
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
          )
        }}
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
