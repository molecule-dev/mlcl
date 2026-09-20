import { useEffect } from 'react'

import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Public pricing page. Renders the tier ladder declared in the API's
 * `tiers.ts` (Free / Pro / Team) with month-or-yearly variants and a
 * Stripe-Checkout-backed upgrade CTA.
 *
 * The limits object comes back from `/api/billing/tiers` typed as
 * `unknown` here — we read fields by name so this app-side page does
 * not have to import across the api/app stack boundary at compile time.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  const { t } = useTranslation()
  useEffect(() => {
    document.title = t(
      'pricing.pageTitle',
      { appName: APP_NAME },
      { defaultValue: 'Pricing — {{appName}}' },
    )
  }, [t])
  return (
    <ContentPageShell bare containerSize="xl" header={<Header />} footer={<Footer />}>
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-display)"
        headingKey="pricing.heading"
        headingDefault={`Choose your ${APP_NAME} plan`}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {formatNum(read(limits, 'maxOpenIssues'))}{' '}
              {t('pricing.openIssues', {}, { defaultValue: 'open reports' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxWatchAreas'))}{' '}
              {t('pricing.watchAreas', {}, { defaultValue: 'watch areas' })}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.photoAttachments', {}, { defaultValue: 'Photo attachments' })}:{' '}
              {read(limits, 'photoAttachments') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.duplicateDetection', {}, { defaultValue: 'Duplicate detection' })}:{' '}
              {read(limits, 'duplicateDetection') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.watchAreaAlerts', {}, { defaultValue: 'Watch-area alerts' })}:{' '}
              {read(limits, 'watchAreaAlerts') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.exportHistory', {}, { defaultValue: 'Report-history export' })}:{' '}
              {read(limits, 'exportHistory') ? '✓' : '—'}
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
