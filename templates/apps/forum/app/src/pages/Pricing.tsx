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
                'pricing.limits.categories',
                { count: formatNum(read(limits, 'maxCategories')) },
                { defaultValue: '{{count}} categories' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.moderation',
                { count: formatNum(read(limits, 'maxModeration')) },
                { defaultValue: '{{count}} moderation actions' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.threads',
                { count: formatNum(read(limits, 'maxThreads')) },
                { defaultValue: '{{count}} threads' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.votes',
                { count: formatNum(read(limits, 'maxVotes')) },
                { defaultValue: '{{count}} votes' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.limits.advancedFeatures', {}, { defaultValue: 'Advanced features:' })}{' '}
              {read(limits, 'advancedFeatures') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.limits.export', {}, { defaultValue: 'Data export:' })}{' '}
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
