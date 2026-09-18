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
          'pricing.headingDefault',
          { name: APP_NAME },
          { defaultValue: `Choose your ${APP_NAME} plan` },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.bookingsLabel',
                { count: formatNum(read(limits, 'maxBookings')) },
                { defaultValue: `${formatNum(read(limits, 'maxBookings'))} bookings` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.reviewsLabel',
                { count: formatNum(read(limits, 'maxReviews')) },
                { defaultValue: `${formatNum(read(limits, 'maxReviews'))} reviews` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.sessionsLabel',
                { count: formatNum(read(limits, 'maxSessions')) },
                { defaultValue: `${formatNum(read(limits, 'maxSessions'))} sessions` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.subjectsLabel',
                { count: formatNum(read(limits, 'maxSubjects')) },
                { defaultValue: `${formatNum(read(limits, 'maxSubjects'))} subjects` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.tutorsLabel',
                { count: formatNum(read(limits, 'maxTutors')) },
                { defaultValue: `${formatNum(read(limits, 'maxTutors'))} tutors` },
              )}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.advancedFeatures', {}, { defaultValue: 'Advanced features:' })}{' '}
              {read(limits, 'advancedFeatures') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.dataExport', {}, { defaultValue: 'Data export:' })}{' '}
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
