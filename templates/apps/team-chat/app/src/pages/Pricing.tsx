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
  const yes = t('common.yes', {}, { defaultValue: '✓' })
  const no = t('common.no', {}, { defaultValue: '—' })
  return (
    <ContentPageShell bare containerSize="xl" header={<Header />} footer={<Footer />}>
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
              {formatNum(read(limits, 'maxChannels'))}{' '}
              {t('pricing.channelsLabel', {}, { defaultValue: 'channels' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxMembers'))}{' '}
              {t('pricing.membersLabel', {}, { defaultValue: 'members' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxMessagesPerDay'))}{' '}
              {t('pricing.messagesPerDayLabel', {}, { defaultValue: 'messages / day' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'fileUploadMb'))}{' '}
              {t('pricing.fileUploadMbLabel', {}, { defaultValue: 'MB / file upload' })}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.threadsEnabledLabel', {}, { defaultValue: 'Threaded replies' })}:{' '}
              {read(limits, 'threadsEnabled') ? yes : no}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.voiceVideoLabel', {}, { defaultValue: 'Voice / video calls' })}:{' '}
              {read(limits, 'voiceVideoCalls') ? yes : no}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.externalIntegrationsLabel',
                {},
                { defaultValue: 'External integrations' },
              )}
              : {read(limits, 'externalIntegrations') ? yes : no}
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

export default Pricing
