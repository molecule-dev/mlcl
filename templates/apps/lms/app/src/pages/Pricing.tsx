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
              {formatNum(read(limits, 'maxCourses'))}{' '}
              {t('pricing.limits.courses', {}, { defaultValue: 'courses' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxStudents'))}{' '}
              {t('pricing.limits.students', {}, { defaultValue: 'students' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxModulesPerCourse'))}{' '}
              {t('pricing.limits.modulesPerCourse', {}, { defaultValue: 'modules / course' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(read(limits, 'maxStorageMb'))}{' '}
              {t('pricing.limits.materialStorage', {}, { defaultValue: 'MB material storage' })}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.limits.liveClasses', {}, { defaultValue: 'Live classes' })}:{' '}
              {read(limits, 'liveClasses') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.limits.certificates', {}, { defaultValue: 'Completion certificates' })}:{' '}
              {read(limits, 'certificates') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.limits.customBranding', {}, { defaultValue: 'Custom branding' })}:{' '}
              {read(limits, 'customBranding') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.limits.ssoLogin', {}, { defaultValue: 'SSO login' })}:{' '}
              {read(limits, 'ssoLogin') ? '✓' : '—'}
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
