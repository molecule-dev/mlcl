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
          'pricing.heading',
          { app: APP_NAME },
          { defaultValue: 'Choose your {{app}} plan' },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.limit.boards',
                { count: formatNum(read(limits, 'maxBoards')) },
                { defaultValue: `${formatNum(read(limits, 'maxBoards'))} boards` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limit.cards',
                { count: formatNum(read(limits, 'maxCards')) },
                { defaultValue: `${formatNum(read(limits, 'maxCards'))} cards` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limit.lists',
                { count: formatNum(read(limits, 'maxLists')) },
                { defaultValue: `${formatNum(read(limits, 'maxLists'))} lists` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.limit.advanced', {}, { defaultValue: 'Advanced features' })}:{' '}
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
