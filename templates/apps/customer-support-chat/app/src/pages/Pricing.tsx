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
          { appName: APP_NAME },
          { defaultValue: `Choose your ${APP_NAME} plan` },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.limits.agents',
                { count: read(limits, 'maxAgents') },
                {
                  defaultValue: `${formatNum(read(limits, 'maxAgents'))} agents`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.cannedResponses',
                { count: read(limits, 'maxCannedResponses') },
                {
                  defaultValue: `${formatNum(read(limits, 'maxCannedResponses'))} canned-responses`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.conversations',
                { count: read(limits, 'maxConversations') },
                {
                  defaultValue: `${formatNum(read(limits, 'maxConversations'))} conversations`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.messages',
                { count: read(limits, 'maxMessages') },
                {
                  defaultValue: `${formatNum(read(limits, 'maxMessages'))} messages`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.limits.advancedFeatures', {}, { defaultValue: 'Advanced features' })}:{' '}
              {read(limits, 'advancedFeatures')
                ? t('pricing.limits.yes', {}, { defaultValue: '✓' })
                : t('pricing.limits.no', {}, { defaultValue: '—' })}
            </LimitsItem>
            <LimitsItem>
              {t('common.dataExport', {}, { defaultValue: 'Data export' })}:{' '}
              {read(limits, 'canExport')
                ? t('pricing.limits.yes', {}, { defaultValue: '✓' })
                : t('pricing.limits.no', {}, { defaultValue: '—' })}
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
