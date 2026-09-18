import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { t } from '@molecule/app-i18n'
import { ContentPageShell } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Public pricing page.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  return (
    <ContentPageShell bare containerSize="xl" header={<Header />} footer={<Footer />}>
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-display)"
        headingDefault={t(
          'pricing.heading',
          { appName: APP_NAME },
          {
            defaultValue: `Choose your ${APP_NAME} plan`,
          },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.limits.comments',
                { count: formatNum(read(limits, 'maxComments')) },
                {
                  defaultValue: `${formatNum(read(limits, 'maxComments'))} comments`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.recordings',
                { count: formatNum(read(limits, 'maxRecordings')) },
                {
                  defaultValue: `${formatNum(read(limits, 'maxRecordings'))} recordings`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.views',
                { count: formatNum(read(limits, 'maxViews')) },
                {
                  defaultValue: `${formatNum(read(limits, 'maxViews'))} views`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.limits.advanced', undefined, { defaultValue: 'Advanced features' })}
              {': '}
              {read(limits, 'advancedFeatures') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('common.dataExport', undefined, { defaultValue: 'Data export' })}
              {': '}
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
