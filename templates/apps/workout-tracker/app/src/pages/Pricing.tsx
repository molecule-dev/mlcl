import { PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

const formatNum = (n: number): string => (n >= 999_999 ? '∞' : n.toLocaleString())

const read = (limits: unknown, key: string): never => {
  if (limits != null && typeof limits === 'object' && key in (limits as Record<string, unknown>)) {
    return (limits as Record<string, unknown>)[key] as never
  }
  return (key.startsWith('max') ? 0 : false) as never
}

/**
 * Public pricing page. Fetches `/api/billing/tiers` and POSTs to
 * `/api/billing/checkout` when the user clicks an Upgrade button — the
 * server returns a real Stripe Checkout URL we redirect to.
 */
export function Pricing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell bare containerSize="xl" footer={<Footer />}>
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-display)"
        headingDefault={t(
          'pricing.heading',
          { name: APP_NAME },
          { defaultValue: `Choose your ${APP_NAME} plan` },
        )}
        renderLimits={(limits) => (
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <li>
              {t(
                'common.advancedFeatures',
                { count: formatNum(read(limits, 'maxWorkouts') as number) },
                {
                  defaultValue: `${formatNum(read(limits, 'maxWorkouts') as number)} workouts`,
                },
              )}
            </li>
            <li>
              {t(
                'pricing.limits.maxRoutines',
                { count: formatNum(read(limits, 'maxRoutines') as number) },
                {
                  defaultValue: `${formatNum(read(limits, 'maxRoutines') as number)} routines`,
                },
              )}
            </li>
            <li>
              {t(
                'pricing.limits.maxExercises',
                { count: formatNum(read(limits, 'maxExercises') as number) },
                {
                  defaultValue: `${formatNum(read(limits, 'maxExercises') as number)} custom exercises`,
                },
              )}
            </li>
            <li>
              {t(
                'pricing.limits.retention',
                {},
                {
                  defaultValue:
                    (read(limits, 'retentionDays') as number) === 0
                      ? 'Unlimited history'
                      : `${read(limits, 'retentionDays') as number} days history`,
                },
              )}
            </li>
            <li>
              {t('pricing.limits.advanced', {}, { defaultValue: 'Advanced features' })}:{' '}
              {(read(limits, 'advancedFeatures') as boolean) ? '✓' : '—'}
            </li>
            <li>
              {t('pricing.limits.canExport', {}, { defaultValue: 'CSV export' })}:{' '}
              {(read(limits, 'canExport') as boolean) ? '✓' : '—'}
            </li>
          </ul>
        )}
      />
    </ContentPageShell>
  )
}
