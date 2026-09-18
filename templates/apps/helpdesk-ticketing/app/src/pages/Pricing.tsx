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
      { defaultValue: 'Pricing — {{appName}} Support' },
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
              {formatNum(read(limits, 'maxOpenTickets'))}{' '}
              {t('pricing.openTickets', {}, { defaultValue: 'open tickets' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxAgents'))}{' '}
              {t('pricing.agents', {}, { defaultValue: 'agents' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxKbArticles'))}{' '}
              {t('pricing.kbArticles', {}, { defaultValue: 'KB articles' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxMacros'))}{' '}
              {t('pricing.macrosLabel', {}, { defaultValue: 'macros' })}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.slaTracking', {}, { defaultValue: 'SLA tracking' })}:{' '}
              {read(limits, 'slaTracking') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.automation', {}, { defaultValue: 'Automation rules' })}:{' '}
              {read(limits, 'automation') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.csat', {}, { defaultValue: 'CSAT surveys' })}:{' '}
              {read(limits, 'satisfactionSurveys') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.multiBrand', {}, { defaultValue: 'Multi-brand support' })}:{' '}
              {/* multiBrand is a numeric limit — 1 means single-brand, so only >1 counts as ✓ */}
              {Number(read(limits, 'multiBrand')) > 1 ? '✓' : '—'}
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
